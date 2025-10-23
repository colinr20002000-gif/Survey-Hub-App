-- Fix feedback INSERT policy to allow all authenticated users
-- Simplified policy that just checks if user is authenticated

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "feedback_insert_authenticated" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert_all_authenticated" ON public.feedback;

-- Create simple INSERT policy that allows all authenticated users
CREATE POLICY "feedback_insert_all_users" ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Grant INSERT permission to authenticated role
GRANT INSERT ON public.feedback TO authenticated;
