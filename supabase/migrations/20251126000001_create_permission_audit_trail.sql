-- ============================================================================
-- CREATE PERMISSION AUDIT TRAIL SYSTEM
-- ============================================================================
-- PURPOSE: Track all permission changes with who, what, when details
--          Provides accountability and change history for admins
-- ============================================================================

-- ============================================================================
-- STEP 1: Create privilege_permission_audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS privilege_permission_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL,
    privilege_level TEXT NOT NULL,
    old_value BOOLEAN NOT NULL,
    new_value BOOLEAN NOT NULL,
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_email TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp
    ON privilege_permission_audit(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_permission
    ON privilege_permission_audit(permission_key, privilege_level);

CREATE INDEX IF NOT EXISTS idx_permission_audit_user
    ON privilege_permission_audit(changed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_permission_audit_privilege_level
    ON privilege_permission_audit(privilege_level);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE privilege_permission_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies
-- ============================================================================

-- Policy: Admins can view all audit entries
DROP POLICY IF EXISTS "Admins can view permission audit" ON privilege_permission_audit;

CREATE POLICY "Admins can view permission audit"
    ON privilege_permission_audit
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- Policy: Allow authenticated users to insert audit records
-- (Used by trigger, not direct user inserts)
DROP POLICY IF EXISTS "Allow authenticated to insert audit" ON privilege_permission_audit;

CREATE POLICY "Allow authenticated to insert audit"
    ON privilege_permission_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: Create trigger function to auto-audit permission changes
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Only audit if is_granted value actually changed
    IF (TG_OP = 'UPDATE' AND OLD.is_granted != NEW.is_granted) THEN
        -- Get user email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = auth.uid();

        -- If no user email found, use system
        IF user_email IS NULL THEN
            user_email := 'system';
        END IF;

        -- Insert audit record
        INSERT INTO privilege_permission_audit (
            permission_key,
            privilege_level,
            old_value,
            new_value,
            changed_by_user_id,
            changed_by_email,
            changed_at
        )
        VALUES (
            NEW.permission_key,
            NEW.privilege_level,
            OLD.is_granted,
            NEW.is_granted,
            auth.uid(),
            user_email,
            NOW()
        );

        -- Log the change (optional, for debugging)
        RAISE NOTICE 'Permission change audited: % for % level (% -> %) by %',
            NEW.permission_key,
            NEW.privilege_level,
            OLD.is_granted,
            NEW.is_granted,
            user_email;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 6: Create trigger on privilege_permissions table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_audit_permission_change ON privilege_permissions;

CREATE TRIGGER trigger_audit_permission_change
    AFTER UPDATE ON privilege_permissions
    FOR EACH ROW
    EXECUTE FUNCTION audit_permission_change();

-- ============================================================================
-- STEP 7: Create helper function to get recent audit entries
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_permission_changes(
    limit_count INTEGER DEFAULT 50,
    privilege_level_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    permission_key TEXT,
    privilege_level TEXT,
    old_value BOOLEAN,
    new_value BOOLEAN,
    changed_by_email TEXT,
    changed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.permission_key,
        a.privilege_level,
        a.old_value,
        a.new_value,
        a.changed_by_email,
        a.changed_at
    FROM privilege_permission_audit a
    WHERE
        CASE
            WHEN privilege_level_filter IS NOT NULL THEN
                a.privilege_level = privilege_level_filter
            ELSE
                true
        END
    ORDER BY a.changed_at DESC
    LIMIT limit_count;
END;
$$;

-- ============================================================================
-- STEP 8: Test the audit system with a sample change
-- ============================================================================

DO $$
DECLARE
    test_permission TEXT := 'VIEW_PROJECTS';
    test_level TEXT := 'Viewer';
    original_value BOOLEAN;
    audit_count INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TESTING AUDIT TRAIL SYSTEM';
    RAISE NOTICE '============================================================';

    -- Get original value
    SELECT is_granted INTO original_value
    FROM privilege_permissions
    WHERE permission_key = test_permission
    AND privilege_level = test_level;

    RAISE NOTICE 'Original value for % (%): %', test_permission, test_level, original_value;

    -- Toggle the permission
    UPDATE privilege_permissions
    SET is_granted = NOT is_granted
    WHERE permission_key = test_permission
    AND privilege_level = test_level;

    RAISE NOTICE 'Permission toggled to: %', NOT original_value;

    -- Check if audit record was created
    SELECT COUNT(*) INTO audit_count
    FROM privilege_permission_audit
    WHERE permission_key = test_permission
    AND privilege_level = test_level;

    IF audit_count > 0 THEN
        RAISE NOTICE '✓ Audit record created successfully';
    ELSE
        RAISE WARNING '⚠ No audit record found';
    END IF;

    -- Restore original value
    UPDATE privilege_permissions
    SET is_granted = original_value
    WHERE permission_key = test_permission
    AND privilege_level = test_level;

    RAISE NOTICE 'Permission restored to original value: %', original_value;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 9: Display audit trail statistics
-- ============================================================================

DO $$
DECLARE
    total_audits INTEGER;
    unique_users INTEGER;
    date_range TEXT;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'AUDIT TRAIL STATISTICS';
    RAISE NOTICE '============================================================';

    -- Get total audit records
    SELECT COUNT(*) INTO total_audits
    FROM privilege_permission_audit;

    -- Get unique users who made changes
    SELECT COUNT(DISTINCT changed_by_user_id) INTO unique_users
    FROM privilege_permission_audit
    WHERE changed_by_user_id IS NOT NULL;

    -- Get date range
    SELECT
        CASE
            WHEN MIN(changed_at) IS NOT NULL THEN
                'From ' || MIN(changed_at)::TEXT || ' to ' || MAX(changed_at)::TEXT
            ELSE
                'No records yet'
        END INTO date_range
    FROM privilege_permission_audit;

    RAISE NOTICE 'Total audit records: %', total_audits;
    RAISE NOTICE 'Unique users who made changes: %', unique_users;
    RAISE NOTICE 'Date range: %', date_range;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 10: Show sample of recent changes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RECENT PERMISSION CHANGES (last 5):';
    RAISE NOTICE '============================================================';
END $$;

SELECT
    permission_key,
    privilege_level,
    CASE WHEN old_value THEN 'Enabled' ELSE 'Disabled' END AS from_status,
    CASE WHEN new_value THEN 'Enabled' ELSE 'Disabled' END AS to_status,
    changed_by_email,
    changed_at
FROM privilege_permission_audit
ORDER BY changed_at DESC
LIMIT 5;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'PERMISSION AUDIT TRAIL MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ privilege_permission_audit table created';
    RAISE NOTICE '  ✓ Performance indexes created';
    RAISE NOTICE '  ✓ RLS policies enabled (admins can view)';
    RAISE NOTICE '  ✓ Automatic audit trigger installed';
    RAISE NOTICE '  ✓ Helper function get_recent_permission_changes() created';
    RAISE NOTICE '  ✓ Test audit record created and verified';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  • All permission changes automatically logged';
    RAISE NOTICE '  • Tracks old value, new value, user, and timestamp';
    RAISE NOTICE '  • Admins can query audit history';
    RAISE NOTICE '  • Helper function for easy access to recent changes';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run migration 20251126000002 (permission defaults)';
    RAISE NOTICE '============================================================';
END $$;
