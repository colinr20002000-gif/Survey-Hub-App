-- Add archived column to project_tasks table
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add archived column to delivery_tasks table
ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_tasks_archived ON project_tasks(archived);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_archived ON delivery_tasks(archived);

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'project_tasks' AND column_name = 'archived';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'delivery_tasks' AND column_name = 'archived';