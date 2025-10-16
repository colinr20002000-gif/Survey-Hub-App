-- Add pts_number column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pts_number TEXT;

-- Add pts_number column to dummy_users table
ALTER TABLE dummy_users ADD COLUMN IF NOT EXISTS pts_number TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN users.pts_number IS 'Personal Track Safety (PTS) number for the user';
COMMENT ON COLUMN dummy_users.pts_number IS 'Personal Track Safety (PTS) number for the dummy user';