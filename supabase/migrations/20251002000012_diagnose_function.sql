-- ============================================================================
-- DIAGNOSTIC: Check current_user_is_admin Function
-- ============================================================================

DO $$
DECLARE
  func_def TEXT;
BEGIN
  RAISE NOTICE '========== CHECKING current_user_is_admin FUNCTION ==========';

  -- Check if function exists
  SELECT pg_get_functiondef(oid) INTO func_def
  FROM pg_proc
  WHERE proname = 'current_user_is_admin'
    AND pronamespace = 'public'::regnamespace;

  IF func_def IS NOT NULL THEN
    RAISE NOTICE 'Function definition:';
    RAISE NOTICE '%', func_def;
  ELSE
    RAISE NOTICE 'Function current_user_is_admin NOT FOUND!';
  END IF;

  RAISE NOTICE '========== END ==========';
END $$;

-- Test the function
DO $$
BEGIN
  RAISE NOTICE 'Testing current_user_is_admin(): %', current_user_is_admin();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error testing function: %', SQLERRM;
END $$;
