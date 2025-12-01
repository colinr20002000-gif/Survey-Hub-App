-- Add project_name column to close_calls for manual overrides
ALTER TABLE close_calls
ADD COLUMN IF NOT EXISTS project_name TEXT;
