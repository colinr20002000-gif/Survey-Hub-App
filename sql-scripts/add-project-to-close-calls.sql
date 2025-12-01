-- Add project_id to close_calls table
ALTER TABLE close_calls
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_close_calls_project_id ON close_calls(project_id);
