-- Add archived column to projects table
-- Run this SQL in the Supabase SQL editor

-- Add the archived column to the projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Update existing projects to set archived = false by default
UPDATE projects SET archived = false WHERE archived IS NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;