-- ============================================================
-- 007_create_transaction_items.sql
-- Phase 2.1 — Create transaction_items table
--
-- Purpose: Line items for each transaction.
--   - 1 transaction → many items
--   - 1 item = 1 physical asset (serial-number based)
--   - Snapshot fields capture product data at time of transaction
--     so future product edits don't corrupt history
--
-- MUST run AFTER 006_archive_replace_transactions.sql
-- ============================================================

BEGIN;

CREATE TABLE transaction_items (
  -- Primary Key
  transaction_item_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Transaction
  transaction_id        UUID          NOT NULL
                        REFERENCES transactions(transaction_id) ON DELETE CASCADE,

  -- Product (immutable reference — RESTRICT delete if items exist)
  product_id            UUID          NOT NULL
                        REFERENCES products(product_id) ON DELETE RESTRICT,

  -- ── SNAPSHOTS — captured at time of transaction ──────────────────────
  -- These fields are IMMUTABLE after row creation.
  -- Product edits, renames, or deletions do NOT change these values.
  serial_number_snapshot  TEXT          NOT NULL,   -- copy of products.nomor_seri
  product_name_snapshot   TEXT          NOT NULL,   -- copy of products.nama_produk
  category_snapshot       TEXT,                     -- copy of products.category
  unit_cost_snapshot      NUMERIC(15,2),            -- purchase price at time of transaction
  unit_price_snapshot     NUMERIC(15,2),            -- sale price at time of transaction

  -- ── VALUES ────────────────────────────────────────────────────────────
  -- For serial-number assets, quantity is almost always 1.
  -- Field retained for forward compatibility (spare parts, consumables).
  quantity                INTEGER       NOT NULL DEFAULT 1
                          CHECK (quantity > 0),
  discount_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price             NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes                   TEXT,

  -- System
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- No updated_at: transaction_items are immutable after creation.
);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE transaction_items IS 'Line items per transaction. Snapshot fields are immutable — product changes never affect history.';
COMMENT ON COLUMN transaction_items.serial_number_snapshot IS 'Copied from products.nomor_seri at transaction time. Never update after insert.';
COMMENT ON COLUMN transaction_items.product_name_snapshot  IS 'Copied from products.nama_produk at transaction time. Never update after insert.';
COMMENT ON COLUMN transaction_items.unit_cost_snapshot     IS 'Purchase/cost price at transaction time. Never update after insert.';
COMMENT ON COLUMN transaction_items.unit_price_snapshot    IS 'Sale price at transaction time. Never update after insert.';
COMMENT ON COLUMN transaction_items.quantity               IS 'Almost always 1 for serial-number assets. > 1 reserved for future non-serial items.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read transaction items
CREATE POLICY "txn_items_select_authenticated"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert items (app layer validates ownership)
CREATE POLICY "txn_items_insert_authenticated"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can delete items (and only from non-completed transactions)
CREATE POLICY "txn_items_delete_admin"
  ON transaction_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.transaction_id = transaction_items.transaction_id
        AND t.status IN ('draft', 'pending')
    )
  );

COMMIT;
