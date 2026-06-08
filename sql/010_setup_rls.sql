-- ============================================================
-- 010_setup_rls.sql
-- Phase 2.1 — Final RLS policy review & consolidated setup
--
-- This file is a consolidated RLS reference.
-- Most policies are already created in their respective migration files.
-- This file adds any missing policies and documents the full RLS strategy.
--
-- RLS Strategy:
--   PUBLIC (anon):
--     - products: SELECT (for QR scan page)
--     - scan_logs: INSERT (for QR scan logging)
--
--   AUTHENTICATED (all roles: super_admin, admin, warehouse):
--     - All tables: SELECT
--
--   WRITE (super_admin + admin only):
--     - products: INSERT, UPDATE, DELETE
--     - branches: INSERT, UPDATE, DELETE
--     - clients:  INSERT, UPDATE, DELETE
--     - transaction_items: DELETE (only on draft/pending transactions)
--
--   APPROVE (super_admin + admin):
--     - transactions: UPDATE status to 'completed' or 'cancelled'
--
--   CREATE TRANSACTION (all authenticated):
--     - transactions: INSERT (draft only)
--     - transaction_items: INSERT
--
--   ADJUSTMENT (super_admin + admin):
--     - inventory_movements: INSERT with movement_type = 'adjustment'
-- ============================================================

-- ── Helper function: check if current user is admin or super_admin ────────────
-- Used in RLS policies to avoid repeating the subquery
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid()
      AND deleted_at IS NULL
  );
$$;

-- ── products — RLS ────────────────────────────────────────────────────────────
-- Drop existing policies from 001 migration (will be recreated properly)
DROP POLICY IF EXISTS "products_public_read"   ON products;
DROP POLICY IF EXISTS "products_admin_insert"  ON products;
DROP POLICY IF EXISTS "products_admin_update"  ON products;
DROP POLICY IF EXISTS "products_admin_delete"  ON products;

-- Public can read non-retired products (for QR scan page)
CREATE POLICY "products_public_select"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status != 'retired');

-- Authenticated can read ALL products including retired (for admin views)
CREATE POLICY "products_admin_select_all"
  ON products FOR SELECT
  TO authenticated
  USING (is_authenticated_user());

-- Only super_admin/admin can create products
CREATE POLICY "products_insert_admin"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only super_admin/admin can update products
CREATE POLICY "products_update_admin"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin());

-- "Delete" = set status = 'retired' via UPDATE. No hard delete.
-- No DELETE policy — hard delete blocked.

-- ── admins — RLS (supplement 001) ────────────────────────────────────────────
-- Self-read: any admin can read their own row
DROP POLICY IF EXISTS "admins_read_own"       ON admins;
DROP POLICY IF EXISTS "admins_super_read_all" ON admins;

CREATE POLICY "admins_select_own"
  ON admins FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- super_admin can read all admins
CREATE POLICY "admins_select_all_superadmin"
  ON admins FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Only super_admin can insert/update/delete admins
CREATE POLICY "admins_write_superadmin"
  ON admins FOR ALL
  TO authenticated
  USING (is_super_admin());

-- ── scan_logs — final RLS (supplement 005) ───────────────────────────────────
-- Already set in 005. Documenting here for reference:
--
-- anon + authenticated → INSERT (QR scan, no auth required)
-- authenticated        → SELECT (admin dashboard)
-- No UPDATE, no DELETE (append-only)

-- ── Updated triggers for updated_at ──────────────────────────────────────────
-- Create a reusable trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Final verification queries ────────────────────────────────────────────────
-- Run these after all migrations to confirm schema is correct:

-- 1. Confirm all tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--   ORDER BY tablename;

-- 2. Confirm products PK is now product_id
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'products'
--   ORDER BY ordinal_position;

-- 3. Confirm no viewer roles remain
-- SELECT COUNT(*) FROM admins WHERE role = 'viewer';
-- (Expected: 0)

-- 4. Confirm scan_logs has product_id column
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'scan_logs';

-- 5. Confirm indexes were created
-- SELECT indexname, tablename FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
