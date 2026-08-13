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
  id: string; // UUID — references auth.users(id)
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin" | "warehouse";
  last_login_at: string | null; // TIMESTAMPTZ as ISO string
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // NULL = active, NOT NULL = soft deleted
};

export type BranchRow = {
  branch_id: string; // UUID
  branch_code: string;
  branch_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ClientRow = {
  client_id: string; // UUID
  client_code: string;
  client_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ─── Product Images ───────────────────────────────────────────────────────────
// Generic image relation — reusable for maintenance docs, reports, audits etc.

export type ProductImageRow = {
  image_id: string; // UUID PK
  step_id: string; // FK → product_steps.step_id
  storage_path: string;
  thumbnail_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  uploaded_at: string;
  // Optional fields for UI component compatibility
  id?: string;
  product_id?: string | null;
  width?: number | null;
  height?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
};

export type ProductImageInsert = {
  image_id?: string;
  step_id?: string;
  product_id?: string;
  storage_path: string;
  thumbnail_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  sort_order?: number;
  width?: number | null;
  height?: number | null;
  uploaded_by?: string | null;
};
export type ProductImageUpdate = Partial<ProductImageInsert>;

export type ProductStatus = "warranty" | "maintenance";

export type ProductRow = {
  product_id: string; // UUID — surrogate PK
  serial_number: string; // UNIQUE — immutable, used by QR codes
  product_code: string | null;
  product_name: string;
  model: string | null;
  model_code: string | null;
  manufacture_year: number | null;
  input_voltage: string | null;
  output_voltage: string | null;
  frequency: string | null;
  socket_count: number | null;
  power_capacity: string | null;
  soft_fuse: string | null;
  hard_fuse: string | null;
  ground_output: string | null;
  current_branch_id: string | null; // FK → branches.branch_id
  current_client_id: string | null; // FK → clients.client_id
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type TransactionType = "sale" | "purchase" | "return" | "transfer";
export type TransactionStatus = "draft" | "pending" | "completed" | "cancelled";

export type TransactionRow = {
  transaction_id: string; // UUID
  transaction_code: string; // e.g. TRX-20260608-0001
  client_id: string | null; // FK → clients.client_id
  source_branch_id: string | null; // FK → branches.branch_id
  destination_branch_id: string | null; // FK → branches.branch_id
  transaction_type: TransactionType;
  status: TransactionStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  grand_total: number;
  notes: string | null;
  transaction_date: string; // DATE as ISO string
  created_by: string | null; // FK → admins.id
  approved_by: string | null; // FK → admins.id
  approved_at: string | null; // TIMESTAMPTZ — set when completed/cancelled
  created_at: string;
  updated_at: string;
};

export type TransactionItemRow = {
  transaction_item_id: string; // UUID
  transaction_id: string; // FK → transactions.transaction_id
  product_id: string; // FK → products.product_id
  // Snapshots — immutable after creation
  serial_number_snapshot: string;
  product_name_snapshot: string;
  category_snapshot: string | null;
  unit_cost_snapshot: number | null;
  unit_price_snapshot: number | null;
  // Values
  quantity: number;
  discount_amount: number;
  total_price: number;
  notes: string | null;
  created_at: string;
};

export type MovementType =
  | "stock_in"
  | "stock_out"
  | "transfer"
  | "return"
  | "adjustment";

export type InventoryMovementRow = {
  movement_id: string; // UUID
  product_id: string; // FK → products.product_id
  branch_id: string | null; // FK → branches.branch_id
  transaction_id: string | null; // FK → transactions.transaction_id
  movement_type: MovementType;
  quantity_before: number;
  quantity_change: number; // positive = in, negative = out
  quantity_after: number;
  notes: string | null;
  created_by: string | null; // FK → admins.id
  created_at: string;
};

export type ScanLogRow = {
  id: number; // BIGINT identity
  product_id: string | null; // FK → products.product_id (nullable)
  nomor_seri: string; // TEXT snapshot — always valid
  scanned_at: string;
  user_agent: string | null;
  ip_address: string | null;
  referer: string | null;
};

// ─── Insert Types (omit auto-generated fields) ────────────────────────────────

export type AdminInsert = Omit<
  AdminRow,
  "created_at" | "updated_at" | "deleted_at" | "last_login_at"
>;
export type BranchInsert = Omit<
  BranchRow,
  "branch_id" | "created_at" | "updated_at" | "deleted_at"
>;
export type ClientInsert = Omit<
  ClientRow,
  "client_id" | "created_at" | "updated_at" | "deleted_at"
>;
export type ProductInsert = Omit<
  ProductRow,
  "product_id" | "created_at" | "updated_at"
> & {
  product_id?: string;
};
export type TransactionInsert = Omit<
  TransactionRow,
  | "transaction_id"
  | "created_at"
  | "updated_at"
  | "approved_by"
  | "approved_at"
  | "transaction_code"
> & { transaction_code?: string };
export type TransactionItemInsert = Omit<
  TransactionItemRow,
  "transaction_item_id" | "created_at"
>;
export type InventoryMovementInsert = Omit<
  InventoryMovementRow,
  "movement_id" | "created_at"
>;
export type ScanLogInsert = Omit<ScanLogRow, "id" | "scanned_at">;

// ─── Update Types (all fields optional) ───────────────────────────────────────

export type ProductUpdate = Partial<
  Omit<ProductRow, "product_id" | "created_at" | "updated_at">
>;
export type TransactionUpdate = Partial<
  Omit<TransactionRow, "transaction_id" | "created_at" | "updated_at">
>;
export type BranchUpdate = Partial<
  Omit<BranchRow, "branch_id" | "created_at" | "updated_at">
>;
export type ClientUpdate = Partial<
  Omit<ClientRow, "client_id" | "created_at" | "updated_at">
>;

// ─── View Row Types ───────────────────────────────────────────────────────────
// Standalone types for Postgres views. NOT part of Database generic —
// adding typed Views to Database breaks Supabase's query builder inference.
// Use explicit `as TransactionStatsRow` cast when querying these views.

export type TransactionStatsRow = {
  total_count: number;
  completed_count: number;
  pending_count: number;
  draft_count: number;
  cancelled_count: number;
  total_revenue: number;
  pending_revenue: number;
  last_transaction_at: string | null;
};

export type ScanStatsRow = {
  total_scans: number;
  scans_this_month: number;
  scans_this_week: number;
  scans_today: number;
  unique_products_scanned: number;
  last_scanned_at: string | null;
};

// ─── Worker Module Types ──────────────────────────────────────────────────────

export type WorkerPositionRow = {
  position_id: string; // UUID PK
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkerRoleRow = {
  role_id: string; // UUID PK
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkerRow = {
  worker_id: string; // UUID PK
  id?: string; // UUID PK alias
  worker_code: string; // UNIQUE
  full_name: string;
  name?: string; // alias for full_name
  nickname: string | null;
  profile_image_path: string | null;
  profile_photo_path: string | null; // Path / URL to photo in worker-profiles bucket
  role?: string | null;
  status?: string | null;
  notes?: string | null;
  phone_number: string | null;
  email: string | null;
  position_id: string | null; // FK → worker_positions
  joined_date: string | null; // DATE as ISO string (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
};

export type WorkerAssignmentRow = {
  assignment_id: string; // UUID PK
  event_id: string; // FK → product_events
  worker_id: string; // FK → workers
  role_id: string; // FK → worker_roles
  assigned_at: string; // TIMESTAMPTZ
  completed_at: string | null; // TIMESTAMPTZ
  created_at?: string;
};

export type WorkerOperationalStatus = "In Installation" | "In Maintenance" | "Inactive";

export type WorkerPositionInsert = Omit<WorkerPositionRow, "created_at" | "updated_at"> & { position_id?: string };
export type WorkerRoleInsert = Omit<WorkerRoleRow, "created_at" | "updated_at"> & { role_id?: string };
export type WorkerInsert = Omit<WorkerRow, "worker_id" | "created_at" | "updated_at"> & { worker_id?: string };
export type WorkerUpdate = Partial<Omit<WorkerRow, "worker_id" | "created_at" | "updated_at">>;
export type WorkerAssignmentInsert = Omit<WorkerAssignmentRow, "assignment_id" | "created_at"> & { assignment_id?: string };

// ─── Supabase Database type for createClient<Database>() ─────────────────────

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: AdminRow;
        Insert: AdminInsert;
        Update: Partial<AdminRow>;
        Relationships: [];
      };
      branches: {
        Row: BranchRow;
        Insert: BranchInsert;
        Update: BranchUpdate;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      product_images: {
        Row: ProductImageRow;
        Insert: ProductImageInsert;
        Update: ProductImageUpdate;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
        Relationships: [];
      };
      transaction_items: {
        Row: TransactionItemRow;
        Insert: TransactionItemInsert;
        Update: Partial<TransactionItemRow>;
        Relationships: [];
      };
      inventory_movements: {
        Row: InventoryMovementRow;
        Insert: InventoryMovementInsert;
        Update: Partial<InventoryMovementRow>; // append-only in practice
        Relationships: [];
      };
      scan_logs: {
        Row: ScanLogRow;
        Insert: ScanLogInsert;
        Update: Partial<ScanLogRow>; // append-only in practice
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_status: ProductStatus;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      movement_type: MovementType;
    };
  };
}
