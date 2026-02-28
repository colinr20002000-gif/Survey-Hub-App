-- =========================================================
-- ADD VIEW_ALL_APPROVALS PERMISSION
-- Registers the new VIEW_ALL_APPROVALS permission in the 
-- dynamic permission system.
-- =========================================================

DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Admin', 'Super Admin'];
BEGIN
    -- Check if privilege_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            -- Global View Access for Approvals
            INSERT INTO privilege_permissions (
                privilege_level, permission_key, permission_label, 
                permission_category, is_granted, display_order
            ) VALUES (
                priv_level, 'VIEW_ALL_APPROVALS', 'View All Staff Approvals', 
                'Admin', true, 35
            ) ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET is_granted = EXCLUDED.is_granted,
                permission_category = EXCLUDED.permission_category,
                display_order = EXCLUDED.display_order;
        END LOOP;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
