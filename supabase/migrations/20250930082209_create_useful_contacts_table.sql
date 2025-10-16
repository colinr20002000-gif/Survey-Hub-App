-- Create useful_contacts table
CREATE TABLE IF NOT EXISTS useful_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    email TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster name searches
CREATE INDEX IF NOT EXISTS idx_useful_contacts_name ON useful_contacts(name);

-- Add RLS policies
ALTER TABLE useful_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read useful contacts" ON useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert useful contacts" ON useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to update useful contacts" ON useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete useful contacts" ON useful_contacts;

-- Policy: Allow authenticated users to read all contacts
CREATE POLICY "Allow authenticated users to read useful contacts"
    ON useful_contacts
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert contacts
CREATE POLICY "Allow authenticated users to insert useful contacts"
    ON useful_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update contacts
CREATE POLICY "Allow authenticated users to update useful contacts"
    ON useful_contacts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete contacts
CREATE POLICY "Allow authenticated users to delete useful contacts"
    ON useful_contacts
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comment to describe the table
COMMENT ON TABLE useful_contacts IS 'Stores manually added useful contacts';