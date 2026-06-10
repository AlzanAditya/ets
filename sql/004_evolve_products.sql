-- ============================================================
-- 004_evolve_products.sql
-- Phase 2.1 — Evolve products table
--
-- Current state:
--   PRIMARY KEY: nomor_seri (TEXT)
--   scan_logs.nomor_seri references products(nomor_seri)
--
-- Changes:
--   1. Drop scan_logs FK (referencing products.nomor_seri) — MUST be first
--   2. Add product_id UUID column
--   3. Populate product_id for all existing rows
--   4. Swap PRIMARY KEY: nomor_seri → product_id
--   5. Add UNIQUE constraint to nomor_seri (QR compatibility preserved)
--   6. Add new columns:
--      - product_code, category, brand
--      - current_branch_id, current_client_id
--      - status (with new values including 'deployed', 'sold')
--      - updated_at
--
-- CRITICAL: This migration MUST run before 005_evolve_scan_logs.sql
-- CRITICAL: Run entire file as ONE transaction. Do NOT split.
-- ============================================================

BEGIN;

-- ── STEP 4a: Drop FK constraint in scan_logs FIRST ───────────────────────────
-- scan_logs.nomor_seri currently references products.nomor_seri (the old PK)
-- We must drop this FK before we can change products' primary key.
-- After this step, scan_logs.nomor_seri becomes a plain TEXT column.
ALTER TABLE scan_logs
  DROP CONSTRAINT IF EXISTS scan_logs_nomor_seri_fkey;

-- ── STEP 4b: Add product_id column (nullable initially) ──────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_id UUID;

-- ── STEP 4c: Populate product_id for all existing rows ───────────────────────
UPDATE products
SET product_id = gen_random_uuid()
WHERE product_id IS NULL;

-- ── STEP 4d: Set product_id NOT NULL ─────────────────────────────────────────
ALTER TABLE products
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE products
  ALTER COLUMN product_id SET DEFAULT gen_random_uuid();

-- ── STEP 4e: Swap PRIMARY KEY ─────────────────────────────────────────────────
-- Drop old PK on nomor_seri (and any auto-named variants)
-- IF NOT EXISTS guards make this safe to re-run.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_pkey,
  DROP CONSTRAINT IF EXISTS products_pkey1;

-- Add new PK on product_id — only if no PK exists yet (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE products ADD PRIMARY KEY (product_id);
  END IF;
END
$$;

-- ── STEP 4f: Add UNIQUE constraint on nomor_seri ─────────────────────────────
-- nomor_seri is no longer PK but MUST remain unique.
-- QR code lookup: SELECT * FROM products WHERE nomor_seri = $1 still works.
ALTER TABLE products
  ADD CONSTRAINT products_nomor_seri_unique UNIQUE (nomor_seri);

-- ── STEP 4g: Add new columns ─────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_code       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS category           TEXT,
  ADD COLUMN IF NOT EXISTS brand              TEXT,
  ADD COLUMN IF NOT EXISTS current_branch_id  UUID REFERENCES branches(branch_id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_client_id  UUID REFERENCES clients(client_id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── STEP 4h: Add status column ───────────────────────────────────────────────
-- New status values vs old schema:
--   OLD: no status column
--   NEW: active | deployed | sold | maintenance | inactive | retired
--
-- 'retired' is the soft-delete state for products.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deployed', 'sold', 'maintenance', 'inactive', 'retired'));

-- ── STEP 4i: Comments ─────────────────────────────────────────────────────────
COMMENT ON TABLE products IS 'Physical assets tracked by serial number. 1 row = 1 physical asset.';
COMMENT ON COLUMN products.product_id IS 'Surrogate UUID PK. All internal FKs reference this.';
COMMENT ON COLUMN products.nomor_seri IS 'Immutable serial number. Used by QR codes. NEVER change after creation.';
COMMENT ON COLUMN products.current_branch_id IS 'Physical location of asset. NULL if sold or not in any branch.';
COMMENT ON COLUMN products.current_client_id IS 'Client who owns/uses this asset. NULL if in company inventory.';
COMMENT ON COLUMN products.status IS 'active=in inventory | deployed=at client | sold=ownership transferred | maintenance=in service | inactive=unused | retired=decommissioned';

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT product_id, nomor_seri, nama_produk, status, current_branch_id, current_client_id
-- FROM products
-- LIMIT 5;
