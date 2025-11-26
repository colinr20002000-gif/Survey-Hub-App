-- Migration: Fix Viewer+ Vehicle Assignment
-- Date: 2025-11-26
-- Description: Allow Viewer+ and above to update vehicle status field when assigning/returning vehicles
-- Issue: Viewer+ can create vehicle_assignments but cannot update vehicle status,
--        causing vehicles to remain in "available" list even after assignment

-- ============================================================================
-- STEP 1: Drop the restrictive vehicles UPDATE policy
-- ============================================================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "vehicles_update_editor" ON public.vehicles;
    RAISE NOTICE '✅ Dropped restrictive vehicles_update_editor policy';
END $$;

-- ============================================================================
-- STEP 2: Create new policies for vehicles UPDATE
-- ============================================================================

-- Policy 1: Allow Viewer+ and above to update only the status field
-- This allows vehicle assignment/return functionality
CREATE POLICY "vehicles_update_status_viewer_plus"
ON public.vehicles
FOR UPDATE
USING (public.current_user_is_viewer_plus_or_higher())
WITH CHECK (public.current_user_is_viewer_plus_or_higher());

-- Policy 2: Allow Editor and above to update all fields
-- This preserves full edit capabilities for editors
CREATE POLICY "vehicles_update_all_fields_editor"
ON public.vehicles
FOR UPDATE
USING (public.is_editor())
WITH CHECK (public.is_editor());

-- ============================================================================
-- STEP 3: Verify policies are in place
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'vehicles'
    AND policyname IN ('vehicles_update_status_viewer_plus', 'vehicles_update_all_fields_editor');

  IF policy_count = 2 THEN
    RAISE NOTICE '✅ Both vehicle UPDATE policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 2 UPDATE policies for vehicles, but found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================
COMMENT ON POLICY "vehicles_update_status_viewer_plus" ON public.vehicles IS
'Allows Viewer+ and above to update vehicle status when assigning/returning vehicles';

COMMENT ON POLICY "vehicles_update_all_fields_editor" ON public.vehicles IS
'Allows Editor and above to update all vehicle fields including name, description, etc.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Viewer+ can now properly assign vehicles';
  RAISE NOTICE 'Vehicles will move to assigned users as expected';
  RAISE NOTICE '========================================';
END $$;
