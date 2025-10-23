-- ============================================================================
-- DIAGNOSTIC: Check Current RLS Policies on Users Table
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '========== CURRENT POLICIES ON users TABLE ==========';

  FOR policy_record IN
    SELECT
      policyname,
      cmd,
      COALESCE(qual::text, 'NULL') as using_clause,
      COALESCE(with_check::text, 'NULL') as check_clause
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % | Command: %', policy_record.policyname, policy_record.cmd;
    RAISE NOTICE '  USING: %', policy_record.using_clause;
    RAISE NOTICE '  CHECK: %', policy_record.check_clause;
    RAISE NOTICE '---';
  END LOOP;

  RAISE NOTICE '========== END OF POLICIES ==========';
END $$;
