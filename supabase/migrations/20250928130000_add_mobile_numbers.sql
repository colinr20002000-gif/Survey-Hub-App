-- Add mobile number column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);

-- Add mobile number column to dummy_users table
ALTER TABLE dummy_users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);

-- Create indexes for mobile number searches
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_dummy_users_mobile_number ON dummy_users(mobile_number);