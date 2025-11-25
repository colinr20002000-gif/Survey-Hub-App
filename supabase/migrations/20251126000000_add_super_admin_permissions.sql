-- ============================================================================
-- ADD SUPER ADMIN PRIVILEGE LEVEL TO PERMISSIONS SYSTEM
-- ============================================================================
-- PURPOSE: Add Super Admin privilege level to all existing permissions
--          Ensures complete permission sets for all 6 privilege levels
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Super Admin privilege level to all existing permissions
-- ============================================================================

DO $$
DECLARE
    perm_record RECORD;
    rows_inserted INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ADDING SUPER ADMIN PRIVILEGE LEVEL';
    RAISE NOTICE '============================================================';

    -- Loop through all unique permissions from Admin level
    FOR perm_record IN
        SELECT DISTINCT
            permission_key,
            permission_label,
            permission_category,
            display_order
        FROM privilege_permissions
        WHERE privilege_level = 'Admin'
        ORDER BY display_order
    LOOP
        -- Insert Super Admin permission (granted by default)
        INSERT INTO privilege_permissions (
            permission_key,
            privilege_level,
            is_granted,
            permission_label,
            permission_category,
            display_order,
            created_at,
            updated_at
        )
        VALUES (
            perm_record.permission_key,
            'Super Admin',
            true,  -- Super Admin has all permissions by default
            perm_record.permission_label,
            perm_record.permission_category,
            perm_record.display_order,
            NOW(),
            NOW()
        )
        ON CONFLICT (permission_key, privilege_level) DO UPDATE
        SET
            is_granted = true,  -- Ensure Super Admin always has permission
            updated_at = NOW();

        rows_inserted := rows_inserted + 1;
    END LOOP;

    RAISE NOTICE 'Super Admin permissions added: %', rows_inserted;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Add MANAGE_SYSTEM_SETTINGS permission (Super Admin exclusive)
-- ============================================================================

DO $$
DECLARE
    rows_inserted INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ADDING MANAGE_SYSTEM_SETTINGS PERMISSION';
    RAISE NOTICE '============================================================';

    -- Add MANAGE_SYSTEM_SETTINGS for all privilege levels
    -- Only Super Admin has this permission granted
    INSERT INTO privilege_permissions (
        permission_key,
        privilege_level,
        is_granted,
        permission_label,
        permission_category,
        display_order,
        created_at,
        updated_at
    )
    SELECT
        'MANAGE_SYSTEM_SETTINGS',
        level,
        CASE WHEN level = 'Super Admin' THEN true ELSE false END,
        'Manage System Settings',
        'Admin Access',
        999,  -- High display order so it appears last
        NOW(),
        NOW()
    FROM (
        VALUES
            ('Viewer'),
            ('Viewer+'),
            ('Editor'),
            ('Editor+'),
            ('Admin'),
            ('Super Admin')
    ) AS privilege_levels(level)
    ON CONFLICT (permission_key, privilege_level) DO UPDATE
    SET
        is_granted = EXCLUDED.is_granted,
        updated_at = NOW();

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'MANAGE_SYSTEM_SETTINGS permission added for % privilege levels', rows_inserted;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Verify all privilege levels have complete permission sets
-- ============================================================================

DO $$
DECLARE
    viewer_count INTEGER;
    viewer_plus_count INTEGER;
    editor_count INTEGER;
    editor_plus_count INTEGER;
    admin_count INTEGER;
    super_admin_count INTEGER;
    unique_perms INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'VERIFICATION: Permission counts per privilege level';
    RAISE NOTICE '============================================================';

    -- Get counts for each privilege level
    SELECT COUNT(*) INTO viewer_count
    FROM privilege_permissions WHERE privilege_level = 'Viewer';

    SELECT COUNT(*) INTO viewer_plus_count
    FROM privilege_permissions WHERE privilege_level = 'Viewer+';

    SELECT COUNT(*) INTO editor_count
    FROM privilege_permissions WHERE privilege_level = 'Editor';

    SELECT COUNT(*) INTO editor_plus_count
    FROM privilege_permissions WHERE privilege_level = 'Editor+';

    SELECT COUNT(*) INTO admin_count
    FROM privilege_permissions WHERE privilege_level = 'Admin';

    SELECT COUNT(*) INTO super_admin_count
    FROM privilege_permissions WHERE privilege_level = 'Super Admin';

    -- Get unique permission count
    SELECT COUNT(DISTINCT permission_key) INTO unique_perms
    FROM privilege_permissions;

    RAISE NOTICE 'Unique permissions: %', unique_perms;
    RAISE NOTICE 'Viewer: % permissions', viewer_count;
    RAISE NOTICE 'Viewer+: % permissions', viewer_plus_count;
    RAISE NOTICE 'Editor: % permissions', editor_count;
    RAISE NOTICE 'Editor+: % permissions', editor_plus_count;
    RAISE NOTICE 'Admin: % permissions', admin_count;
    RAISE NOTICE 'Super Admin: % permissions', super_admin_count;
    RAISE NOTICE '';

    -- Check if all levels have same count
    IF viewer_count = viewer_plus_count
       AND viewer_plus_count = editor_count
       AND editor_count = editor_plus_count
       AND editor_plus_count = admin_count
       AND admin_count = super_admin_count
       AND super_admin_count = unique_perms THEN
        RAISE NOTICE '✓ All privilege levels have complete permission sets';
    ELSE
        RAISE WARNING '⚠ Permission counts differ across privilege levels';
        RAISE WARNING 'Expected each level to have % permissions', unique_perms;
    END IF;

    RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- STEP 4: Show sample of Super Admin permissions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SUPER ADMIN SAMPLE PERMISSIONS (first 10):';
    RAISE NOTICE '============================================================';
END $$;

SELECT
    permission_key,
    permission_label,
    permission_category,
    is_granted
FROM privilege_permissions
WHERE privilege_level = 'Super Admin'
ORDER BY display_order
LIMIT 10;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SUPER ADMIN MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ Super Admin privilege level added to all permissions';
    RAISE NOTICE '  ✓ MANAGE_SYSTEM_SETTINGS permission created';
    RAISE NOTICE '  ✓ All 6 privilege levels verified';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run migration 20251126000001 (audit trail)';
    RAISE NOTICE '  2. Run migration 20251126000002 (permission defaults)';
    RAISE NOTICE '============================================================';
END $$;
