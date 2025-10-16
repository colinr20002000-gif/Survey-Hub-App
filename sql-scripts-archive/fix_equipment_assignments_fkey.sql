-- Fix equipment assignments foreign key constraint to support both users and dummy_users
-- Run this in your Supabase SQL editor

-- Option 1: Create a unified users view and use that for the foreign key
-- This is the cleanest approach for PostgreSQL

-- First, drop the existing foreign key constraint
ALTER TABLE equipment_assignments
DROP CONSTRAINT IF EXISTS equipment_assignments_user_id_fkey;

-- Create a view that combines both users and dummy_users
CREATE OR REPLACE VIEW all_users AS
SELECT
    id,
    name,
    email,
    department,
    false as is_dummy
FROM users
UNION ALL
SELECT
    id,
    name,
    email,
    department,
    true as is_dummy
FROM dummy_users
WHERE is_active = true;

-- Since we can't use views for foreign keys, we'll use triggers instead
-- Create a function to validate user_id exists in either table
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

-- Create triggers for INSERT and UPDATE
CREATE OR REPLACE TRIGGER equipment_assignments_user_id_trigger
    BEFORE INSERT OR UPDATE ON equipment_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_id();

-- Add an index to improve performance
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_user_id ON equipment_assignments(user_id);