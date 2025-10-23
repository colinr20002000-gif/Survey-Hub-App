-- Add competencies column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS competencies TEXT;

-- Add competencies column to dummy_users table
ALTER TABLE dummy_users ADD COLUMN IF NOT EXISTS competencies TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN users.competencies IS 'Comma-separated list of user competencies';
COMMENT ON COLUMN dummy_users.competencies IS 'Comma-separated list of dummy user competencies';