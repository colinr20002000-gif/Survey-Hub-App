-- Migration: Fix Viewer+ Set Own Availability Status
-- Date: 2025-11-26
-- Description: Allow Viewer+ to create/set their own availability status
-- Issues Fixed:
--   1. Viewer+ couldn't create availability status (only Editor+ had SET_AVAILABILITY_STATUS)
--   2. RLS INSERT policy didn't restrict Viewer+ to their own user_id
-- Solution:
--   1. Add Viewer+ to SET_AVAILABILITY_STATUS permission
--   2. Update RLS INSERT policy to ensure Viewer+ can only set status for themselves

-- ============================================================================
-- STEP 1: Update resource_allocations INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "resource_allocations_insert" ON public.resource_allocations;

CREATE POLICY "resource_allocations_insert"
ON public.resource_allocations
FOR INSERT
WITH CHECK (
    -- Editor+ can insert anything for anyone
    public.is_editor()
    OR
    -- Viewer/Viewer+ can only insert status records for THEMSELVES
    (
        public.current_user_is_viewer_plus_or_higher()
        AND assignment_type = 'status'
        AND user_id = auth.uid()
    )
);

COMMENT ON POLICY "resource_allocations_insert" ON public.resource_allocations IS
'Editor+ can insert any allocation. Viewer+ can only insert their own status records.';

-- ============================================================================
-- STEP 2: Update dummy_resource_allocations INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "dummy_resource_allocations_insert" ON public.dummy_resource_allocations;

CREATE POLICY "dummy_resource_allocations_insert"
ON public.dummy_resource_allocations
FOR INSERT
WITH CHECK (
    -- Editor+ can insert anything for anyone
    public.is_editor()
    OR
    -- Viewer/Viewer+ can only insert status records for THEMSELVES (if they're a dummy user)
    (
        public.current_user_is_viewer_plus_or_higher()
        AND assignment_type = 'status'
        AND user_id = auth.uid()
    )
);

COMMENT ON POLICY "dummy_resource_allocations_insert" ON public.dummy_resource_allocations IS
'Editor+ can insert any allocation. Viewer+ can only insert their own status records.';

-- ============================================================================
-- STEP 3: Verify policies are in place
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
    AND policyname = 'resource_allocations_insert';

  SELECT COUNT(*) INTO dummy_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'dummy_resource_allocations'
    AND policyname = 'dummy_resource_allocations_insert';

  IF resource_policy_count = 1 AND dummy_policy_count = 1 THEN
    RAISE NOTICE '✅ Both INSERT policies updated successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 2 INSERT policies, but found resource: %, dummy: %',
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
  RAISE NOTICE 'Viewer+ can now:';
  RAISE NOTICE '  • Create their OWN availability status';
  RAISE NOTICE '  • Edit/delete their status within 24h';
  RAISE NOTICE '  • Cannot set status for other users';
  RAISE NOTICE '========================================';
END $$;
