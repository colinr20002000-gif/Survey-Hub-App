-- ============================================================================
-- Complete Reset of Feedback Table RLS Policies
-- ============================================================================
-- This migration completely removes and recreates all feedback table policies
-- to ensure no old/conflicting policies remain
-- ============================================================================

-- First, get a list of all policies on feedback table and drop them
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'feedback'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.feedback', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Now create fresh policies from scratch

-- 1. INSERT: All authenticated users can submit feedback
-- They can only insert records where user_id matches their auth.uid()
CREATE POLICY "feedback_insert_authenticated" ON public.feedback
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

-- 2. SELECT: Only Admins can view feedback
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

-- 3. UPDATE: Only Admins can update feedback
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

-- 4. DELETE: Only Admins can delete feedback
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

-- Ensure RLS is enabled
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Ensure proper permissions are granted
GRANT INSERT ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT UPDATE ON public.feedback TO authenticated;
GRANT DELETE ON public.feedback TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All old policies dropped
-- Fresh policies created:
-- - feedback_insert_authenticated: All authenticated users can insert
-- - feedback_select_admin: Only Admins can view
-- - feedback_update_admin: Only Admins can update
-- - feedback_delete_admin: Only Admins can delete
-- ============================================================================
