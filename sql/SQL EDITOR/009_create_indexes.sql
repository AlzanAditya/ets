-- ============================================================
-- 009_create_indexes.sql
-- Phase 2.1 — Create all indexes
--
-- Run AFTER all table migrations (001–008) are complete.
--
-- Organized by table. Includes:
--   - Partial indexes for soft-delete patterns (deleted_at IS NULL)
--   - Composite indexes for common asset history queries
--   - Foreign key indexes (PostgreSQL does NOT auto-create these)
-- ============================================================

-- ── admins ────────────────────────────────────────────────────────────────────
-- Partial index: fast lookup of active admins only
CREATE INDEX IF NOT EXISTS idx_admins_active
  ON admins(id)
  WHERE deleted_at IS NULL;

-- ── branches ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branches_active
  ON branches(branch_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_city
  ON branches(city);

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_active
  ON clients(client_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_company
  ON clients(company_name);

-- ── products ──────────────────────────────────────────────────────────────────
-- Primary QR lookup path: SELECT * FROM products WHERE nomor_seri = $1
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_nomor_seri
  ON products(nomor_seri);

-- Status filtering (common: WHERE status = 'active')
CREATE INDEX IF NOT EXISTS idx_products_status
  ON products(status);

-- Location queries: "all active assets at Branch A"
-- Partial index excludes retired products for efficiency
CREATE INDEX IF NOT EXISTS idx_products_branch_active
  ON products(current_branch_id)
  WHERE status != 'retired';

-- Ownership queries: "all assets belonging to Client X"
-- Sparse partial index (only rows where client is assigned)
CREATE INDEX IF NOT EXISTS idx_products_client
  ON products(current_client_id)
  WHERE current_client_id IS NOT NULL;

-- Recency queries: "recently added products"
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products(created_at DESC);

-- ── transactions ──────────────────────────────────────────────────────────────
-- Unique code lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_code
  ON transactions(transaction_code);

-- Status + type filtering (very common filter combo)
CREATE INDEX IF NOT EXISTS idx_transactions_status_type
  ON transactions(status, transaction_type);

-- Branch queries: "all transactions at/from Branch A"
CREATE INDEX IF NOT EXISTS idx_transactions_source_branch
  ON transactions(source_branch_id)
  WHERE source_branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_dest_branch
  ON transactions(destination_branch_id)
  WHERE destination_branch_id IS NOT NULL;

-- Client queries: "all transactions for Client X"
CREATE INDEX IF NOT EXISTS idx_transactions_client
  ON transactions(client_id)
  WHERE client_id IS NOT NULL;

-- Date range queries: "transactions this month"
CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions(transaction_date DESC);

-- Audit: "all transactions created by Admin X"
CREATE INDEX IF NOT EXISTS idx_transactions_created_by
  ON transactions(created_by)
  WHERE created_by IS NOT NULL;

-- ── transaction_items ─────────────────────────────────────────────────────────
-- FK: fetch all items for a transaction
CREATE INDEX IF NOT EXISTS idx_txn_items_transaction
  ON transaction_items(transaction_id);

-- Asset history: "all transactions that involved Product X"
CREATE INDEX IF NOT EXISTS idx_txn_items_product
  ON transaction_items(product_id);

-- ── inventory_movements ───────────────────────────────────────────────────────
-- Primary asset history query: WHERE product_id = $1 ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_inv_mov_product_time
  ON inventory_movements(product_id, created_at DESC);

-- Linked transaction lookup
CREATE INDEX IF NOT EXISTS idx_inv_mov_transaction
  ON inventory_movements(transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Branch movement history: "all movements at Branch A"
CREATE INDEX IF NOT EXISTS idx_inv_mov_branch
  ON inventory_movements(branch_id)
  WHERE branch_id IS NOT NULL;

-- Type filter: "all adjustments ever made"
CREATE INDEX IF NOT EXISTS idx_inv_mov_type
  ON inventory_movements(movement_type);

-- Recency
CREATE INDEX IF NOT EXISTS idx_inv_mov_created_at
  ON inventory_movements(created_at DESC);

-- ── scan_logs ─────────────────────────────────────────────────────────────────
-- Composite: asset scan history sorted by time (most common query)
CREATE INDEX IF NOT EXISTS idx_scan_logs_product_time
  ON scan_logs(product_id, scanned_at DESC)
  WHERE product_id IS NOT NULL;

-- QR public lookup by nomor_seri text (used by QR scan endpoint)
CREATE INDEX IF NOT EXISTS idx_scan_logs_nomor_seri
  ON scan_logs(nomor_seri);

-- Time-range queries: "scans this week"
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at
  ON scan_logs(scanned_at DESC);
