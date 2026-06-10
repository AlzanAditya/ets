-- ============================================================
-- 002_create_branches.sql
-- Phase 2.1 — Create branches table
--
-- Purpose: Warehouse, office, branch, operational locations.
-- Soft delete via deleted_at (no hard deletes).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS branches (
  branch_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_code  TEXT        NOT NULL UNIQUE,
  branch_name  TEXT        NOT NULL,
  address      TEXT,
  city         TEXT,
  province     TEXT,
  postal_code  TEXT,
  phone        TEXT,
  email        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ          DEFAULT NULL
);

COMMENT ON TABLE branches IS 'Warehouse, office, and operational branch locations.';
COMMENT ON COLUMN branches.branch_code IS 'Human-readable code, e.g. BWI-01, JKT-02. Immutable after creation.';
COMMENT ON COLUMN branches.deleted_at IS 'NULL = active. Soft delete only — never hard delete a branch.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all non-deleted branches
CREATE POLICY "branches_select_authenticated"
  ON branches FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Only super_admin and admin can insert/update/delete branches
CREATE POLICY "branches_write_admin"
  ON branches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND deleted_at IS NULL
    )
  );

COMMIT;
