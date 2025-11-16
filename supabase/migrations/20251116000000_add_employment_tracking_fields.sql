-- Migration: Add employment tracking fields to users and dummy_users tables
-- Purpose: Track employee hire dates and termination dates to properly filter resource calendar
-- Date: 2025-11-16

-- =============================================
-- Add employment tracking columns to users table
-- =============================================

-- Add hire_date column (when the employee started)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Add termination_date column (when the employee left, NULL for active employees)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add employment_status column for easier filtering
ALTER TABLE users
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'terminated'));

-- Add comments for documentation
COMMENT ON COLUMN users.hire_date IS 'Date when the employee started working';
COMMENT ON COLUMN users.termination_date IS 'Date when the employee left (NULL for current employees)';
COMMENT ON COLUMN users.employment_status IS 'Employment status: active or terminated';

-- Create index for faster queries filtering by employment dates
CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users(hire_date);
CREATE INDEX IF NOT EXISTS idx_users_termination_date ON users(termination_date);
CREATE INDEX IF NOT EXISTS idx_users_employment_status ON users(employment_status);

-- =============================================
-- Add employment tracking columns to dummy_users table
-- =============================================

-- Add hire_date column
ALTER TABLE dummy_users
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Add termination_date column
ALTER TABLE dummy_users
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add employment_status column
ALTER TABLE dummy_users
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'terminated'));

-- Add comments for documentation
COMMENT ON COLUMN dummy_users.hire_date IS 'Date when the employee started working';
COMMENT ON COLUMN dummy_users.termination_date IS 'Date when the employee left (NULL for current employees)';
COMMENT ON COLUMN dummy_users.employment_status IS 'Employment status: active or terminated';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dummy_users_hire_date ON dummy_users(hire_date);
CREATE INDEX IF NOT EXISTS idx_dummy_users_termination_date ON dummy_users(termination_date);
CREATE INDEX IF NOT EXISTS idx_dummy_users_employment_status ON dummy_users(employment_status);

-- =============================================
-- Set default values for existing users
-- =============================================

-- Set all existing users to 'active' status if not already set
UPDATE users
SET employment_status = 'active'
WHERE employment_status IS NULL;

UPDATE dummy_users
SET employment_status = 'active'
WHERE employment_status IS NULL;

-- =============================================
-- Add trigger to automatically set employment_status
-- =============================================

-- Create or replace function to automatically update employment status
CREATE OR REPLACE FUNCTION update_employment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If termination_date is set, mark as terminated
    IF NEW.termination_date IS NOT NULL THEN
        NEW.employment_status := 'terminated';
    -- If termination_date is cleared, mark as active
    ELSIF NEW.termination_date IS NULL THEN
        NEW.employment_status := 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table
DROP TRIGGER IF EXISTS trigger_update_users_employment_status ON users;
CREATE TRIGGER trigger_update_users_employment_status
    BEFORE INSERT OR UPDATE OF termination_date ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_employment_status();

-- Add trigger to dummy_users table
DROP TRIGGER IF EXISTS trigger_update_dummy_users_employment_status ON dummy_users;
CREATE TRIGGER trigger_update_dummy_users_employment_status
    BEFORE INSERT OR UPDATE OF termination_date ON dummy_users
    FOR EACH ROW
    EXECUTE FUNCTION update_employment_status();
