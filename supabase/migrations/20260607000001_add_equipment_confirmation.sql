-- Add equipment assignment confirmation fields to users and dummy_users tables
-- This allows users to confirm their assigned equipment is up to date

-- 1. Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment_confirmed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment_confirmed_by_name TEXT;

-- 2. Add columns to dummy_users table
ALTER TABLE dummy_users ADD COLUMN IF NOT EXISTS equipment_confirmed_at TIMESTAMPTZ;
ALTER TABLE dummy_users ADD COLUMN IF NOT EXISTS equipment_confirmed_by_name TEXT;

-- 3. Add comment for documentation
COMMENT ON COLUMN users.equipment_confirmed_at IS 'Timestamp when the user last confirmed their equipment assignments are up to date';
COMMENT ON COLUMN users.equipment_confirmed_by_name IS 'Name of the person who confirmed the equipment assignments';
COMMENT ON COLUMN dummy_users.equipment_confirmed_at IS 'Timestamp when the dummy user last confirmed their equipment assignments are up to date';
COMMENT ON COLUMN dummy_users.equipment_confirmed_by_name IS 'Name of the person who confirmed the equipment assignments';
