-- ============================================================
-- 018_worker_profiles_storage.sql
-- Phase: Storage & Worker Profile Photos RLS Policies
--
-- 1. Sets up the 'worker-profiles' storage bucket.
-- 2. Sets up RLS policies for the 'worker-profiles' bucket.
-- ============================================================

-- Ensure the 'worker-profiles' bucket exists with public read
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-profiles', 'worker-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Public Read worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete worker-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read worker profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload worker profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update worker profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete worker profiles" ON storage.objects;

-- 1. SELECT: Public Read (bucket_id = 'worker-profiles')
CREATE POLICY "Public Read worker-profiles"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'worker-profiles');

-- 2. INSERT: Allow Upload for anon & authenticated roles
CREATE POLICY "Allow Upload worker-profiles"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'worker-profiles');

-- 3. UPDATE: Allow Update for anon & authenticated roles
CREATE POLICY "Allow Update worker-profiles"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'worker-profiles')
  WITH CHECK (bucket_id = 'worker-profiles');

-- 4. DELETE: Allow Delete for anon & authenticated roles
CREATE POLICY "Allow Delete worker-profiles"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'worker-profiles');

