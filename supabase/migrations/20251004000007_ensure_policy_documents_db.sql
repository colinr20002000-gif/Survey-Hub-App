-- Ensure policy_documents_db table exists with proper RLS policies

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS policy_documents_db (
  id bigint primary key generated always as identity,
  file_name text not null,
  content_type text not null,
  file_size integer not null,
  file_data text not null, -- base64 encoded file content
  uploaded_at timestamptz default now() not null,
  created_by uuid references auth.users(id) default auth.uid()
);

-- Enable Row Level Security
ALTER TABLE policy_documents_db ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "policy_documents_db_select_authenticated" ON policy_documents_db;
DROP POLICY IF EXISTS "policy_documents_db_manage_admin" ON policy_documents_db;

-- Create policy for all authenticated users to read
CREATE POLICY "policy_documents_db_select_authenticated" ON policy_documents_db
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy for admins to insert/update/delete
CREATE POLICY "policy_documents_db_manage_admin" ON policy_documents_db
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.privilege IN ('Admin', 'Super Admin')
  )
);

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_policy_documents_db_file_name ON policy_documents_db(file_name);
CREATE INDEX IF NOT EXISTS idx_policy_documents_db_uploaded_at ON policy_documents_db(uploaded_at);

-- Add comment
COMMENT ON TABLE policy_documents_db IS 'Policy documents stored directly in database to bypass storage memory limits';
