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
  client?: { customer_name: string; client_code: string } | null;
  images?: ProductImageRow[];
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
        client:clients(customer_name, client_code),
        images:product_images(*)
      `,
      )
      .order("created_at", { ascending: false })
      .order("sort_order", {
        referencedTable: "product_images",
        ascending: true,
      })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.neq("status", "retired");
    }

    if (search) {
      query = query.or(
        `nomor_seri.ilike.%${search}%,nama_produk.ilike.%${search}%,product_code.ilike.%${search}%`,
      );
    }

    if (branch_id) query = query.eq("current_branch_id", branch_id);
    if (client_id) query = query.eq("current_client_id", client_id);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch products: ${error.message}`);
    return (data ?? []) as ProductWithRelations[];
  },

  /**
   * Fetch single product by product_id (UUID), including images.
   */
  async getProductById(
    product_id: string,
  ): Promise<ProductWithRelations | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(customer_name, client_code),
        images:product_images(*)
      `,
      )
      .eq("product_id", product_id)
      .order("sort_order", {
        referencedTable: "product_images",
        ascending: true,
      })
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
    return (data as unknown as ProductWithRelations) ?? null;
  },

  /**
   * Fetch single product by nomor_seri (for QR compatibility).
   */
  async getProductBySerial(
    nomor_seri: string,
  ): Promise<ProductWithRelations | null> {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(customer_name, client_code),
        images:product_images(*)
      `,
      )
      .eq("nomor_seri", nomor_seri)
      .order("sort_order", {
        referencedTable: "product_images",
        ascending: true,
      })
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
    return (data as unknown as ProductWithRelations) ?? null;
  },

  /**
   * Count total products (excluding retired).
   */
  async getProductCount(status?: ProductRow["status"]): Promise<number> {
    let query = supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.neq("status", "retired");
    }

    const { count, error } = await query;

    if (error) throw new Error(`Failed to count products: ${error.message}`);
    return count ?? 0;
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
   * nomor_seri is immutable — excluded from update type.
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
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        branch:branches(branch_name, branch_code),
        client:clients(customer_name, client_code),
        images:product_images(*)
      `,
      )
      .neq("status", "retired")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(`Failed to fetch recent products: ${error.message}`);
    return (data ?? []) as ProductWithRelations[];
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
      .eq("id", imageId);

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
        supabase.from("product_images").update({ sort_order }).eq("id", id),
      ),
    );
  },
};
