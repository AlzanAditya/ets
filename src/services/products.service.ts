import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import type {
  ProductRow,
  ProductInsert,
  ProductUpdate,
  ProductImageRow,
  ProductImageInsert,
} from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetProductsParams {
  search?: string;
  status?: ProductRow["status"];
  branch_id?: string;
  client_id?: string;
  limit?: number;
  offset?: number;
}

export interface ProductWithRelations extends ProductRow {
  branch?: { branch_name: string; branch_code: string } | null;
  client?: { client_name: string; client_code: string } | null;
  images?: ProductImageRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely fetch and attach product_images to a list of product objects.
 * Uses a direct .in('product_id', ids) query to bypass PostgREST relationship requirements.
 */
async function attachProductImages(products: ProductWithRelations[]): Promise<ProductWithRelations[]> {
  if (!products || products.length === 0) return [];
  const productIds = products.map((p) => p.product_id).filter(Boolean);
  if (productIds.length === 0) return products;

  try {
    const { data: images } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (images && images.length > 0) {
      const imgMap: Record<string, ProductImageRow[]> = {};
      images.forEach((img: any) => {
        if (!imgMap[img.product_id]) imgMap[img.product_id] = [];
        imgMap[img.product_id].push(img);
      });

      return products.map((p) => ({
        ...p,
        images: imgMap[p.product_id] ?? p.images ?? [],
      }));
    }
  } catch (err) {
    console.warn("Could not fetch product_images separately:", err);
  }

  return products.map((p) => ({ ...p, images: p.images ?? [] }));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productsService = {
  /**
   * Fetch paginated list of products with branch, client, and image relations.
   * Excludes retired by default unless status is explicitly passed.
   */
  async getProducts(
    params: GetProductsParams = {},
  ): Promise<ProductWithRelations[]> {
    const {
      search,
      status,
      branch_id,
      client_id,
      limit = 50,
      offset = 0,
    } = params;

    let query = supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(client_name, client_code)
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      if (status === "warranty" || (status as string) === "garansi") {
        query = query.or("status.eq.warranty,status.eq.garansi");
      } else {
        query = query.eq("status", status);
      }
    }

    if (search) {
      query = query.or(
        `serial_number.ilike.%${search}%,product_name.ilike.%${search}%,product_code.ilike.%${search}%`,
      );
    }

    if (branch_id) query = query.eq("current_branch_id", branch_id);
    if (client_id) query = query.eq("current_client_id", client_id);

    let data: any[] | null = null;
    const res = await query;

    if (res.error) {
      let fallbackQuery = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        if (status === "warranty" || (status as string) === "garansi") {
          fallbackQuery = fallbackQuery.or("status.eq.warranty,status.eq.garansi");
        } else {
          fallbackQuery = fallbackQuery.eq("status", status);
        }
      }
      if (search) {
        fallbackQuery = fallbackQuery.or(
          `serial_number.ilike.%${search}%,product_name.ilike.%${search}%,product_code.ilike.%${search}%`,
        );
      }
      if (branch_id) fallbackQuery = fallbackQuery.eq("current_branch_id", branch_id);
      if (client_id) fallbackQuery = fallbackQuery.eq("current_client_id", client_id);

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        throw new Error(`Failed to fetch products: ${fallbackRes.error.message}`);
      }
      data = fallbackRes.data;
    } else {
      data = res.data;
    }

