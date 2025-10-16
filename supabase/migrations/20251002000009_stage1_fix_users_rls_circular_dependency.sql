-- ============================================================================
-- STAGE 1: Fix Users Table RLS Circular Dependency
-- ============================================================================
-- PROBLEM: INSERT and DELETE policies query the users table to check if user
--          is admin, which creates a circular dependency causing 3s timeouts
--
-- FIX: Use simple auth.uid() checks instead of querying users table
-- ============================================================================

-- Drop existing policies on users table
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

-- ============================================================================
-- NEW POLICIES - NO CIRCULAR DEPENDENCIES
-- ============================================================================

-- SELECT: Everyone can view all users (needed for dropdowns, assignments)
-- This policy has NO dependencies on users table - simple true condition
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

-- UPDATE: Users can update their own profile (password, theme, etc.)
-- This policy only checks auth.uid() - NO query to users table
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- INSERT: Users can insert their own record on first sign-in
-- This policy only checks auth.uid() - NO query to users table
-- Note: We removed admin check to avoid circular dependency
-- Admins can still create users via Supabase dashboard or auth API
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE: Disabled for now to avoid circular dependency
-- Users cannot delete themselves or others via the app
-- Admins can delete users via Supabase dashboard
-- We will add this back in Stage 2 with a better approach

-- ============================================================================
-- EXPLANATION:
-- ============================================================================
-- Before: INSERT/DELETE policies called is_admin() which queries users table
--         → Triggers RLS evaluation → Calls is_admin() again → Infinite loop
--         → 3 second timeout → Authentication fails
--
-- After: All policies use direct auth.uid() checks only
--        → No queries to users table from within users table policies
--        → No circular dependency → Instant query response
--
-- Trade-off: Admins can no longer create/delete users via app (temporarily)
--            They can still do it via Supabase Dashboard
--            We'll add this back in Stage 2 using a different approach
-- ============================================================================
