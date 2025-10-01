-- Fix both equipment and vehicle assignments foreign key constraints to support dummy users
-- Run this in your Supabase SQL editor

-- ==================================================
-- EQUIPMENT ASSIGNMENTS FIX
-- ==================================================

-- Drop the existing foreign key constraint for equipment assignments
ALTER TABLE equipment_assignments
DROP CONSTRAINT IF EXISTS equipment_assignments_user_id_fkey;

-- Create a function to validate user_id exists in either users or dummy_users table
CREATE OR REPLACE FUNCTION validate_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user_id exists in users table
    IF EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;

    -- Check if user_id exists in active dummy_users table
    IF EXISTS (SELECT 1 FROM dummy_users WHERE id = NEW.user_id AND is_active = true) THEN
        RETURN NEW;
    END IF;

    -- If user_id doesn't exist in either table, raise an error
    RAISE EXCEPTION 'User ID % does not exist in users or active dummy_users', NEW.user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for equipment assignments
CREATE OR REPLACE TRIGGER equipment_assignments_user_id_trigger
    BEFORE INSERT OR UPDATE ON equipment_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_id();

-- ==================================================
-- VEHICLE ASSIGNMENTS FIX
-- ==================================================

-- Drop the existing foreign key constraint for vehicle assignments
ALTER TABLE vehicle_assignments
DROP CONSTRAINT IF EXISTS vehicle_assignments_user_id_fkey;

-- Create trigger for vehicle assignments (using the same validation function)
CREATE OR REPLACE TRIGGER vehicle_assignments_user_id_trigger
    BEFORE INSERT OR UPDATE ON vehicle_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_id();

-- ==================================================
-- PERFORMANCE INDEXES
-- ==================================================

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_user_id ON equipment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_user_id ON vehicle_assignments(user_id);

-- ==================================================
-- UNIFIED VIEW (OPTIONAL - FOR FUTURE USE)
-- ==================================================

-- Create a view that combines both users and dummy_users for easier querying
CREATE OR REPLACE VIEW all_users AS
SELECT
    id,
    name,
    email,
    department,
    false as is_dummy,
    'real' as user_type
FROM users
UNION ALL
SELECT
    id,
    name,
    email,
    department,
    true as is_dummy,
    'dummy' as user_type
FROM dummy_users
WHERE is_active = true;

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================

-- This will display a success message when the script completes
SELECT 'Both equipment and vehicle assignments now support dummy users!' as status;