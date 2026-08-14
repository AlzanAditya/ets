import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { deleteImageFiles, PRODUCT_ASSETS_BUCKET } from "@/lib/image-service";
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
  client?: { client_id?: string; client_name: string; client_code: string; address?: string | null } | null;
  images?: ProductImageRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensures client and branch relations are populated if IDs exist on the product.
 * Fetches directly from Supabase tables if joined fields are unpopulated or missing.
 */
async function enrichProductRelations(product: ProductWithRelations): Promise<ProductWithRelations> {
  if (!product) return product;

  // 1. Enrich Client
  const clientId = product.current_client_id || (product as any).client_id;
  if (clientId) {
    if (!product.client || !product.client.client_name) {
      const { data: clientData, error: clientErr } = await supabase
        .from("clients")
        .select("client_id, client_name, client_code, address")
        .or(`client_id.eq.${clientId},id.eq.${clientId}`)
        .maybeSingle();

      if (clientErr) {
        console.error("[Supabase Error] Table: clients | Action: SELECT | Details:", clientErr.message, clientErr);
      } else if (clientData) {
        product.client = clientData;
      }
    }
  } else {
    product.client = null;
  }

  // 2. Enrich Branch
  const branchId = product.current_branch_id || (product as any).branch_id;
  if (branchId && (!product.branch || !product.branch.branch_name)) {
    const { data: branchData, error: branchErr } = await supabase
      .from("branches")
      .select("branch_name, branch_code")
      .or(`branch_id.eq.${branchId},id.eq.${branchId}`)
      .maybeSingle();

    if (branchErr) {
      console.error("[Supabase Error] Table: branches | Action: SELECT | Details:", branchErr.message, branchErr);
    } else if (branchData) {
      product.branch = branchData;
    }
  }

  return product;
}

/**
 * Safely fetch and attach product_images to a list of product objects.
 * Connects product_images via product_events -> product_event_steps (step_id).
 */
