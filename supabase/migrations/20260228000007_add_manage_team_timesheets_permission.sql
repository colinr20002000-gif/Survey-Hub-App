-- =========================================================
-- ADD MANAGE_TEAM_TIMESHEETS PERMISSION
-- Registers the new MANAGE_TEAM_TIMESHEETS permission in the 
-- dynamic permission system.
-- =========================================================

DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    -- Check if privilege_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            -- Edit Team Timesheets (Editor and above by default)
            INSERT INTO privilege_permissions (
                privilege_level, permission_key, permission_label, 
                permission_category, is_granted, display_order
            ) VALUES (
                priv_level, 'MANAGE_TEAM_TIMESHEETS', 'Edit Team Timesheets', 
                'Timesheets', (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 30
            ) ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label,
                permission_category = EXCLUDED.permission_category,
                display_order = EXCLUDED.display_order;
        END LOOP;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
