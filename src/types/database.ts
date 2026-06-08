/**
 * Database types — 1:1 with Supabase schema (Rev 3 Final)
 *
 * These types are the single source of truth for all database field names.
 * Variable naming MUST match Supabase column names exactly.
 *
 * Tables: admins, branches, clients, products,
 *         transactions, transaction_items, inventory_movements, scan_logs
 */

// ─── Row Types (exact DB columns) ────────────────────────────────────────────

export type AdminRow = {
  id: string                     // UUID — references auth.users(id)
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'warehouse'
  last_login_at: string | null   // TIMESTAMPTZ as ISO string
  created_at: string
  updated_at: string
  deleted_at: string | null      // NULL = active, NOT NULL = soft deleted
}

export type BranchRow = {
  branch_id: string              // UUID
  branch_code: string
  branch_name: string
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ClientRow = {
  client_id: string              // UUID
  client_code: string
  client_name: string
  company_name: string | null
  email: string | null
  phone_number: string | null
  whatsapp_number: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProductStatus = 'active' | 'deployed' | 'sold' | 'maintenance' | 'inactive' | 'retired'

export type ProductRow = {
  product_id: string             // UUID — surrogate PK
  nomor_seri: string             // UNIQUE — immutable, used by QR codes
  product_code: string | null
  nama_produk: string
  category: string | null
  brand: string | null
  tipe_kode: string | null
  tahun_pembuatan: number | null
  input: string | null
  output: string | null
  frekuensi: string | null
  jumlah_socket: number | null
  range_daya: string | null
  soft_fuse_protection: string | null
  hard_fuse_protection: string | null
  ground_output: string | null
  tambahan_optional: string | null
  current_branch_id: string | null  // FK → branches.branch_id
  current_client_id: string | null  // FK → clients.client_id
  status: ProductStatus
  gambar_depan: string | null    // Supabase Storage URL
  gambar_kanan: string | null
  gambar_kiri: string | null
  gambar_belakang: string | null
  created_at: string
  updated_at: string
}

export type TransactionType = 'sale' | 'purchase' | 'return' | 'transfer'
export type TransactionStatus = 'draft' | 'pending' | 'completed' | 'cancelled'

export type TransactionRow = {
  transaction_id: string         // UUID
  transaction_code: string       // e.g. TRX-20260608-0001
  client_id: string | null       // FK → clients.client_id
  source_branch_id: string | null        // FK → branches.branch_id
  destination_branch_id: string | null   // FK → branches.branch_id
  transaction_type: TransactionType
  status: TransactionStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  shipping_cost: number
  grand_total: number
  notes: string | null
  transaction_date: string       // DATE as ISO string
  created_by: string | null      // FK → admins.id
  approved_by: string | null     // FK → admins.id
  approved_at: string | null     // TIMESTAMPTZ — set when completed/cancelled
  created_at: string
  updated_at: string
}

export type TransactionItemRow = {
  transaction_item_id: string    // UUID
  transaction_id: string         // FK → transactions.transaction_id
  product_id: string             // FK → products.product_id
  // Snapshots — immutable after creation
  serial_number_snapshot: string
  product_name_snapshot: string
  category_snapshot: string | null
  unit_cost_snapshot: number | null
  unit_price_snapshot: number | null
  // Values
  quantity: number
  discount_amount: number
  total_price: number
  notes: string | null
  created_at: string
}

export type MovementType = 'stock_in' | 'stock_out' | 'transfer' | 'return' | 'adjustment'

export type InventoryMovementRow = {
  movement_id: string            // UUID
  product_id: string             // FK → products.product_id
  branch_id: string | null       // FK → branches.branch_id
  transaction_id: string | null  // FK → transactions.transaction_id
  movement_type: MovementType
  quantity_before: number
  quantity_change: number        // positive = in, negative = out
  quantity_after: number
  notes: string | null
  created_by: string | null      // FK → admins.id
  created_at: string
}

export type ScanLogRow = {
  id: number                     // BIGINT identity
  product_id: string | null      // FK → products.product_id (nullable)
  nomor_seri: string             // TEXT snapshot — always valid
  scanned_at: string
  user_agent: string | null
  ip_address: string | null
  referer: string | null
}

// ─── Insert Types (omit auto-generated fields) ────────────────────────────────

export type AdminInsert = Omit<AdminRow, 'created_at' | 'updated_at' | 'deleted_at' | 'last_login_at'>
export type BranchInsert = Omit<BranchRow, 'branch_id' | 'created_at' | 'updated_at' | 'deleted_at'>
export type ClientInsert = Omit<ClientRow, 'client_id' | 'created_at' | 'updated_at' | 'deleted_at'>
export type ProductInsert = Omit<ProductRow, 'product_id' | 'created_at' | 'updated_at'>
export type TransactionInsert = Omit<TransactionRow, 'transaction_id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at'>
export type TransactionItemInsert = Omit<TransactionItemRow, 'transaction_item_id' | 'created_at'>
export type InventoryMovementInsert = Omit<InventoryMovementRow, 'movement_id' | 'created_at'>
export type ScanLogInsert = Omit<ScanLogRow, 'id' | 'scanned_at'>

// ─── Update Types (all fields optional) ───────────────────────────────────────

export type ProductUpdate = Partial<Omit<ProductRow, 'product_id' | 'nomor_seri' | 'created_at'>>
export type TransactionUpdate = Partial<Omit<TransactionRow, 'transaction_id' | 'created_at'>>
export type BranchUpdate = Partial<Omit<BranchRow, 'branch_id' | 'created_at'>>
export type ClientUpdate = Partial<Omit<ClientRow, 'client_id' | 'created_at'>>

// ─── Supabase Database type for createClient<Database>() ─────────────────────

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: AdminRow
        Insert: AdminInsert
        Update: Partial<AdminRow>
        Relationships: []
      }
      branches: {
        Row: BranchRow
        Insert: BranchInsert
        Update: BranchUpdate
        Relationships: []
      }
      clients: {
        Row: ClientRow
        Insert: ClientInsert
        Update: ClientUpdate
        Relationships: []
      }
      products: {
        Row: ProductRow
        Insert: ProductInsert
        Update: ProductUpdate
        Relationships: []
      }
      transactions: {
        Row: TransactionRow
        Insert: TransactionInsert
        Update: TransactionUpdate
        Relationships: []
      }
      transaction_items: {
        Row: TransactionItemRow
        Insert: TransactionItemInsert
        Update: Partial<TransactionItemRow>
        Relationships: []
      }
      inventory_movements: {
        Row: InventoryMovementRow
        Insert: InventoryMovementInsert
        Update: Partial<InventoryMovementRow>  // append-only in practice
        Relationships: []
      }
      scan_logs: {
        Row: ScanLogRow
        Insert: ScanLogInsert
        Update: Partial<ScanLogRow>  // append-only in practice
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      product_status: ProductStatus
      transaction_type: TransactionType
      transaction_status: TransactionStatus
      movement_type: MovementType
    }
  }
}
