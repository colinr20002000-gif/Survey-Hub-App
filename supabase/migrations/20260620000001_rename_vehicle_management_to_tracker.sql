-- Rename "Vehicles - Vehicle Management" category to "Vehicles - Vehicle Tracker"
-- Aligns database permission configurations with the new sidebar/UI name

DO $$
BEGIN
    -- Update privilege_permissions table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        UPDATE privilege_permissions 
        SET permission_category = 'Vehicles - Vehicle Tracker' 
        WHERE permission_category = 'Vehicles - Vehicle Management';
    END IF;

    -- Update privilege_permission_defaults table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permission_defaults') THEN
        UPDATE privilege_permission_defaults 
        SET permission_category = 'Vehicles - Vehicle Tracker' 
        WHERE permission_category = 'Vehicles - Vehicle Management';
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
