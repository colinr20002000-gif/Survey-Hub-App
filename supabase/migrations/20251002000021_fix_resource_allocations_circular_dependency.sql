-- ============================================================================
-- Fix Resource Allocations Circular Dependencies
-- ============================================================================
-- PROBLEM: resource_allocations and dummy_resource_allocations still query
--          users table directly, causing circular dependencies
-- SOLUTION: Use SECURITY DEFINER functions (created in migration 18)
-- ============================================================================

-- ============================================================================
-- RESOURCE_ALLOCATIONS Table - Fix Circular Dependencies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "resource_allocations_select_all" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_insert" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_update" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_delete" ON public.resource_allocations;

-- SELECT: Everyone can view
CREATE POLICY "resource_allocations_select_all" ON public.resource_allocations
  FOR SELECT
  USING (true);

-- INSERT: Complex rule - Viewer+ can ONLY add Available/Not Available, Editor+ can add anything
CREATE POLICY "resource_allocations_insert" ON public.resource_allocations
  FOR INSERT
  WITH CHECK (
    -- Editors+ can insert anything
    current_user_is_editor_or_higher()
    OR
    -- Viewer+ can ONLY insert Available/Not Available
    (
      current_user_is_viewer_plus_or_higher()
      AND NOT current_user_is_editor_or_higher()
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- UPDATE: Complex rule - Viewer+ can ONLY update Available/Not Available, Editor+ can update anything
CREATE POLICY "resource_allocations_update" ON public.resource_allocations
  FOR UPDATE
  USING (
    -- Editors+ can update anything
    current_user_is_editor_or_higher()
    OR
    -- Viewer+ can ONLY update Available/Not Available
    (
      current_user_is_viewer_plus_or_higher()
      AND NOT current_user_is_editor_or_higher()
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- DELETE: Editor+ can delete
CREATE POLICY "resource_allocations_delete" ON public.resource_allocations
  FOR DELETE
  USING (current_user_is_editor_or_higher());

DO $$
BEGIN
  RAISE NOTICE '✅ resource_allocations policies updated (no circular dependencies)';
END $$;

-- ============================================================================
-- DUMMY_RESOURCE_ALLOCATIONS Table - Fix Circular Dependencies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "dummy_resource_allocations_select_all" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_insert" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_update" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_delete" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_insert_editor" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_update_viewer_plus" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_delete_editor" ON public.dummy_resource_allocations;

-- SELECT: Everyone can view
CREATE POLICY "dummy_resource_allocations_select_all" ON public.dummy_resource_allocations
  FOR SELECT
  USING (true);

-- INSERT: Complex rule - Viewer+ can ONLY add Available/Not Available, Editor+ can add anything
CREATE POLICY "dummy_resource_allocations_insert" ON public.dummy_resource_allocations
  FOR INSERT
  WITH CHECK (
    -- Editors+ can insert anything
    current_user_is_editor_or_higher()
    OR
    -- Viewer+ can ONLY insert Available/Not Available
    (
      current_user_is_viewer_plus_or_higher()
      AND NOT current_user_is_editor_or_higher()
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- UPDATE: Complex rule - Viewer+ can ONLY update Available/Not Available, Editor+ can update anything
CREATE POLICY "dummy_resource_allocations_update" ON public.dummy_resource_allocations
  FOR UPDATE
  USING (
    -- Editors+ can update anything
    current_user_is_editor_or_higher()
    OR
    -- Viewer+ can ONLY update Available/Not Available
    (
      current_user_is_viewer_plus_or_higher()
      AND NOT current_user_is_editor_or_higher()
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- DELETE: Editor+ can delete
CREATE POLICY "dummy_resource_allocations_delete" ON public.dummy_resource_allocations
  FOR DELETE
  USING (current_user_is_editor_or_higher());

DO $$
BEGIN
  RAISE NOTICE '✅ dummy_resource_allocations policies updated (no circular dependencies)';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ RESOURCE ALLOCATIONS CIRCULAR DEPENDENCIES FIXED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ resource_allocations - now uses SECURITY DEFINER functions';
  RAISE NOTICE '✅ dummy_resource_allocations - now uses SECURITY DEFINER functions';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Rules still enforced correctly:';
  RAISE NOTICE '   • Viewer+: Can ONLY add/edit "Available"/"Not Available"';
  RAISE NOTICE '   • Editor+: Can manage all allocation types';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ NO circular dependencies - policies use helper functions';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
