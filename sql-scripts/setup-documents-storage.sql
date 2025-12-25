-- Create the 'documents' bucket for announcements and other files
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'documents' bucket

-- 1. Allow public read access to all files in the 'documents' bucket
-- This is necessary so users can download attachments
DROP POLICY IF EXISTS "Documents Public Read Access" ON storage.objects;
CREATE POLICY "Documents Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

-- 2. Allow authenticated users to upload files
-- This is required for creating announcements with attachments
DROP POLICY IF EXISTS "Documents Upload Access" ON storage.objects;
CREATE POLICY "Documents Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users to update their own files (or all for now to be simple)
DROP POLICY IF EXISTS "Documents Update Access" ON storage.objects;
CREATE POLICY "Documents Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to delete files
-- Needed when removing an attachment or deleting an announcement
DROP POLICY IF EXISTS "Documents Delete Access" ON storage.objects;
CREATE POLICY "Documents Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
);
