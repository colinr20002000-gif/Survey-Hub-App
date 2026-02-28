-- =========================================================
-- ADD TIMESHEET VIEW PERMISSIONS
-- Adds specific view permissions for all four timesheet sub-items
-- to allow fine-grained access control in Privilege Overview
-- =========================================================

DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    -- Check if privilege_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            
            -- 1. VIEW_WEEKLY_ENTRY (Everyone by default)
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (priv_level, 'VIEW_WEEKLY_ENTRY', 'View Weekly Entry', 'View Access', true, 26)
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

            -- 2. VIEW_TEAM_OVERVIEW (Editor and above by default)
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (
                priv_level, 
                'VIEW_TEAM_OVERVIEW', 
                'View Team Overview', 
                'View Access', 
                (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 
                27
            )
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

            -- 3. VIEW_APPROVALS (Everyone by default - but logic in page restricts to Line Managers)
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (priv_level, 'VIEW_APPROVALS', 'View Approvals', 'View Access', true, 28)
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

            -- 4. VIEW_TIMESHEET_TASKS (Editor and above by default)
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (
                priv_level, 
                'VIEW_TIMESHEET_TASKS', 
                'View Timesheet Tasks', 
                'View Access', 
                (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 
                29
            )
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

            -- 5. MANAGE_TIMESHEET_TASKS (Editor and above by default)
            -- Updating label and category to be consistent
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (
                priv_level, 
                'MANAGE_TIMESHEET_TASKS', 
                'Manage Timesheet Tasks', 
                'Timesheets', 
                (priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin')), 
                1300
            )
            ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET permission_label = EXCLUDED.permission_label, 
                permission_category = EXCLUDED.permission_category, 
                display_order = EXCLUDED.display_order;

        END LOOP;
    END IF;
END $$;

-- 6. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
