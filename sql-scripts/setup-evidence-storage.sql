-- Create the storage bucket for evidence if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects usually has RLS enabled by default in Supabase. 
-- Skipping ALTER TABLE to avoid ownership errors (Error 42501).

-- Drop existing policies to ensure clean creation (idempotency)
DROP POLICY IF EXISTS "Public Access Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete evidence" ON storage.objects;

-- Policy: Allow public read access to files in the bucket
CREATE POLICY "Public Access Evidence"
ON storage.objects FOR SELECT
USING ( bucket_id = 'evidence' );

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update files
CREATE POLICY "Authenticated users can update evidence"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete evidence"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
);