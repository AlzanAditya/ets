-- ============================================================
-- 003_create_clients.sql
-- Phase 2.1 — Create clients table
--
-- Purpose: Customer / company information.
-- Soft delete via deleted_at (no hard deletes).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS clients (
  client_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code     TEXT        NOT NULL UNIQUE,
  customer_name     TEXT        NOT NULL,
  company_name    TEXT,
  email           TEXT,
  phone_number    TEXT,
  whatsapp_number TEXT,
  address         TEXT,
  city            TEXT,
  province        TEXT,
  postal_code     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ          DEFAULT NULL
);

COMMENT ON TABLE clients IS 'Customer and company records. Used for transactions and asset ownership tracking.';
COMMENT ON COLUMN clients.client_code IS 'Human-readable code, e.g. CLT-001. Unique and immutable after creation.';
COMMENT ON COLUMN clients.deleted_at IS 'NULL = active. Soft delete only — never hard delete a client with transaction history.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all non-deleted clients
CREATE POLICY "clients_select_authenticated"
  ON clients FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Only super_admin and admin can insert/update/delete clients
CREATE POLICY "clients_write_admin"
  ON clients FOR ALL
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
