-- ============================================================
-- 014_storage_policies.sql
-- Phase: Storage RLS Policies
--
-- Enables RLS on storage.objects and sets up policies for the
-- 'product-images' bucket, allowing authenticated users with the
-- admin role to upload, copy, delete, and read files.
-- ============================================================

-- Ensure the 'product-images' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow authenticated select for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for product-images" ON storage.objects;

-- 1. SELECT: Allow authenticated users in the admin table to read files
CREATE POLICY "Allow authenticated select for product-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND is_authenticated_user());

-- 2. INSERT: Allow authenticated users in the admin table to upload new files
CREATE POLICY "Allow authenticated insert for product-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND is_authenticated_user());

-- 3. UPDATE: Allow authenticated users in the admin table to update (copy/move) files
CREATE POLICY "Allow authenticated update for product-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_authenticated_user());

-- 4. DELETE: Allow authenticated users in the admin table to delete files
CREATE POLICY "Allow authenticated delete for product-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND is_authenticated_user());
