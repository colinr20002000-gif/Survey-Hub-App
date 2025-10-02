-- ============================================================================
-- DIAGNOSTIC: Find ALL policies that might query users table
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '========== CHECKING ALL POLICIES FOR CIRCULAR DEPENDENCIES ==========';

  FOR policy_record IN
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd,
      COALESCE(qual::text, '') as using_clause,
      COALESCE(with_check::text, '') as check_clause
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        -- Look for policies that reference users table or helper functions
        qual::text LIKE '%users%'
        OR with_check::text LIKE '%users%'
        OR qual::text LIKE '%is_admin%'
        OR with_check::text LIKE '%is_admin%'
        OR qual::text LIKE '%is_editor%'
        OR with_check::text LIKE '%is_editor%'
        OR qual::text LIKE '%is_viewer%'
        OR with_check::text LIKE '%is_viewer%'
        OR qual::text LIKE '%has_min_privilege%'
        OR with_check::text LIKE '%has_min_privilege%'
        OR qual::text LIKE '%current_user_privilege%'
        OR with_check::text LIKE '%current_user_privilege%'
      )
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Table: % | Policy: % | Command: %',
      policy_record.tablename, policy_record.policyname, policy_record.cmd;

    IF policy_record.using_clause != '' THEN
      RAISE NOTICE '  USING: %', policy_record.using_clause;
    END IF;

    IF policy_record.check_clause != '' THEN
      RAISE NOTICE '  CHECK: %', policy_record.check_clause;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========== END OF DIAGNOSTIC ==========';
END $$;
