-- ============================================================================
-- Fix Viewer+ Permissions and Add Custom RLS Error Messages
-- ============================================================================
-- Changes:
-- 1. Viewer+ can ONLY add "Available"/"Not Available" to resource calendar
-- 2. Viewer+ CANNOT complete delivery tasks
-- 3. Custom error messages for RLS violations
-- ============================================================================

-- ============================================================================
-- RESOURCE ALLOCATIONS - Viewer+ Limited Access
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "resource_allocations_insert" ON public.resource_allocations;
DROP POLICY IF EXISTS "resource_allocations_update" ON public.resource_allocations;

-- SELECT: Everyone can view (unchanged)
-- Already exists from previous migration

-- INSERT: Viewer+ can ONLY add Available/Not Available, Editors+ can add anything
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
    -- Viewer+ can ONLY insert Available/Not Available
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege = 'Viewer+'
        LIMIT 1
      )
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- UPDATE: Viewer+ can ONLY update Available/Not Available, Editors+ can update anything
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
    -- Viewer+ can ONLY update Available/Not Available
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND privilege = 'Viewer+'
        LIMIT 1
      )
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- ============================================================================
-- DUMMY RESOURCE ALLOCATIONS - Same Rules
-- ============================================================================

DROP POLICY IF EXISTS "dummy_resource_allocations_insert_editor" ON public.dummy_resource_allocations;
DROP POLICY IF EXISTS "dummy_resource_allocations_update_viewer_plus" ON public.dummy_resource_allocations;

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
          AND privilege = 'Viewer+'
        LIMIT 1
      )
      AND assignment_type IN ('Available', 'Not Available')
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
          AND privilege = 'Viewer+'
        LIMIT 1
      )
      AND assignment_type IN ('Available', 'Not Available')
    )
  );

-- ============================================================================
-- DELIVERY TASKS - Remove Viewer+ Update Permission
-- ============================================================================

DROP POLICY IF EXISTS "delivery_tasks_update_viewer_plus" ON public.delivery_tasks;

-- Only Editors+ can update delivery tasks
CREATE POLICY "delivery_tasks_update_editor" ON public.delivery_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- ============================================================================
-- CUSTOM ERROR MESSAGE FUNCTION
-- ============================================================================

-- Create a function to raise custom RLS errors
CREATE OR REPLACE FUNCTION public.raise_insufficient_privilege()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Insufficient privileges: You do not have the appropriate privilege to perform this action.'
    USING ERRCODE = '42501';
  RETURN FALSE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.raise_insufficient_privilege() TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Viewer+ can now only add/edit Available/Not Available in resource calendar
-- Viewer+ cannot complete delivery tasks
-- Custom error messages will be handled at the application level
-- ============================================================================
