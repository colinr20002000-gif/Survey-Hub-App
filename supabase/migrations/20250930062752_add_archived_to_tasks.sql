-- Add archived column to project_tasks table
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add archived column to delivery_tasks table
ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for archived field on project_tasks for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_tasks_archived ON project_tasks(archived);

-- Add index for archived field on delivery_tasks for faster filtering
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_archived ON delivery_tasks(archived);

-- Add comment to describe the columns
COMMENT ON COLUMN project_tasks.archived IS 'Whether the project task has been archived';
COMMENT ON COLUMN delivery_tasks.archived IS 'Whether the delivery task has been archived';