    const products = (data ?? []) as ProductWithRelations[];
    return attachProductImages(products);
  },

  /**
   * Fetch single product by product_id (UUID), including images.
   */
  async getProductById(
    product_id: string,
  ): Promise<ProductWithRelations | null> {
    let data: any = null;
    const res = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(client_name, client_code)
      `,
      )
      .eq("product_id", product_id)
      .single();

    if (res.error && res.error.code !== "PGRST116") {
      // Fallback simple query
      const fallback = await supabase
        .from("products")
        .select("*")
        .eq("product_id", product_id)
        .single();

      if (fallback.error && fallback.error.code !== "PGRST116") {
        throw new Error(`Failed to fetch product: ${fallback.error.message}`);
      }
      data = fallback.data;
    } else {
      data = res.data;
    }

    if (!data) return null;
    const [withImages] = await attachProductImages([data as unknown as ProductWithRelations]);
    return withImages ?? null;
  },

  /**
   * Fetch single product by serial_number (for QR compatibility).
   */
  async getProductBySerial(
    serial_number: string,
  ): Promise<ProductWithRelations | null> {
    let data: any = null;
    const res = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(client_name, client_code)
      `,
      )
      .eq("serial_number", serial_number)
      .single();

    if (res.error && res.error.code !== "PGRST116") {
      const fallback = await supabase
        .from("products")
        .select("*")
        .eq("serial_number", serial_number)
        .single();

      if (fallback.error && fallback.error.code !== "PGRST116") {
        throw new Error(`Failed to fetch product: ${fallback.error.message}`);
      }
      data = fallback.data;
    } else {
      data = res.data;
    }

    if (!data) return null;
    const [withImages] = await attachProductImages([data as unknown as ProductWithRelations]);
    return withImages ?? null;
  },

  /**
   * Count total products by status (warranty vs maintenance).
   */
  async getProductCount(status?: ProductRow["status"]): Promise<number> {
    let query = supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (status) {
      if (status === "warranty" || (status as string) === "garansi") {
        query = query.or("status.eq.warranty,status.eq.garansi");
      } else {
        query = query.eq("status", status);
      }
    }

    const { count, error } = await query;

    if (error) throw new Error(`Failed to count products: ${error.message}`);
    return count ?? 0;
  },

  /**
   * Get breakdown counts for warranty, maintenance, and total.
   */
  async getProductStatusSummary(): Promise<{ warranty: number; maintenance: number; total: number }> {
    const [warrantyRes, maintenanceRes, totalRes] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).or("status.eq.warranty,status.eq.garansi"),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "maintenance"),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

    if (warrantyRes.error) console.error("Error fetching warranty count:", warrantyRes.error);
    if (maintenanceRes.error) console.error("Error fetching maintenance count:", maintenanceRes.error);
    if (totalRes.error) console.error("Error fetching total product count:", totalRes.error);

    return {
      warranty: warrantyRes.count ?? 0,
      maintenance: maintenanceRes.count ?? 0,
      total: totalRes.count ?? 0,
    };
  },

  /**
   * Create a new product.
   */
  async createProduct(data: ProductInsert): Promise<ProductRow> {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        ...data,
        product_id: data.product_id ?? safeUUID(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create product: ${error.message}`);
    if (!created) throw new Error("Product creation returned no data");
    return created;
  },

  /**
   * Update an existing product by product_id.
   * serial_number is immutable — excluded from update type.
   */
  async updateProduct(
    product_id: string,
    data: ProductUpdate,
  ): Promise<ProductRow> {
    const { data: updated, error } = await supabase
      .from("products")
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq("product_id", product_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product: ${error.message}`);
    if (!updated) throw new Error("Product update returned no data");
    return updated;
  },

  /**
   * Soft delete a product by setting status = 'retired'.
   * Hard delete is not supported.
   */
  async retireProduct(product_id: string): Promise<void> {
    const { error } = await supabase
      .from("products")
      .update({
        status: "retired",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("product_id", product_id);

    if (error) throw new Error(`Failed to retire product: ${error.message}`);
  },

  /**
   * Fetch recently added products (for dashboard table).
   */
  async getRecentProducts(limit = 10): Promise<ProductWithRelations[]> {
    let data: any[] | null = null;
    const res = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(client_name, client_code)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (res.error) {
      const fallback = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fallback.error) {
        throw new Error(`Failed to fetch recent products: ${fallback.error.message}`);
      }
      data = fallback.data;
    } else {
      data = res.data;
    }

    const products = (data ?? []) as ProductWithRelations[];
    return attachProductImages(products);
  },

  // ─── Image Management ────────────────────────────────────────────────────────

  /**
   * Insert a product_images record linking a storage path to a product.
   */
  async addProductImage(record: ProductImageInsert): Promise<ProductImageRow> {
    const { data, error } = await supabase
      .from("product_images")
      .insert(record)
      .select()
      .single();

    if (error) throw new Error(`Failed to add product image: ${error.message}`);
    if (!data) throw new Error("Product image insert returned no data");
    return data;
  },

  /**
   * Insert multiple product_images records in a single batch.
   */
  async addProductImages(
    records: ProductImageInsert[],
  ): Promise<ProductImageRow[]> {
    if (records.length === 0) return [];

    const { data, error } = await supabase
      .from("product_images")
      .insert(records)
      .select();

    if (error)
      throw new Error(`Failed to add product images: ${error.message}`);
    return data ?? [];
  },

  /**
   * Delete a product_images record by its id.
   * Note: This does NOT delete the storage file — call image-service deleteFiles() separately.
   */
  async deleteProductImage(imageId: string): Promise<void> {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("image_id", imageId);

    if (error)
      throw new Error(
        `Failed to delete product image record: ${error.message}`,
      );
  },

  /**
   * Update sort_order for a batch of image records.
   * Used after drag-and-drop reordering in the gallery.
   */
  async updateImageSortOrder(
    updates: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    await Promise.all(
      updates.map(({ id, sort_order }) =>
        supabase.from("product_images").update({ sort_order }).eq("image_id", id),
      ),
    );
  },
};
