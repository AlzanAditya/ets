-- ============================================================
-- 014_storage_policies.sql
-- Phase: Storage & Product Images RLS Policies
--
-- 1. Sets up the 'product-images' storage bucket and its policies.
-- 2. Sets up RLS policies for the 'product_images' table.
-- ============================================================

-- ── PART 1: Supabase Storage Policies ─────────────────────────

-- Ensure the 'product-images' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow authenticated select for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete for product-images" ON storage.objects;

-- 1. SELECT: Allow authenticated users in the admin table to read files
CREATE POLICY "Allow authenticated select for product-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));

-- 2. INSERT: Allow authenticated users in the admin table to upload new files
CREATE POLICY "Allow authenticated insert for product-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));

-- 3. UPDATE: Allow authenticated users in the admin table to update (copy/move) files
CREATE POLICY "Allow authenticated update for product-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));

-- 4. DELETE: Allow authenticated users in the admin table to delete files
CREATE POLICY "Allow authenticated delete for product-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));


-- ── PART 2: Product Images Table Policies ─────────────────────

-- Enable RLS on product_images (if not already enabled)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "product_images_select_public" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_admin" ON public.product_images;
DROP POLICY IF EXISTS "product_images_update_admin" ON public.product_images;
DROP POLICY IF EXISTS "product_images_delete_admin" ON public.product_images;

-- 1. SELECT: Allow anyone (anon and authenticated) to view product images
CREATE POLICY "product_images_select_public"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. INSERT: Allow authenticated users in the admins table to insert images
CREATE POLICY "product_images_insert_admin"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));

-- 3. UPDATE: Allow authenticated users in the admins table to update images (e.g. sort order)
CREATE POLICY "product_images_update_admin"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));

-- 4. DELETE: Allow authenticated users in the admins table to delete images
CREATE POLICY "product_images_delete_admin"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND deleted_at IS NULL
  ));
