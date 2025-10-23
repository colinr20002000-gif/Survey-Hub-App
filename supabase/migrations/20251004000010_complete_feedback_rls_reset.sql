-- Complete reset of feedback table RLS policies
-- This migration ensures a clean slate for feedback submission

-- Step 1: Drop ALL existing policies on feedback table
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE 'Dropping all existing policies on feedback table...';
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'feedback' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.feedback', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Step 3: Create the simplest possible INSERT policy
-- Allow any authenticated user to insert feedback
CREATE POLICY "feedback_allow_insert" ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 4: Create SELECT policy for admins only
CREATE POLICY "feedback_allow_select_admin" ON public.feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND privilege IN ('Admin', 'Super Admin')
    )
  );

-- Step 5: Create UPDATE policy for admins only
CREATE POLICY "feedback_allow_update_admin" ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND privilege IN ('Admin', 'Super Admin')
    )
  );

-- Step 6: Create DELETE policy for admins only
CREATE POLICY "feedback_allow_delete_admin" ON public.feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND privilege IN ('Admin', 'Super Admin')
    )
  );

-- Step 7: Ensure proper grants
GRANT INSERT ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT UPDATE ON public.feedback TO authenticated;
GRANT DELETE ON public.feedback TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Feedback RLS policies have been completely reset';
    RAISE NOTICE '✅ INSERT: All authenticated users can submit feedback';
    RAISE NOTICE '✅ SELECT/UPDATE/DELETE: Admin users only';
END $$;
