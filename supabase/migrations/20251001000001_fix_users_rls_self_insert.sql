-- ============================================================================
-- Fix Users Table RLS - Allow Self-Registration
-- ============================================================================
-- This migration fixes the timeout issue during authentication by allowing
-- users to insert their own record when they first sign in
-- ============================================================================

-- Drop the old admin-only insert policy
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;

-- Create new policy: users can insert their own record
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Keep admin ability to insert any user
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================================
-- EXPLANATION:
-- ============================================================================
-- With multiple policies, PostgreSQL uses OR logic
-- Users can now INSERT if either:
-- 1. They are inserting their own record (auth.uid() = id)
-- 2. They are an admin (public.is_admin())
--
-- This fixes the authentication timeout because new users can now create
-- their own user record in the users table during first sign-in
-- ============================================================================
