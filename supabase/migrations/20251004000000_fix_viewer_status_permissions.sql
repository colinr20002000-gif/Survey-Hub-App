-- ============================================================================
-- Fix Viewer and Viewer+ Permissions for Status Assignments
-- ============================================================================
-- Changes:
-- 1. Viewer and Viewer+ can add/edit/delete "Available"/"Not Available" status
-- 2. Fix assignment_type check to use 'status' instead of 'Available'/'Not Available'
-- ============================================================================

-- ============================================================================
-- RESOURCE ALLOCATIONS - Viewer and Viewer+ Status Access
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "resource_allocations_insert" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_update" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_delete" ON public.resource_allocations;

-- INSERT: Viewer+ can add status, Editors+ can add anything
CREATE POLICY "resource_allocations_insert" ON public.resource_allocations
  FOR INSERT
  WITH CHECK (
    -- Editors+ can insert anything
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    -- Viewer and Viewer+ can ONLY insert status assignments
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

-- UPDATE: Viewer+ can update status, Editors+ can update anything
CREATE POLICY "resource_allocations_update" ON public.resource_allocations
  FOR UPDATE
  USING (
    -- Editors+ can update anything
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    -- Viewer and Viewer+ can ONLY update status assignments
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

-- DELETE: Viewer+ can delete status, Editors+ can delete anything
CREATE POLICY "resource_allocations_delete" ON public.resource_allocations
  FOR DELETE
  USING (
    -- Editors+ can delete anything
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    -- Viewer and Viewer+ can ONLY delete status assignments
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

-- ============================================================================
-- DUMMY RESOURCE ALLOCATIONS - Same Rules
-- ============================================================================

DROP POLICY IF EXISTS "dummy_resource_allocations_insert" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_update" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_delete" ON public.dummy_resource_allocations;

CREATE POLICY "dummy_resource_allocations_insert" ON public.dummy_resource_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

CREATE POLICY "dummy_resource_allocations_update" ON public.dummy_resource_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

CREATE POLICY "dummy_resource_allocations_delete" ON public.dummy_resource_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege IN ('Viewer', 'Viewer+')
        LIMIT 1
      )
      AND assignment_type = 'status'
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Viewer and Viewer+ can now add/edit/delete Available/Not Available status
-- assignment_type is checked as 'status' instead of the status values
-- ============================================================================
