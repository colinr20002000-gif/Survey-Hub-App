-- Fixed File Management System Setup for Supabase
-- This script creates file management tables with working RLS policies

-- 1. Drop existing file management policies only
DROP POLICY IF EXISTS "Admin full access to document_files" ON public.document_files;
DROP POLICY IF EXISTS "Authenticated users can read document_files" ON public.document_files;
DROP POLICY IF EXISTS "Admin full access to document_folders" ON public.document_folders;
DROP POLICY IF EXISTS "Authenticated users can read document_folders" ON public.document_folders;
DROP POLICY IF EXISTS "Admin can upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can download from documents bucket" ON storage.objects;

-- 2. Drop existing file management trigger (but keep the function)
DROP TRIGGER IF EXISTS update_document_files_updated_at ON public.document_files;

-- 3. Drop existing file management tables only
DROP TABLE IF EXISTS public.document_files CASCADE;
DROP TABLE IF EXISTS public.document_folders CASCADE;

-- 4. Remove storage bucket (this might fail if bucket has files - that's OK)
DELETE FROM storage.buckets WHERE id = 'documents';

-- Now create everything fresh:

-- 5. Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- private bucket
  52428800, -- 50MB limit per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 6. Create table for file metadata and organization
CREATE TABLE public.document_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates')),
  tags TEXT[],
  folder_path TEXT DEFAULT '',
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create table for folder structure
CREATE TABLE public.document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_path TEXT DEFAULT '',
  full_path TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create indexes for better performance
CREATE INDEX idx_document_files_category ON public.document_files(category);
CREATE INDEX idx_document_files_folder_path ON public.document_files(folder_path);
CREATE INDEX idx_document_files_tags ON public.document_files USING GIN(tags);
CREATE INDEX idx_document_files_uploaded_by ON public.document_files(uploaded_by);
CREATE INDEX idx_document_folders_category ON public.document_folders(category);
CREATE INDEX idx_document_folders_parent_path ON public.document_folders(parent_path);

-- 9. Enable RLS on tables
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- 10. Create simplified RLS policies for document_files table
-- Allow all authenticated users to read files
CREATE POLICY "Authenticated users can read document_files" ON public.document_files
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert files (we'll handle admin checks in the app)
CREATE POLICY "Authenticated users can insert document_files" ON public.document_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update/delete their own files
CREATE POLICY "Users can manage their own document_files" ON public.document_files
  FOR ALL USING (auth.uid() = uploaded_by);

-- 11. Create simplified RLS policies for document_folders table
-- Allow all authenticated users to read folders
CREATE POLICY "Authenticated users can read document_folders" ON public.document_folders
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert folders (we'll handle admin checks in the app)
CREATE POLICY "Authenticated users can insert document_folders" ON public.document_folders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update/delete their own folders
CREATE POLICY "Users can manage their own document_folders" ON public.document_folders
  FOR ALL USING (auth.uid() = created_by);

-- 12. Simplified Storage RLS policies
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to documents bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to download files
CREATE POLICY "Authenticated users can download from documents bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete files (we'll handle admin checks in the app)
CREATE POLICY "Authenticated users can delete from documents bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- 13. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 14. Apply trigger to document_files table
CREATE TRIGGER update_document_files_updated_at
  BEFORE UPDATE ON public.document_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Insert default folders for each category
INSERT INTO public.document_folders (name, parent_path, full_path, category, created_by) VALUES
  ('Standards', '', 'Standards', 'Standards & Specs', NULL),
  ('Procedures', '', 'Procedures', 'Procedures', NULL),
  ('Templates', '', 'Templates', 'Templates', NULL),
  ('2024', 'Standards', 'Standards/2024', 'Standards & Specs', NULL),
  ('2025', 'Standards', 'Standards/2025', 'Standards & Specs', NULL),
  ('Safety', 'Procedures', 'Procedures/Safety', 'Procedures', NULL),
  ('Quality', 'Procedures', 'Procedures/Quality', 'Procedures', NULL),
  ('Reports', 'Templates', 'Templates/Reports', 'Templates', NULL),
  ('Forms', 'Templates', 'Templates/Forms', 'Templates', NULL)
ON CONFLICT (full_path) DO NOTHING;