-- =========================================================
-- MAKE RLS OVERRIDE-AWARE
-- Updates the is_admin_or_editor helper function to respect
-- individual user overrides for Timesheet Task Management.
-- =========================================================

CREATE OR REPLACE FUNCTION is_admin_or_editor()
RETURNS BOOLEAN AS $$
DECLARE
    user_privilege TEXT;
    has_override BOOLEAN;
BEGIN
    -- 1. Check for individual "Force Allow" override first (Highest priority)
    -- We check for both MANAGE and VIEW tasks as MANAGE implies VIEW in this context
    SELECT is_granted INTO has_override 
    FROM public.user_permission_overrides 
    WHERE user_id = auth.uid() 
    AND (permission_key = 'MANAGE_TIMESHEET_TASKS' OR permission_key = 'VIEW_TIMESHEET_TASKS')
    AND is_granted = true
    LIMIT 1;

    IF has_override THEN
        RETURN true;
    END IF;

    -- 2. Check for individual "Force Deny" (Second priority)
    SELECT is_granted INTO has_override 
    FROM public.user_permission_overrides 
    WHERE user_id = auth.uid() 
    AND (permission_key = 'MANAGE_TIMESHEET_TASKS' OR permission_key = 'VIEW_TIMESHEET_TASKS')
    AND is_granted = false
    LIMIT 1;

    IF has_override = false THEN
        RETURN false;
    END IF;

    -- 3. Fall back to global privilege level
    SELECT privilege INTO user_privilege FROM public.users WHERE id = auth.uid();
    RETURN user_privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
