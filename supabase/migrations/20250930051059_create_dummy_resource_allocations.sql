-- Create dummy_resource_allocations table (same structure as resource_allocations but for dummy users)
CREATE TABLE IF NOT EXISTS dummy_resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES dummy_users(id) ON DELETE CASCADE,
    allocation_date DATE NOT NULL,
    assignment_type TEXT CHECK (assignment_type IN ('project', 'leave')),
    leave_type TEXT,
    comment TEXT,
    project_id UUID,
    project_number TEXT,
    project_name TEXT,
    client TEXT,
    task TEXT,
    shift TEXT,
    time TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on user_id and allocation_date for faster lookups
CREATE INDEX IF NOT EXISTS idx_dummy_resource_allocations_user_date
    ON dummy_resource_allocations(user_id, allocation_date);

-- Create index on allocation_date for date range queries
CREATE INDEX IF NOT EXISTS idx_dummy_resource_allocations_date
    ON dummy_resource_allocations(allocation_date);

-- Add RLS policies
ALTER TABLE dummy_resource_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read dummy allocations" ON dummy_resource_allocations;
DROP POLICY IF EXISTS "Allow authenticated users to insert dummy allocations" ON dummy_resource_allocations;
DROP POLICY IF EXISTS "Allow authenticated users to update dummy allocations" ON dummy_resource_allocations;
DROP POLICY IF EXISTS "Allow authenticated users to delete dummy allocations" ON dummy_resource_allocations;

-- Policy: Allow authenticated users to read all dummy allocations
CREATE POLICY "Allow authenticated users to read dummy allocations"
    ON dummy_resource_allocations
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert dummy allocations
CREATE POLICY "Allow authenticated users to insert dummy allocations"
    ON dummy_resource_allocations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update dummy allocations
CREATE POLICY "Allow authenticated users to update dummy allocations"
    ON dummy_resource_allocations
    FOR UPDATE
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to delete dummy allocations
CREATE POLICY "Allow authenticated users to delete dummy allocations"
    ON dummy_resource_allocations
    FOR DELETE
    TO authenticated
    USING (true);