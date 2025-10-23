-- Create a table to store policy documents directly in the database
-- This bypasses Supabase storage completely to avoid memory issues

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

-- Allow authenticated users to read documents
CREATE POLICY "Enable read access for authenticated users" ON policy_documents_db
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin users to manage documents
CREATE POLICY "Enable all access for admin users" ON policy_documents_db
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.jwt() ->> 'sub'
    AND users.privilege IN ('Admin', 'Super Admin')
  )
);

-- Create indexes for performance
CREATE INDEX idx_policy_documents_db_file_name ON policy_documents_db(file_name);
CREATE INDEX idx_policy_documents_db_uploaded_at ON policy_documents_db(uploaded_at);

-- Comment
COMMENT ON TABLE policy_documents_db IS 'Policy documents stored directly in database to bypass storage memory limits';