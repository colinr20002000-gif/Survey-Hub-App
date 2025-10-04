-- ============================================================================
-- Allow All Users to Submit Feedback
-- ============================================================================
-- Changes:
-- 1. All authenticated users (Viewer+) can INSERT feedback
-- 2. Only Admins can SELECT, UPDATE, DELETE feedback
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "feedback_select_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_manage_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert_all_users" ON public.feedback;

-- SELECT: Only Admins can view feedback
CREATE POLICY "feedback_select_admin" ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- INSERT: All authenticated users can submit feedback
CREATE POLICY "feedback_insert_all_users" ON public.feedback
  FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must exist in users table
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
      LIMIT 1
    )
    -- The user_id in the feedback must match the authenticated user
    AND user_id = (SELECT auth.uid())
  );

-- UPDATE: Only Admins can update feedback
CREATE POLICY "feedback_update_admin" ON public.feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- DELETE: Only Admins can delete feedback
CREATE POLICY "feedback_delete_admin" ON public.feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
        AND privilege IN ('Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All users can now submit feedback (bug reports and feature requests)
-- Only Admins can view and manage feedback
-- ============================================================================
