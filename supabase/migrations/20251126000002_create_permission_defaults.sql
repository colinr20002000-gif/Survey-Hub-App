-- ============================================================================
-- CREATE PERMISSION DEFAULTS SYSTEM
-- ============================================================================
-- PURPOSE: Store factory default permissions for "Reset to Defaults" feature
--          Allows admins to restore privilege permissions to original state
-- ============================================================================

-- ============================================================================
-- STEP 1: Create privilege_permission_defaults table
-- ============================================================================

CREATE TABLE IF NOT EXISTS privilege_permission_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL,
    privilege_level TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL,
    permission_label TEXT NOT NULL,
    permission_category TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_default_perm UNIQUE (permission_key, privilege_level)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_permission_defaults_privilege_level
    ON privilege_permission_defaults(privilege_level);

CREATE INDEX IF NOT EXISTS idx_permission_defaults_category
    ON privilege_permission_defaults(permission_category);

CREATE INDEX IF NOT EXISTS idx_permission_defaults_key
    ON privilege_permission_defaults(permission_key);

-- ============================================================================
-- STEP 3: Snapshot current permissions as factory defaults
-- ============================================================================

DO $$
DECLARE
    rows_inserted INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CREATING PERMISSION DEFAULTS SNAPSHOT';
    RAISE NOTICE '============================================================';

    -- Insert all current permissions as defaults
    INSERT INTO privilege_permission_defaults (
        permission_key,
        privilege_level,
        is_granted,
        permission_label,
        permission_category,
        display_order,
        created_at
    )
    SELECT
        permission_key,
        privilege_level,
        is_granted,
        permission_label,
        permission_category,
        display_order,
        NOW()
    FROM privilege_permissions
    ON CONFLICT (permission_key, privilege_level) DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;

    RAISE NOTICE 'Default permissions snapshot created: % records', rows_inserted;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE privilege_permission_defaults ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

-- Policy: All authenticated users can view defaults
DROP POLICY IF EXISTS "Anyone can view defaults" ON privilege_permission_defaults;

CREATE POLICY "Anyone can view defaults"
    ON privilege_permission_defaults
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins can update defaults (for future maintenance)
DROP POLICY IF EXISTS "Admins can update defaults" ON privilege_permission_defaults;

