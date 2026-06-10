-- ============================================================
-- 005_evolve_scan_logs.sql
-- Phase 2.1 — Evolve scan_logs table
--
-- Current state (after 004):
--   scan_logs.nomor_seri = plain TEXT (FK already dropped in 004)
--
-- Changes:
--   1. Add product_id UUID column (nullable FK → products.product_id)
--   2. Backfill product_id by matching nomor_seri → products.nomor_seri
--   3. nomor_seri STAYS as TEXT column (snapshot, backward compatible)
--   4. Update RLS policies
--
-- MUST run AFTER 004_evolve_products.sql
-- ============================================================

BEGIN;

-- ── STEP 5a: Add product_id column ───────────────────────────────────────────
-- Nullable because:
--   - Old scan_logs rows will be backfilled in 5b
--   - Future scans of unknown nomor_seri should still log (product_id = NULL)
ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(product_id) ON DELETE SET NULL;

-- ── STEP 5b: Backfill product_id from products ───────────────────────────────
-- Match existing scan_logs rows to products by nomor_seri
UPDATE scan_logs sl
SET product_id = p.product_id
FROM products p
WHERE p.nomor_seri = sl.nomor_seri
  AND sl.product_id IS NULL;

-- ── STEP 5c: Verify backfill (uncomment to check) ────────────────────────────
-- SELECT
--   COUNT(*) AS total,
--   COUNT(product_id) AS matched,
--   COUNT(*) - COUNT(product_id) AS unmatched
-- FROM scan_logs;

-- ── STEP 5d: nomor_seri column stays as TEXT (no FK) ─────────────────────────
-- This is intentional:
--   - nomor_seri in scan_logs is a TEXT snapshot
--   - Scan history remains valid even if product is retired/deleted
--   - Public QR scan endpoint still inserts nomor_seri as text
--   - No schema change needed here — just documenting the decision

-- ── STEP 5e: Drop old RLS policies and recreate ───────────────────────────────
DROP POLICY IF EXISTS "scan_logs_insert"       ON scan_logs;
DROP POLICY IF EXISTS "scan_logs_admin_read"   ON scan_logs;

-- Public (anon) can insert scan logs — this is the QR scan endpoint
CREATE POLICY "scan_logs_public_insert"
  ON scan_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins can read all scan logs
CREATE POLICY "scan_logs_authenticated_read"
  ON scan_logs FOR SELECT
  TO authenticated
  USING (true);

-- ── STEP 5f: Comments ─────────────────────────────────────────────────────────
COMMENT ON COLUMN scan_logs.product_id IS 'FK to products. Nullable — SET NULL if product deleted. May be NULL for scans of unknown nomor_seri.';
COMMENT ON COLUMN scan_logs.nomor_seri IS 'Text snapshot of the scanned serial number. Preserved even if product is retired. NOT a FK.';

COMMIT;
