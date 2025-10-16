-- ============================================================================
-- RE-ENABLE Users Table RLS - NO CIRCULAR DEPENDENCIES
-- ============================================================================
-- SAFE APPROACH: Use simple policies that NEVER query the users table
-- ============================================================================

-- Re-enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: SELECT - Everyone can view all users
-- ============================================================================
-- No dependencies, no queries, just "true"
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT
  USING (true);

-- ============================================================================
-- POLICY 2: UPDATE - Users can update their own record
-- ============================================================================
-- Only checks auth.uid() - NO query to users table
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- POLICY 3: INSERT - Users can insert their own record on first sign-in
-- ============================================================================
-- Only checks auth.uid() - NO query to users table
-- Admins can create users via Supabase Dashboard
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- POLICY 4: DELETE - Disabled (use Supabase Dashboard)
-- ============================================================================
-- No DELETE policy = no one can delete via app (prevents accidents)
-- Admins can delete via Supabase Dashboard

-- ============================================================================
-- EXPLANATION:
-- ============================================================================
-- These policies are 100% safe because:
-- 1. SELECT uses "true" - no dependencies
-- 2. UPDATE uses only auth.uid() - no table queries
-- 3. INSERT uses only auth.uid() - no table queries
-- 4. DELETE has no policy - use dashboard instead
--
-- NO circular dependencies = INSTANT queries = NO timeouts
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========== Users Table RLS Re-enabled Successfully ==========';
  RAISE NOTICE 'All policies use simple checks with NO circular dependencies';
  RAISE NOTICE 'Authentication should now be instant';
END $$;
