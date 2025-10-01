-- ============================================================================
-- Optimize RLS Performance - Fix Query Timeouts
-- ============================================================================
-- This migration fixes slow RLS queries by:
-- 1. Optimizing auth function calls (use SELECT to prevent re-evaluation)
-- 2. Adding indexes for faster lookups
-- 3. Improving helper function performance
-- ============================================================================

-- ============================================================================
-- OPTIMIZED HELPER FUNCTIONS (using CREATE OR REPLACE)
-- ============================================================================

-- Function to get current user's privilege level (OPTIMIZED)
CREATE OR REPLACE FUNCTION public.current_user_privilege()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT privilege
    FROM public.users
    WHERE id = (SELECT auth.uid())
    LIMIT 1
  );
END;
$$;

-- Function to check if user has minimum privilege level (OPTIMIZED)
CREATE OR REPLACE FUNCTION public.has_min_privilege(required_privilege TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_priv TEXT;
  user_level NUMERIC;
  required_level NUMERIC;
  privilege_levels JSONB := '{
    "Viewer": 1,
    "Viewer+": 2,
    "Editor": 3,
    "Editor+": 3.5,
    "Admin": 4,
    "Super Admin": 5
  }'::jsonb;
BEGIN
  -- Get user privilege (uses index on users.id)
  SELECT privilege INTO user_priv
  FROM public.users
  WHERE id = (SELECT auth.uid())
  LIMIT 1;

  -- If user not found, return false
  IF user_priv IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get numeric levels
  user_level := (privilege_levels->>user_priv)::NUMERIC;
  required_level := (privilege_levels->>required_privilege)::NUMERIC;

  -- Handle NULL cases
  IF user_level IS NULL OR required_level IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN user_level >= required_level;
END;
$$;

-- Function to check if user is admin or above (OPTIMIZED)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_min_privilege('Admin');
END;
$$;

-- Function to check if user is editor or above (OPTIMIZED)
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_min_privilege('Editor');
END;
$$;

-- Function to check if user is viewer+ or above (OPTIMIZED)
CREATE OR REPLACE FUNCTION public.is_viewer_plus()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_min_privilege('Viewer+');
END;
$$;

-- ============================================================================
-- ADD PERFORMANCE INDEXES (if they don't exist)
-- ============================================================================

-- Index on users.id for fast auth lookups (should already exist as PK)
-- Index on users.privilege for filtering
DO $$
BEGIN
  -- Check if privilege index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND indexname = 'idx_users_privilege_lookup'
  ) THEN
    CREATE INDEX idx_users_privilege_lookup ON public.users(id, privilege);
  END IF;
END $$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.current_user_privilege() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_privilege(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer_plus() TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Helper functions are now optimized with:
-- - STABLE functions (can be cached during query)
-- - search_path set (prevents search_path attacks)
-- - SELECT auth.uid() (prevents re-evaluation per row)
-- - Composite index for faster lookups
-- ============================================================================
