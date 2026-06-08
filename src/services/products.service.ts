import { supabase } from '@/lib/supabase'
import type { ProductRow, ProductInsert, ProductUpdate } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetProductsParams {
  search?: string
  status?: ProductRow['status']
  branch_id?: string
  client_id?: string
  limit?: number
  offset?: number
}

export interface ProductWithRelations extends ProductRow {
  branch?: { branch_name: string; branch_code: string } | null
  client?: { client_name: string; client_code: string } | null
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productsService = {

  /**
   * Fetch paginated list of products.
   * Excludes retired by default unless status is explicitly passed.
   */
  async getProducts(params: GetProductsParams = {}): Promise<ProductRow[]> {
    const { search, status, branch_id, client_id, limit = 50, offset = 0 } = params

    let query = supabase
      .from('products')
      .select('*, branch:branches(branch_name, branch_code), client:clients(client_name, client_code)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'retired')
    }

    if (search) {
      query = query.or(
        `nomor_seri.ilike.%${search}%,nama_produk.ilike.%${search}%,product_code.ilike.%${search}%`
      )
    }

    if (branch_id) query = query.eq('current_branch_id', branch_id)
    if (client_id) query = query.eq('current_client_id', client_id)

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch products: ${error.message}`)
    return data ?? []
  },

  /**
   * Fetch single product by product_id (UUID).
   */
  async getProductById(product_id: string): Promise<ProductRow | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', product_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch product: ${error.message}`)
    }
    return data ?? null
  },

  /**
   * Fetch single product by nomor_seri (for QR compatibility).
   */
  async getProductBySerial(nomor_seri: string): Promise<ProductRow | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('nomor_seri', nomor_seri)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch product: ${error.message}`)
    }
    return data ?? null
  },

  /**
   * Count total products (excluding retired).
   */
  async getProductCount(status?: ProductRow['status']): Promise<number> {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'retired')
    }

    const { count, error } = await query

    if (error) throw new Error(`Failed to count products: ${error.message}`)
    return count ?? 0
  },

  /**
   * Create a new product.
   */
  async createProduct(data: ProductInsert): Promise<ProductRow> {
    const { data: created, error } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Failed to create product: ${error.message}`)
    if (!created) throw new Error('Product creation returned no data')
    return created
  },

  /**
   * Update an existing product by product_id.
   * nomor_seri is immutable — excluded from update type.
   */
  async updateProduct(product_id: string, data: ProductUpdate): Promise<ProductRow> {
    const { data: updated, error } = await supabase
      .from('products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('product_id', product_id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update product: ${error.message}`)
    if (!updated) throw new Error('Product update returned no data')
    return updated
  },

  /**
   * Soft delete a product by setting status = 'retired'.
   * Hard delete is not supported.
   */
  async retireProduct(product_id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ status: 'retired', updated_at: new Date().toISOString() })
      .eq('product_id', product_id)

    if (error) throw new Error(`Failed to retire product: ${error.message}`)
  },

  /**
   * Fetch recently added products (for dashboard table).
   */
  async getRecentProducts(limit = 10): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .neq('status', 'retired')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch recent products: ${error.message}`)
    return data ?? []
  },
}
