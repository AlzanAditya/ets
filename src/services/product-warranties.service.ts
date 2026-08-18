import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import type {
  ProductWarrantyRow,
  ProductWarrantyInsert,
  ProductCurrentWarrantyRow,
} from "@/types/database";
import { productsService } from "@/services/products.service";

export interface CreateWarrantyPayload {
  product_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration_months?: number | null;
  notes?: string | null;
  warranty_type?: "initial" | "extension" | "renewal" | "claim";
}

export const productWarrantiesService = {
  /**
   * Fetch current/active warranty for a product.
   * Prefers `vw_product_current_warranty` view if available,
   * with graceful fallback to querying `product_warranties` table.
   */
  async getCurrentWarranty(productId: string): Promise<ProductCurrentWarrantyRow | null> {
    if (!productId) return null;

    try {
      // 1. Try querying vw_product_current_warranty
      const { data: viewData, error: viewErr } = await (supabase as any)
        .from("vw_product_current_warranty")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();

      if (!viewErr && viewData) {
        return {
          product_id: viewData.product_id,
          warranty_id: viewData.warranty_id ?? null,
          warranty_type: viewData.warranty_type ?? "initial",
          start_date: viewData.start_date ?? null,
          end_date: viewData.end_date ?? null,
          duration_months: viewData.duration_months ? Number(viewData.duration_months) : null,
          is_active: Boolean(viewData.is_active ?? (viewData.days_remaining ? viewData.days_remaining > 0 : true)),
          days_remaining: viewData.days_remaining !== undefined ? Number(viewData.days_remaining) : null,
          notes: viewData.notes ?? null,
        };
      }
    } catch (e) {
      console.warn("vw_product_current_warranty query fallback:", e);
    }

    // Fallback: Query product_warranties directly
    try {
      const { data: records, error: tblErr } = await (supabase as any)
        .from("product_warranties")
        .select("*")
        .eq("product_id", productId)
        .order("end_date", { ascending: false })
        .limit(1);

      if (tblErr || !records || records.length === 0) {
        return null;
      }

      const latest = records[0] as ProductWarrantyRow;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const endDate = new Date(latest.end_date);
      endDate.setHours(23, 59, 59, 999);
      const diffTime = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isActive = daysRemaining >= 0;

      return {
        product_id: latest.product_id,
        warranty_id: latest.warranty_id,
        warranty_type: latest.warranty_type,
        start_date: latest.start_date,
        end_date: latest.end_date,
        duration_months: latest.duration_months ?? null,
        is_active: isActive,
        days_remaining: daysRemaining,
        notes: latest.notes ?? null,
      };
    } catch (err) {
      console.error("Failed to query product warranty fallback:", err);
      return null;
    }
  },

  /**
   * Fetch full warranty history for a product.
   */
  async getWarrantyHistory(productId: string): Promise<ProductWarrantyRow[]> {
    if (!productId) return [];

    const { data, error } = await (supabase as any)
      .from("product_warranties")
      .select("*")
      .eq("product_id", productId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("[Supabase Error] Table: product_warranties | Action: SELECT | Details:", error.message);
      return [];
    }

    return (data || []) as ProductWarrantyRow[];
  },

  /**
   * Create initial warranty record upon installation completion.
   * Never assumes or invents duration if not supplied.
   */
  async createInitialWarranty(payload: CreateWarrantyPayload): Promise<ProductWarrantyRow> {
    const warrantyId = safeUUID();
    const insertData: ProductWarrantyInsert = {
      warranty_id: warrantyId,
      product_id: payload.product_id,
      warranty_type: payload.warranty_type ?? "initial",
      start_date: payload.start_date,
      end_date: payload.end_date,
      duration_months: payload.duration_months ?? null,
      notes: payload.notes ?? null,
      created_at: new Date().toISOString(),
    };

    console.group("SUPABASE INSERT product_warranties (Initial)");
    console.log("Payload:", insertData);

    const { data, error } = await (supabase as any)
      .from("product_warranties")
      .insert(insertData)
      .select()
      .single();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menyimpan data garansi awal: ${error.message}`);
    }

    // Set product status to "warranty"
    try {
      await productsService.updateProduct(payload.product_id, { status: "warranty" });
    } catch (statusErr) {
      console.warn("Failed to set product status to warranty:", statusErr);
    }

    return data as ProductWarrantyRow;
  },

  /**
   * Extend an existing warranty.
   * Creates a NEW "extension" record, preserving all historical records.
   * Also transitions product status back to "warranty" if it was expired.
   */
  async extendWarranty(payload: CreateWarrantyPayload): Promise<ProductWarrantyRow> {
    const warrantyId = safeUUID();
    const insertData: ProductWarrantyInsert = {
      warranty_id: warrantyId,
      product_id: payload.product_id,
      warranty_type: payload.warranty_type ?? "extension",
      start_date: payload.start_date,
      end_date: payload.end_date,
      duration_months: payload.duration_months ?? null,
      notes: payload.notes ?? null,
      created_at: new Date().toISOString(),
    };

    console.group("SUPABASE INSERT product_warranties (Extension)");
    console.log("Payload:", insertData);

    const { data, error } = await (supabase as any)
      .from("product_warranties")
      .insert(insertData)
      .select()
      .single();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menyimpan perpanjangan garansi: ${error.message}`);
    }

    // Restore or maintain product status as "warranty"
    try {
      await productsService.updateProduct(payload.product_id, { status: "warranty" });
    } catch (statusErr) {
      console.warn("Failed to update product status to warranty:", statusErr);
    }

    return data as ProductWarrantyRow;
  },

  /**
   * Generic insert into product_warranties
   */
  async insertWarranty(payload: ProductWarrantyInsert): Promise<ProductWarrantyRow> {
    const insertData = {
      ...payload,
      warranty_id: payload.warranty_id || safeUUID(),
      created_at: payload.created_at || new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("product_warranties")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal menyimpan data garansi: ${error.message}`);
    }

    return data as ProductWarrantyRow;
  },
};
