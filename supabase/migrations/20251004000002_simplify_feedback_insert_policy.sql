-- ============================================================================
-- Simplify Feedback Insert Policy
-- ============================================================================
-- Changes:
-- 1. Simplify INSERT policy to avoid circular dependency with users table
-- 2. Just check that user is authenticated and user_id matches auth.uid()
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "feedback_select_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert_all_users" ON public.feedback;
DROP POLICY IF EXISTS "feedback_update_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_manage_admin" ON public.feedback;

-- SELECT: Only Admins can view feedback
CREATE POLICY "feedback_select_admin" ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND privilege IN ('Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- INSERT: All authenticated users can submit feedback (simplified)
CREATE POLICY "feedback_insert_all_users" ON public.feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- UPDATE: Only Admins can update feedback
CREATE POLICY "feedback_update_admin" ON public.feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
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
      WHERE id = auth.uid()
        AND privilege IN ('Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Simplified INSERT policy - only checks auth.uid() and user_id match
-- No dependency on users table for INSERT
-- ============================================================================
