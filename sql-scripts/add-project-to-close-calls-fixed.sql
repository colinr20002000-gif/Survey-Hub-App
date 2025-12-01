-- Add project_id to close_calls table
-- Using BIGINT for project_id because the 'projects' table uses BIGINT/SERIAL for its 'id' column, not UUID.

ALTER TABLE close_calls
ADD COLUMN IF NOT EXISTS project_id BIGINT REFERENCES projects(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_close_calls_project_id ON close_calls(project_id);
