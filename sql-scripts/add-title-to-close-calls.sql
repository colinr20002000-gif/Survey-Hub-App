-- Add title column to close_calls table
ALTER TABLE close_calls
ADD COLUMN IF NOT EXISTS title VARCHAR(255);
