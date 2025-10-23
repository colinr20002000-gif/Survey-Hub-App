-- ============================================================================
-- Fix Feedback Policy - Use Correct auth.uid() Syntax
-- ============================================================================
-- Changes:
-- 1. Use (SELECT auth.uid()) syntax instead of auth.uid()
-- 2. Match the pattern used in other working RLS policies
-- ============================================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "feedback_insert_all_users" ON public.feedback;

-- INSERT: All authenticated users can submit feedback
-- Use (SELECT auth.uid()) syntax to ensure proper function execution
CREATE POLICY "feedback_insert_all_users" ON public.feedback
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Updated INSERT policy to use (SELECT auth.uid()) syntax
-- This matches the pattern used in other working RLS policies
-- ============================================================================
