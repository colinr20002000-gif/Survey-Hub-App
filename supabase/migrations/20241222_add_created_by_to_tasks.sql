-- SQL script to add created_by field to both delivery_tasks and project_tasks tables
-- This will track who created each task

-- Add created_by column to delivery_tasks table (if not exists)
ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add created_by column to project_tasks table (if not exists)
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance on created_by lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_created_by ON delivery_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON project_tasks(created_by);

-- Update existing tasks to set created_by to the first admin user (for existing data)
-- You can modify this query to set a specific user ID for existing tasks
UPDATE delivery_tasks SET created_by = (
    SELECT id FROM users WHERE privilege = 'Admin' LIMIT 1
) WHERE created_by IS NULL;

UPDATE project_tasks SET created_by = (
    SELECT id FROM users WHERE privilege = 'Admin' LIMIT 1
) WHERE created_by IS NULL;