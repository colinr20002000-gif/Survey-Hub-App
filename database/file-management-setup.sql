-- File Management System Setup for Supabase
-- This script sets up the storage bucket, tables, and RLS policies

-- 1. Create storage bucket for documents
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

-- 2. Create table for file metadata and organization
CREATE TABLE IF NOT EXISTS public.document_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL, -- path in storage bucket
  original_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates')),
  tags TEXT[], -- array of tags for searching
  folder_path TEXT DEFAULT '', -- folder structure like 'Standards/2025/Electrical'
  file_type TEXT NOT NULL, -- mime type
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table for folder structure
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_path TEXT DEFAULT '', -- parent folder path
  full_path TEXT NOT NULL UNIQUE, -- complete path like 'Standards/2025/Electrical'
  category TEXT NOT NULL CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_files_category ON public.document_files(category);
CREATE INDEX IF NOT EXISTS idx_document_files_folder_path ON public.document_files(folder_path);
CREATE INDEX IF NOT EXISTS idx_document_files_tags ON public.document_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_files_uploaded_by ON public.document_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_category ON public.document_folders(category);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_path ON public.document_folders(parent_path);

-- 5. Enable RLS on tables
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for document_files table

-- Policy for Admin/Super Admin users to do everything
CREATE POLICY "Admin full access to document_files" ON public.document_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'privilege' IN ('Admin', 'Super Admin')
    )
  );

-- Policy for all authenticated users to read files
CREATE POLICY "Authenticated users can read document_files" ON public.document_files
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Create RLS policies for document_folders table

-- Policy for Admin/Super Admin users to manage folders
CREATE POLICY "Admin full access to document_folders" ON public.document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'privilege' IN ('Admin', 'Super Admin')
    )
  );

-- Policy for all authenticated users to read folders
CREATE POLICY "Authenticated users can read document_folders" ON public.document_folders
  FOR SELECT USING (auth.role() = 'authenticated');

-- 8. Storage RLS policies

-- Policy for Admin/Super Admin to upload files
CREATE POLICY "Admin can upload to documents bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'privilege' IN ('Admin', 'Super Admin')
    )
  );

-- Policy for Admin/Super Admin to delete files
CREATE POLICY "Admin can delete from documents bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'privilege' IN ('Admin', 'Super Admin')
    )
  );

-- Policy for all authenticated users to download files
CREATE POLICY "Authenticated users can download from documents bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to document_files table
CREATE TRIGGER update_document_files_updated_at
  BEFORE UPDATE ON public.document_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Insert some default folders for each category
INSERT INTO public.document_folders (name, parent_path, full_path, category, created_by) VALUES
  ('Standards', '', 'Standards', 'Standards & Specs', '00000000-0000-0000-0000-000000000000'),
  ('Procedures', '', 'Procedures', 'Procedures', '00000000-0000-0000-0000-000000000000'),
  ('Templates', '', 'Templates', 'Templates', '00000000-0000-0000-0000-000000000000'),
  ('2024', 'Standards', 'Standards/2024', 'Standards & Specs', '00000000-0000-0000-0000-000000000000'),
  ('2025', 'Standards', 'Standards/2025', 'Standards & Specs', '00000000-0000-0000-0000-000000000000'),
  ('Safety', 'Procedures', 'Procedures/Safety', 'Procedures', '00000000-0000-0000-0000-000000000000'),
  ('Quality', 'Procedures', 'Procedures/Quality', 'Procedures', '00000000-0000-0000-0000-000000000000'),
  ('Reports', 'Templates', 'Templates/Reports', 'Templates', '00000000-0000-0000-0000-000000000000'),
  ('Forms', 'Templates', 'Templates/Forms', 'Templates', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (full_path) DO NOTHING;