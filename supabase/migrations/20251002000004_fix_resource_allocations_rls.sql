-- ============================================================================
-- Fix Resource Allocations RLS - Ensure Admins Can Insert
-- ============================================================================
-- This migration ensures that Admins and Editors can insert resource allocations
-- by verifying the user's privilege is correctly queried
-- ============================================================================

-- First, verify the user has Admin privilege
DO $$
DECLARE
  current_priv TEXT;
BEGIN
  SELECT privilege INTO current_priv
  FROM public.users
  WHERE email = 'colin.rogers@inorail.co.uk';

  RAISE NOTICE 'colin.rogers@inorail.co.uk current privilege: %', current_priv;
END $$;

-- Drop and recreate the INSERT policy with explicit logic
DROP POLICY IF EXISTS "resource_allocations_insert_editor" ON public.resource_allocations;

-- Create a more explicit policy that checks privilege directly
CREATE POLICY "resource_allocations_insert_editor_admin" ON public.resource_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
    )
  );

-- Also update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "resource_allocations_update_viewer_plus" ON public.resource_allocations;

CREATE POLICY "resource_allocations_update_all" ON public.resource_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin')
    )
  );

-- Update DELETE policy too
DROP POLICY IF EXISTS "resource_allocations_delete_editor" ON public.resource_allocations;

CREATE POLICY "resource_allocations_delete_editor_admin" ON public.resource_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Resource allocations now use direct EXISTS queries instead of helper functions
-- to avoid any potential circular dependency or caching issues
-- ============================================================================
