-- ============================================================================
-- Diagnose and Fix RLS for Resource Allocations
-- ============================================================================

-- Show all current policies on resource_allocations
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '========== Current RLS Policies on resource_allocations ==========';
  FOR policy_record IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resource_allocations'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % (Command: %)', policy_record.policyname, policy_record.cmd;
  END LOOP;
END $$;

-- Drop ALL existing policies on resource_allocations
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resource_allocations'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_name) || ' ON public.resource_allocations';
    RAISE NOTICE 'Dropped policy: %', policy_name;
  END LOOP;
END $$;

-- Create SIMPLE, EXPLICIT policies for resource_allocations
-- SELECT: Everyone can view
CREATE POLICY "resource_allocations_select_all"
  ON public.resource_allocations
  FOR SELECT
  USING (true);

-- INSERT: Editor, Editor+, Admin, Super Admin
CREATE POLICY "resource_allocations_insert"
  ON public.resource_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- UPDATE: Viewer+, Editor, Editor+, Admin, Super Admin
CREATE POLICY "resource_allocations_update"
  ON public.resource_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- DELETE: Editor, Editor+, Admin, Super Admin
CREATE POLICY "resource_allocations_delete"
  ON public.resource_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
      LIMIT 1
    )
  );

-- Verify colin.rogers@inorail.co.uk can insert
DO $$
DECLARE
  user_id UUID;
  user_priv TEXT;
  can_insert BOOLEAN;
BEGIN
  SELECT id, privilege INTO user_id, user_priv
  FROM public.users
  WHERE email = 'colin.rogers@inorail.co.uk';

  RAISE NOTICE '========== Verification ==========';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Privilege: %', user_priv;
  RAISE NOTICE 'Can insert (Editor+, Admin, etc.): %',
    user_priv IN ('Editor', 'Editor+', 'Admin', 'Super Admin');
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
