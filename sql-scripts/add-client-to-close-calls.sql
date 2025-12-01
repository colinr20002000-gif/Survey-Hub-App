-- Add client column to close_calls table
ALTER TABLE close_calls
ADD COLUMN IF NOT EXISTS client VARCHAR(255);
