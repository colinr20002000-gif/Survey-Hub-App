-- Add SHOW_VEHICLE_SUMMARY_MANAGE_BUTTON permission
-- This controls the visibility of the "Manage" button on the Vehicle Summary page
-- Aligns with the Privilege Overview UI

DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    -- Check if privilege_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (
                priv_level, 
                'SHOW_VEHICLE_SUMMARY_MANAGE_BUTTON', 
                'Show Manage Button', 
                'Vehicles - Vehicle Summary', 
                (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 
                1350
            )
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

        END LOOP;
    END IF;

    -- Also check if privilege_permission_defaults table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permission_defaults') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            
            INSERT INTO privilege_permission_defaults (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (
                priv_level, 
                'SHOW_VEHICLE_SUMMARY_MANAGE_BUTTON', 
                'Show Manage Button', 
                'Vehicles - Vehicle Summary', 
                (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 
                1350
            )
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

        END LOOP;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
