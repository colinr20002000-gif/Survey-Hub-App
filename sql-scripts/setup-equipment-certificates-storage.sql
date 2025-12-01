-- Create the storage bucket for equipment certificates if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-certificates', 'equipment-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (standard procedure, usually already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to files in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'equipment-certificates' );

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update/delete their own files (or all files if desired for team)
-- For simplicity in this app, we'll allow authenticated users to update/delete files in this bucket
CREATE POLICY "Authenticated users can update certificates"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'equipment-certificates'
    AND auth.role() = 'authenticated'
);
