-- ============================================================
-- 001_migrate_admins.sql
-- Phase 2.1 — Migrate admins table
--
-- Changes:
--   1. Data migrate: role='viewer' → 'warehouse'
--   2. Drop old role CHECK constraint
--   3. Add new CHECK (super_admin, admin, warehouse)
--   4. Add new columns: full_name, last_login_at, updated_at, deleted_at
--
-- IMPORTANT: Run STEP 1a BEFORE STEP 1b (data before constraint)
-- ============================================================

BEGIN;

-- ── STEP 1a: Data Migration (MUST run before constraint change) ──────────────
UPDATE admins
SET role = 'warehouse'
WHERE role = 'viewer';

-- Verify: should return 0 after migration
-- SELECT COUNT(*) FROM admins WHERE role = 'viewer';

-- ── STEP 1b: Update role CHECK constraint ────────────────────────────────────
ALTER TABLE admins
  DROP CONSTRAINT IF EXISTS admins_role_check;

ALTER TABLE admins
  ADD CONSTRAINT admins_role_check
  CHECK (role IN ('super_admin', 'admin', 'warehouse'));

-- Also update DEFAULT just in case
ALTER TABLE admins
  ALTER COLUMN role SET DEFAULT 'admin';

-- ── STEP 1c: Add new columns ─────────────────────────────────────────────────
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS full_name     TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ DEFAULT NULL;

-- ── STEP 1d: Comment ─────────────────────────────────────────────────────────
COMMENT ON TABLE admins IS 'Internal system users. Soft-deleted via deleted_at.';
COMMENT ON COLUMN admins.role IS 'Allowed: super_admin, admin, warehouse. viewer has been removed.';
COMMENT ON COLUMN admins.deleted_at IS 'NULL = active, NOT NULL = soft deleted. Never hard delete admins.';
COMMENT ON COLUMN admins.last_login_at IS 'Updated on each successful login via auth service.';

COMMIT;

-- ── Verify Results ────────────────────────────────────────────────────────────
-- SELECT id, email, role, full_name, last_login_at, updated_at, deleted_at
-- FROM admins;
