-- Create document_folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_path TEXT,
    full_path TEXT NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_folders_category ON document_folders(category);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_path ON document_folders(parent_path);
CREATE INDEX IF NOT EXISTS idx_document_folders_full_path ON document_folders(full_path);

-- Enable RLS (Row Level Security)
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read all folders
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read folders" ON document_folders
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert folders
CREATE POLICY IF NOT EXISTS "Allow authenticated users to create folders" ON document_folders
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update folders they created
CREATE POLICY IF NOT EXISTS "Allow users to update their folders" ON document_folders
    FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Allow authenticated users to delete folders they created
CREATE POLICY IF NOT EXISTS "Allow users to delete their folders" ON document_folders
    FOR DELETE TO authenticated USING (created_by = auth.uid());