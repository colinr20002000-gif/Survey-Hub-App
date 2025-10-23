-- Add year column to projects table
-- Run this SQL in the Supabase SQL editor

-- Add the year column to the projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS year TEXT;

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;