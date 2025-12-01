-- Create the storage bucket for equipment certificates if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-certificates', 'equipment-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Policies
-- Note: We skip ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY as it requires ownership privileges
-- and is usually enabled by default on Supabase.

-- Drop existing policies to avoid conflicts (and update definitions)
DROP POLICY IF EXISTS "Equipment Certificates Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Equipment Certificates Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Equipment Certificates Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Equipment Certificates Delete Access" ON storage.objects;

-- Policy: Allow public read access to files in the bucket
CREATE POLICY "Equipment Certificates Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'equipment-certificates' );

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Equipment Certificates Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update
CREATE POLICY "Equipment Certificates Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete
CREATE POLICY "Equipment Certificates Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);
