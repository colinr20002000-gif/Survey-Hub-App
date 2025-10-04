-- Fix RLS policies for policy_documents_db table
-- The existing policies may be blocking read access

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON policy_documents_db;
DROP POLICY IF EXISTS "Enable all access for admin users" ON policy_documents_db;

-- Create simplified policy for authenticated users to read
CREATE POLICY "policy_documents_db_select_authenticated" ON policy_documents_db
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy for admins to manage (insert, update, delete)
CREATE POLICY "policy_documents_db_manage_admin" ON policy_documents_db
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.privilege IN ('Admin', 'Super Admin')
  )
);