CREATE POLICY "Admins can update defaults"
    ON privilege_permission_defaults
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- ============================================================================
-- STEP 6: Create function to compare current vs default permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_permission_differences(
    p_privilege_level TEXT
)
RETURNS TABLE (
    permission_key TEXT,
    permission_label TEXT,
    permission_category TEXT,
    current_value BOOLEAN,
    default_value BOOLEAN,
    is_different BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.permission_key,
        c.permission_label,
        c.permission_category,
        c.is_granted AS current_value,
        d.is_granted AS default_value,
        (c.is_granted != d.is_granted) AS is_different
    FROM privilege_permissions c
    INNER JOIN privilege_permission_defaults d
        ON c.permission_key = d.permission_key
        AND c.privilege_level = d.privilege_level
    WHERE c.privilege_level = p_privilege_level
    ORDER BY c.display_order;
END;
$$;

-- ============================================================================
-- STEP 7: Create function to reset permissions to defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_permissions_to_defaults(
    p_privilege_level TEXT
)
RETURNS TABLE (
    updated_count INTEGER,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Update all permissions for the privilege level to match defaults
    WITH updates AS (
        UPDATE privilege_permissions p
        SET is_granted = d.is_granted,
            updated_at = NOW()
        FROM privilege_permission_defaults d
        WHERE p.permission_key = d.permission_key
        AND p.privilege_level = d.privilege_level
        AND p.privilege_level = p_privilege_level
        AND p.is_granted != d.is_granted  -- Only update if different
        RETURNING p.id
    )
    SELECT COUNT(*) INTO v_updated_count FROM updates;

    RETURN QUERY
    SELECT
        v_updated_count,
        true,
        'Successfully reset ' || v_updated_count || ' permissions to defaults for ' || p_privilege_level;
END;
$$;

-- ============================================================================
-- STEP 8: Verify defaults snapshot
-- ============================================================================

DO $$
DECLARE
    default_count INTEGER;
    current_count INTEGER;
    unique_privileges INTEGER;
    unique_permissions INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'VERIFICATION: Permission defaults snapshot';
    RAISE NOTICE '============================================================';

    -- Get total defaults count
    SELECT COUNT(*) INTO default_count
    FROM privilege_permission_defaults;

    -- Get total current permissions count
    SELECT COUNT(*) INTO current_count
    FROM privilege_permissions;

    -- Get unique privilege levels
    SELECT COUNT(DISTINCT privilege_level) INTO unique_privileges
    FROM privilege_permission_defaults;

    -- Get unique permissions
    SELECT COUNT(DISTINCT permission_key) INTO unique_permissions
    FROM privilege_permission_defaults;

    RAISE NOTICE 'Defaults snapshot: % records', default_count;
    RAISE NOTICE 'Current permissions: % records', current_count;
    RAISE NOTICE 'Unique privilege levels: %', unique_privileges;
    RAISE NOTICE 'Unique permissions: %', unique_permissions;
    RAISE NOTICE '';

    IF default_count = current_count THEN
        RAISE NOTICE '✓ Defaults snapshot matches current permissions';
    ELSE
        RAISE WARNING '⚠ Defaults snapshot count differs from current permissions';
        RAISE WARNING 'Expected: %, Got: %', current_count, default_count;
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 9: Test permission difference detection
-- ============================================================================

DO $$
DECLARE
    diff_count INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TESTING PERMISSION DIFFERENCE DETECTION';
    RAISE NOTICE '============================================================';

    -- Check for differences (should be 0 initially)
    SELECT COUNT(*) INTO diff_count
    FROM get_permission_differences('Viewer')
    WHERE is_different = true;

    RAISE NOTICE 'Differences found for Viewer level: %', diff_count;

    IF diff_count = 0 THEN
        RAISE NOTICE '✓ No differences detected (as expected for fresh snapshot)';
    ELSE
        RAISE WARNING '⚠ Found % differences (unexpected)', diff_count;
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 10: Display sample defaults
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SAMPLE PERMISSION DEFAULTS (first 10 for Viewer):';
    RAISE NOTICE '============================================================';
END $$;

SELECT
    permission_key,
    permission_label,
    permission_category,
    is_granted
FROM privilege_permission_defaults
WHERE privilege_level = 'Viewer'
ORDER BY display_order
LIMIT 10;

-- ============================================================================
-- STEP 11: Show defaults distribution by category
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'PERMISSION DEFAULTS BY CATEGORY:';
    RAISE NOTICE '============================================================';
END $$;

SELECT
    permission_category,
    COUNT(*) AS total_permissions,
    SUM(CASE WHEN is_granted THEN 1 ELSE 0 END) AS granted_by_default
FROM privilege_permission_defaults
WHERE privilege_level = 'Viewer'
GROUP BY permission_category
ORDER BY permission_category;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'PERMISSION DEFAULTS MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ privilege_permission_defaults table created';
    RAISE NOTICE '  ✓ Performance indexes created';
    RAISE NOTICE '  ✓ RLS policies enabled';
    RAISE NOTICE '  ✓ Current permissions snapshotted as defaults';
    RAISE NOTICE '  ✓ Helper functions created:';
    RAISE NOTICE '    - get_permission_differences(privilege_level)';
    RAISE NOTICE '    - reset_permissions_to_defaults(privilege_level)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  • Compare current permissions vs defaults';
    RAISE NOTICE '  • Reset permissions to factory defaults';
    RAISE NOTICE '  • Visual indicators for modified permissions';
    RAISE NOTICE '  • Admins can maintain default values';
    RAISE NOTICE '';
    RAISE NOTICE 'All 3 database migrations complete!';
    RAISE NOTICE 'Ready to build frontend components.';
    RAISE NOTICE '============================================================';
END $$;
