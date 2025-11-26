-- Migration: Add 24-Hour Restriction for Availability Status Editing
-- Date: 2025-11-26
-- Description: Allow lower privilege users to edit/delete their own availability status
-- within 24 hours of creation, while Editor+ can edit/delete anytime

-- ============================================================================
-- STEP 1: Create helper function to check if record is within 24 hours
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_within_24_hours(record_created_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN (NOW() - record_created_at) < INTERVAL '24 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_within_24_hours(TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.is_within_24_hours(TIMESTAMPTZ) IS
'Returns true if the given timestamp is within the last 24 hours';

-- ============================================================================
-- STEP 2: Create function to check if user can edit availability status based on time
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_edit_availability_status(
    record_user_id UUID,
    record_assignment_type TEXT,
    record_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    user_privilege TEXT;
BEGIN
    -- Get current user's privilege
    SELECT privilege INTO user_privilege
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    -- Editor+ can edit/delete anything anytime
    IF user_privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN
        RETURN TRUE;
    END IF;

    -- For status records only:
    IF record_assignment_type = 'status' THEN
        -- User must own the record
        IF record_user_id = auth.uid() THEN
            -- Viewer+ can edit/delete their own status within 24 hours
            IF user_privilege IN ('Viewer', 'Viewer+') THEN
                RETURN is_within_24_hours(record_created_at);
            END IF;
        END IF;
    END IF;

    -- Default: no permission
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_edit_availability_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.can_edit_availability_status(UUID, TEXT, TIMESTAMPTZ) IS
'Checks if user can edit/delete availability status based on privilege, ownership, and time constraints';

-- ============================================================================
-- STEP 3: Update resource_allocations UPDATE policy
-- ============================================================================

DROP POLICY IF EXISTS "resource_allocations_update" ON public.resource_allocations;

CREATE POLICY "resource_allocations_update"
ON public.resource_allocations
FOR UPDATE
USING (
    -- Editor+ can update anything
    public.is_editor()
    OR
    -- Time-restricted status editing for lower privileges
    public.can_edit_availability_status(user_id, assignment_type, created_at)
);

COMMENT ON POLICY "resource_allocations_update" ON public.resource_allocations IS
'Editor+ can update any record. Viewer/Viewer+ can update their own status records within 24h of creation.';

-- ============================================================================
-- STEP 4: Update resource_allocations DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "resource_allocations_delete" ON public.resource_allocations;

CREATE POLICY "resource_allocations_delete"
ON public.resource_allocations
FOR DELETE
USING (
    -- Editor+ can delete anything
    public.is_editor()
    OR
    -- Time-restricted status deletion for lower privileges
    public.can_edit_availability_status(user_id, assignment_type, created_at)
);

COMMENT ON POLICY "resource_allocations_delete" ON public.resource_allocations IS
'Editor+ can delete any record. Viewer/Viewer+ can delete their own status records within 24h of creation.';

-- ============================================================================
-- STEP 5: Apply same policies to dummy_resource_allocations table
-- ============================================================================

DROP POLICY IF EXISTS "dummy_resource_allocations_update" ON public.dummy_resource_allocations;

CREATE POLICY "dummy_resource_allocations_update"
ON public.dummy_resource_allocations
FOR UPDATE
USING (
    public.is_editor()
    OR
    public.can_edit_availability_status(user_id, assignment_type, created_at)
);

DROP POLICY IF EXISTS "dummy_resource_allocations_delete" ON public.dummy_resource_allocations;

CREATE POLICY "dummy_resource_allocations_delete"
ON public.dummy_resource_allocations
FOR DELETE
USING (
    public.is_editor()
    OR
    public.can_edit_availability_status(user_id, assignment_type, created_at)
);

-- ============================================================================
-- STEP 6: Verify policies are in place
-- ============================================================================

DO $$
DECLARE
  resource_policy_count INTEGER;
  dummy_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO resource_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'resource_allocations'
    AND policyname IN ('resource_allocations_update', 'resource_allocations_delete');

  SELECT COUNT(*) INTO dummy_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'dummy_resource_allocations'
    AND policyname IN ('dummy_resource_allocations_update', 'dummy_resource_allocations_delete');

  IF resource_policy_count = 2 AND dummy_policy_count = 2 THEN
    RAISE NOTICE '✅ All 24-hour restriction policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 4 policies, but found resource: %, dummy: %',
      resource_policy_count, dummy_policy_count;
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE '24-hour availability status restriction enabled:';
  RAISE NOTICE '  • Viewer/Viewer+: Can edit/delete own status within 24h';
  RAISE NOTICE '  • Editor+: Can edit/delete any status anytime';
  RAISE NOTICE '  • Grace period prevents accidental permanent changes';
  RAISE NOTICE '========================================';
END $$;
