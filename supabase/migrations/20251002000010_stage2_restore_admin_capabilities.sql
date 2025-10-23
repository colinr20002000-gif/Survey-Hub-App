-- ============================================================================
-- STAGE 2: Restore Admin Capabilities for Users Table
-- ============================================================================
-- GOAL: Allow admins to create/delete users WITHOUT circular dependency
--
-- SOLUTION: Use SECURITY DEFINER function that bypasses RLS when checking
--           if current user is admin. This breaks the circular dependency.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if current user is admin (RLS-SAFE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- This function runs with the privileges of the function owner
STABLE            -- Result doesn't change within a single query
SET search_path = public
AS $$
DECLARE
  user_privilege TEXT;
BEGIN
  -- Query users table with RLS BYPASSED (because of SECURITY DEFINER)
  -- This breaks the circular dependency!
  SELECT privilege INTO user_privilege
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  -- Check if user is Admin or Super Admin
  RETURN user_privilege IN ('Admin', 'Super Admin');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.current_user_is_admin() IS
'Checks if the current authenticated user has Admin or Super Admin privileges.
Uses SECURITY DEFINER to bypass RLS and avoid circular dependency when called from users table policies.';

-- ============================================================================
-- ADD ADMIN POLICIES
-- ============================================================================

-- Drop the Stage 1 insert policy (will be replaced with better one)
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- INSERT: Users can create own record OR admins can create any user
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (
    -- Allow if: user is creating their own record OR user is an admin
    (SELECT auth.uid()) = id
    OR
    current_user_is_admin()
  );

-- DELETE: Admins can delete any user
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (
    current_user_is_admin()
  );

-- ============================================================================
-- EXPLANATION:
-- ============================================================================
-- The key difference from before:
--
-- BEFORE (caused circular dependency):
--   Policy → is_admin() → has_min_privilege() → SELECT FROM users
--   → RLS triggers → Policy → is_admin() → ...infinite loop
--
-- NOW (no circular dependency):
--   Policy → current_user_is_admin() → SELECT FROM users (RLS BYPASSED)
--   → Direct result, no RLS evaluation → No loop
--
-- SECURITY DEFINER allows the function to bypass RLS when querying users table.
-- This is safe because:
-- 1. The function only returns true/false (doesn't leak user data)
-- 2. It only checks the CURRENT user's privilege (auth.uid())
-- 3. It's used only for access control, not data retrieval
-- ============================================================================
