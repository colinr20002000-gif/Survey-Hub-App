-- Remove status column from projects table
-- Run this SQL in the Supabase SQL editor

-- Remove the status column from the projects table
ALTER TABLE projects DROP COLUMN IF EXISTS status;

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;