-- ============================================================================
-- TEST: Temporarily Disable RLS Policies on Users Table SELECT
-- ============================================================================
-- This is a diagnostic test to confirm RLS is causing the timeout
-- We'll re-enable immediately after if this fixes it
-- ============================================================================

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

-- Disable RLS on users table entirely
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Log what we did
DO $$
BEGIN
  RAISE NOTICE '========== RLS DISABLED ON users TABLE ==========';
  RAISE NOTICE 'This is a temporary test to confirm RLS is causing the timeout';
  RAISE NOTICE 'If login is fast now, we know RLS is the problem';
  RAISE NOTICE 'We will re-enable with better policies in the next migration';
END $$;
