-- ============================================================
-- 013_refactor_product_images.sql
-- Phase: Image Storage Refactor
--
-- Changes:
--   1. Create product_images table (generic, reusable image relation)
--   2. Migrate existing image URLs from legacy positional columns
--      gambar_depan / gambar_kanan / gambar_kiri / gambar_belakang
--   3. Drop legacy image columns from products
--
-- CRITICAL: Run entire file as ONE transaction.
-- CRITICAL: Ensure the Supabase Storage bucket 'product-images' is
--           created and set to PRIVATE before running this migration.
-- ============================================================

BEGIN;

-- ── STEP 1: Create product_images table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_images (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID          NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,

  -- Storage references (private bucket paths, not public URLs)
  storage_path    TEXT          NOT NULL,
  thumbnail_path  TEXT,

  -- File metadata
  file_name       TEXT,
  file_size       BIGINT,
  mime_type       TEXT          NOT NULL DEFAULT 'image/webp',

  -- Image dimensions (extracted client-side during optimization)
  width           INTEGER,
  height          INTEGER,

  -- Ordering and audit
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  uploaded_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE product_images IS
  'Generic product image gallery. One-to-many with products. '
  'Storage paths reference the private product-images bucket. '
  'Reusable pattern — apply to maintenance_images, report_images etc.';

COMMENT ON COLUMN product_images.storage_path   IS 'Path inside product-images bucket, e.g. products/PRD-001/full/uuid.webp';
COMMENT ON COLUMN product_images.thumbnail_path IS 'Path inside product-images bucket, e.g. products/PRD-001/thumbs/uuid.webp';
COMMENT ON COLUMN product_images.width          IS 'Full image width in pixels, extracted during client-side optimization';
COMMENT ON COLUMN product_images.height         IS 'Full image height in pixels, extracted during client-side optimization';
COMMENT ON COLUMN product_images.uploaded_by    IS 'auth.users.id of the admin who uploaded this image';

-- ── STEP 2: Indexes ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_sort
  ON product_images(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_images_uploaded_by
  ON product_images(uploaded_by);

-- ── STEP 3: Migrate legacy image columns ──────────────────────────────────────
-- Positional columns → ordered rows in product_images
-- Only rows with non-empty values are migrated.
-- sort_order preserves the original positional meaning:
--   0 = gambar_depan (front)
--   1 = gambar_kanan (right)
--   2 = gambar_kiri  (left)
--   3 = gambar_belakang (back)

INSERT INTO product_images (product_id, storage_path, file_name, mime_type, sort_order)
SELECT
  product_id,
  -- Legacy columns stored public URLs; treat them as paths for now.
  -- Cleanup to proper storage paths must be done manually or via a separate
  -- admin script that re-uploads/re-files the images.
  gambar_depan        AS storage_path,
  'legacy-front.jpg'  AS file_name,
  'image/jpeg'        AS mime_type,
  0                   AS sort_order
FROM products
WHERE gambar_depan IS NOT NULL AND gambar_depan <> ''

UNION ALL

SELECT
  product_id,
  gambar_kanan,
  'legacy-right.jpg',
  'image/jpeg',
  1
FROM products
WHERE gambar_kanan IS NOT NULL AND gambar_kanan <> ''

UNION ALL

SELECT
  product_id,
  gambar_kiri,
  'legacy-left.jpg',
  'image/jpeg',
  2
FROM products
WHERE gambar_kiri IS NOT NULL AND gambar_kiri <> ''

UNION ALL

SELECT
  product_id,
  gambar_belakang,
  'legacy-back.jpg',
  'image/jpeg',
  3
FROM products
WHERE gambar_belakang IS NOT NULL AND gambar_belakang <> '';

-- ── STEP 4: Drop legacy image columns from products ───────────────────────────

ALTER TABLE products
  DROP COLUMN IF EXISTS gambar_depan,
  DROP COLUMN IF EXISTS gambar_kanan,
  DROP COLUMN IF EXISTS gambar_kiri,
  DROP COLUMN IF EXISTS gambar_belakang;

-- ── STEP 5: Verify ────────────────────────────────────────────────────────────

-- SELECT p.product_id, p.nama_produk, COUNT(pi.id) AS image_count
-- FROM products p
-- LEFT JOIN product_images pi ON pi.product_id = p.product_id
-- GROUP BY p.product_id, p.nama_produk
-- ORDER BY image_count DESC
-- LIMIT 10;

COMMIT;