async function attachProductImages(products: ProductWithRelations[]): Promise<ProductWithRelations[]> {
  if (!products || products.length === 0) return [];
  const productIds = products.map((p) => p.product_id).filter(Boolean);
  if (productIds.length === 0) return products;

  try {
    const imgMap: Record<string, ProductImageRow[]> = {};

    // Fetch event step images for these products via step_id relation
    const { data: events, error: evtErr } = await supabase
      .from("product_events")
      .select("product_id, product_event_steps(step_id)")
      .in("product_id", productIds);

    if (evtErr) {
      console.error("[Supabase Error] Table: product_events | Action: SELECT (steps) | Details:", evtErr.message, evtErr);
    }

    if (!evtErr && events && events.length > 0) {
      const stepToProductMap: Record<string, string> = {};
      const stepIds: string[] = [];

      events.forEach((evt: any) => {
        const pid = evt.product_id;
        const steps = evt.product_event_steps || (evt as any).steps || [];
        steps.forEach((st: any) => {
          if (st.step_id) {
            stepToProductMap[st.step_id] = pid;
            stepIds.push(st.step_id);
          }
        });
      });

      if (stepIds.length > 0) {
        const { data: stepImages, error: stepImgErr } = await supabase
          .from("product_images")
          .select("*")
          .in("step_id", stepIds)
          .order("sort_order", { ascending: true });

        if (stepImgErr) {
          console.error("[Supabase Error] Table: product_images | Action: SELECT | Details:", stepImgErr.message, stepImgErr);
        }

        if (!stepImgErr && stepImages && stepImages.length > 0) {
          stepImages.forEach((img: any) => {
            const pid = stepToProductMap[img.step_id];
            if (pid) {
              if (!imgMap[pid]) imgMap[pid] = [];
              const exists = imgMap[pid].some(
                (e) => (e.image_id && e.image_id === img.image_id) || (e.storage_path && e.storage_path === img.storage_path)
              );
              if (!exists) {
                imgMap[pid].push(img);
              }
            }
          });
        }
      }
    }

    return products.map((p) => ({
      ...p,
      images: imgMap[p.product_id] ?? p.images ?? [],
    }));
  } catch (err) {
    console.error("[Supabase Error] Action: attachProductImages | Details:", err);
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
        client:clients(client_id, client_name, client_code, address)
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
    const enrichedProducts = await Promise.all(products.map((p) => enrichProductRelations(p)));
    return attachProductImages(enrichedProducts);
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
        client:clients(client_id, client_name, client_code, address)
      `,
      )
      .eq("product_id", product_id)
      .single();

    if (res.error) {
      if (res.error.code !== "PGRST116") {
        console.error("[Supabase Error] Table: products | Action: SELECT (getProductById) | Message:", res.error.message, res.error);
        const fallback = await supabase
          .from("products")
          .select("*")
          .eq("product_id", product_id)
          .single();

        if (fallback.error && fallback.error.code !== "PGRST116") {
          console.error("[Supabase Error] Table: products | Action: SELECT (fallback getProductById) | Message:", fallback.error.message, fallback.error);
          throw new Error(`Failed to fetch product: ${fallback.error.message}`);
        }
        data = fallback.data;
      }
    } else {
      data = res.data;
    }

    if (!data) return null;
    let prod = data as unknown as ProductWithRelations;
    prod = await enrichProductRelations(prod);
    const [withImages] = await attachProductImages([prod]);
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
        client:clients(client_id, client_name, client_code, address)
      `,
      )
      .eq("serial_number", serial_number)
      .single();

    if (res.error) {
      if (res.error.code !== "PGRST116") {
        console.error("[Supabase Error] Table: products | Action: SELECT (getProductBySerial) | Message:", res.error.message, res.error);
        const fallback = await supabase
          .from("products")
          .select("*")
          .eq("serial_number", serial_number)
          .single();

        if (fallback.error && fallback.error.code !== "PGRST116") {
          console.error("[Supabase Error] Table: products | Action: SELECT (fallback getProductBySerial) | Message:", fallback.error.message, fallback.error);
          throw new Error(`Failed to fetch product: ${fallback.error.message}`);
        }
        data = fallback.data;
      }
    } else {
      data = res.data;
    }

    if (!data) return null;
    let prod = data as unknown as ProductWithRelations;
    prod = await enrichProductRelations(prod);
    const [withImages] = await attachProductImages([prod]);
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
        client:clients(client_id, client_name, client_code, address)
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
   * Insert a product_images record linking a storage path to a product step.
   */
  async addProductImage(record: ProductImageInsert): Promise<ProductImageRow> {
    let stepId = record.step_id;
    if (!stepId && record.product_id) {
      stepId = await resolveStepIdForProduct(record.product_id);
    }

    if (!stepId) {
      throw new Error("Cannot insert product_images record without step_id");
    }

    const payload = {
      image_id: record.image_id || safeUUID(),
      step_id: stepId,
      storage_path: record.storage_path,
      thumbnail_path: record.thumbnail_path ?? null,
      file_name: record.file_name ?? null,
      file_size: record.file_size ?? null,
      mime_type: record.mime_type ?? "image/webp",
      sort_order: record.sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from("product_images")
      .insert(payload)
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

    const processedRecords = [];
    for (const record of records) {
      let stepId = record.step_id;
      if (!stepId && record.product_id) {
        stepId = await resolveStepIdForProduct(record.product_id);
      }
      if (!stepId) {
        throw new Error("Cannot insert product_images record without step_id");
      }

      processedRecords.push({
        image_id: record.image_id || safeUUID(),
        step_id: stepId,
        storage_path: record.storage_path,
        thumbnail_path: record.thumbnail_path ?? null,
        file_name: record.file_name ?? null,
        file_size: record.file_size ?? null,
        mime_type: record.mime_type ?? "image/webp",
        sort_order: record.sort_order ?? 0,
      });
    }

    const { data, error } = await supabase
      .from("product_images")
      .insert(processedRecords)
      .select();

    if (error)
      throw new Error(`Failed to add product images: ${error.message}`);
    return data ?? [];
  },

  /**
   * Delete a product_images record and remove associated files from storage.
   */
  async deleteProductImage(
    imageId: string,
    storagePath?: string,
    thumbnailPath?: string
  ): Promise<void> {
    let fullPath = storagePath;
    let thumbPath = thumbnailPath;

    if (!fullPath || !thumbPath) {
      try {
        const { data: imgRow } = await supabase
          .from("product_images")
          .select("storage_path, thumbnail_path")
          .eq("image_id", imageId)
          .maybeSingle();

        if (imgRow) {
          if (!fullPath && imgRow.storage_path) fullPath = imgRow.storage_path;
          if (!thumbPath && imgRow.thumbnail_path) thumbPath = imgRow.thumbnail_path;
        }
      } catch (err) {
        console.warn("Failed to fetch product image record before deletion:", err);
      }
    }

    try {
      await deleteImageFiles(fullPath, thumbPath, PRODUCT_ASSETS_BUCKET);
    } catch (storageErr) {
      console.warn("Storage deletion error (will proceed with DB delete):", storageErr);
    }

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
    const results = await Promise.all(
      updates.map(({ id, sort_order }) =>
        supabase.from("product_images").update({ sort_order }).eq("image_id", id),
      ),
    );

    for (const res of results) {
      if (res.error) {
        throw new Error(`Failed to update image sort order: ${res.error.message}`);
      }
    }
  },
};

/**
 * Helper function to find or create a default event step for a product
 * to link images when step_id is not directly specified.
 */
async function resolveStepIdForProduct(productId: string): Promise<string> {
  const { data: dbEvts } = await (supabase as any)
    .from("product_events")
    .select("event_id, steps:product_event_steps(step_id)")
    .eq("product_id", productId)
    .order("sequence_number", { ascending: true });

  if (dbEvts && dbEvts.length > 0) {
    const firstEvt = dbEvts[0];
    if (firstEvt.steps && firstEvt.steps.length > 0) {
      return firstEvt.steps[0].step_id;
    }
    const stepId = safeUUID();
    const { error: stepErr } = await (supabase as any).from("product_event_steps").insert({
      step_id: stepId,
      event_id: firstEvt.event_id,
      step_type: "delivery",
      step_order: 1,
      status: "active",
    });
    if (!stepErr) return stepId;
  }

  const eventId = safeUUID();
  const stepId = safeUUID();

  const { error: evtErr } = await (supabase as any).from("product_events").insert({
    event_id: eventId,
    product_id: productId,
    event_type: "installation",
    sequence_number: 1,
    status: "active",
    created_at: new Date().toISOString(),
  });

  if (evtErr) {
    const { data: retryEvt } = await (supabase as any)
      .from("product_events")
      .select("event_id, steps:product_event_steps(step_id)")
      .eq("product_id", productId)
      .maybeSingle();

    if (retryEvt && retryEvt.steps && retryEvt.steps.length > 0) {
      return retryEvt.steps[0].step_id;
    }
    throw new Error(`Failed to create default event for product: ${evtErr.message}`);
  }

  const { error: stepErr } = await (supabase as any).from("product_event_steps").insert({
    step_id: stepId,
    event_id: eventId,
    step_type: "delivery",
    step_order: 1,
    status: "active",
  });

  if (stepErr) {
    throw new Error(`Failed to create default step for product: ${stepErr.message}`);
  }

  return stepId;
}
