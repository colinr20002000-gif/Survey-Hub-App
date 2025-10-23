-- ============================================================================
-- Useful Contacts - Dashboard Management Only
-- ============================================================================
-- CHANGE: Remove INSERT/UPDATE/DELETE policies from useful_contacts
-- REASON: Prevents circular dependency and restricts Viewer+ from editing
-- ACCESS: Only Supabase Dashboard can manage useful_contacts
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "useful_contacts_select_all" ON public.useful_contacts;
DROP POLICY IF EXISTS "useful_contacts_manage_editor" ON public.useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to read useful contacts" ON public.useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert useful contacts" ON public.useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to update useful contacts" ON public.useful_contacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete useful contacts" ON public.useful_contacts;

-- ============================================================================
-- NEW POLICY: View-Only Access
-- ============================================================================

-- SELECT: Everyone can view useful contacts
CREATE POLICY "useful_contacts_select_all" ON public.useful_contacts
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: No policies = Disabled via app
-- Only Supabase Dashboard (bypasses RLS) can manage useful contacts

-- ============================================================================
-- EXPLANATION:
-- ============================================================================
-- Benefits:
-- 1. No circular dependency (doesn't query users table)
-- 2. Viewer+ cannot insert/update/delete (no policies = no access)
-- 3. Everyone can view useful contacts
-- 4. Admins manage via Supabase Dashboard
--
-- To add/edit/delete useful_contacts:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Table Editor > useful_contacts
-- 3. Make changes directly
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========== Useful Contacts Policy Updated ==========';
  RAISE NOTICE 'View-only access via app';
  RAISE NOTICE 'Manage via Supabase Dashboard only';
  RAISE NOTICE 'Viewer+ cannot insert/edit/delete';
END $$;
