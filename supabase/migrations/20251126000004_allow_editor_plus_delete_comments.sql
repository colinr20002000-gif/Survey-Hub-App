-- Migration: Allow Editor+ to delete equipment and vehicle comments
-- Date: 2025-11-26
-- Description: Allow Editor, Editor+, Admin, and Super Admin to delete any equipment/vehicle comments
-- regardless of who created them. This gives supervisors ability to moderate comments.

-- ============================================================================
-- STEP 1: Update Equipment Comments DELETE Policy
-- ============================================================================

-- Drop existing equipment_comments delete policy
DROP POLICY IF EXISTS "equipment_comments_delete_viewer_plus" ON public.equipment_comments;

-- Create new policy: Users can delete their own comments OR Editor+ can delete any comment
CREATE POLICY "equipment_comments_delete_own_or_editor"
ON public.equipment_comments
FOR DELETE
USING (
    user_id = auth.uid()
    OR public.is_editor()
);

COMMENT ON POLICY "equipment_comments_delete_own_or_editor" ON public.equipment_comments IS
'Users can delete their own comments. Editor and above can delete any comment for moderation.';

-- ============================================================================
-- STEP 2: Update Vehicle Comments DELETE Policy
-- ============================================================================

-- Drop existing vehicle_comments delete policy
DROP POLICY IF EXISTS "vehicle_comments_delete_viewer_plus" ON public.vehicle_comments;

-- Create new policy: Users can delete their own comments OR Editor+ can delete any comment
CREATE POLICY "vehicle_comments_delete_own_or_editor"
ON public.vehicle_comments
FOR DELETE
USING (
    created_by = auth.uid()
    OR public.is_editor()
);

COMMENT ON POLICY "vehicle_comments_delete_own_or_editor" ON public.vehicle_comments IS
'Users can delete their own comments. Editor and above can delete any comment for moderation.';

-- ============================================================================
-- STEP 3: Verify policies are in place
-- ============================================================================
DO $$
DECLARE
  equipment_policy_count INTEGER;
  vehicle_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO equipment_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'equipment_comments'
    AND policyname = 'equipment_comments_delete_own_or_editor';

  SELECT COUNT(*) INTO vehicle_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'vehicle_comments'
    AND policyname = 'vehicle_comments_delete_own_or_editor';

  IF equipment_policy_count = 1 AND vehicle_policy_count = 1 THEN
    RAISE NOTICE '✅ Both comment DELETE policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 2 DELETE policies, but found equipment: %, vehicle: %',
      equipment_policy_count, vehicle_policy_count;
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Editor+ can now delete any comments';
  RAISE NOTICE 'Users can still delete their own comments';
  RAISE NOTICE '========================================';
END $$;
