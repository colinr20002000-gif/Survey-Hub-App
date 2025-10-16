-- ============================================================================
-- Verify All Users Exist and Have Correct Privileges
-- ============================================================================

-- Check for users who authenticated but don't have records in users table
DO $$
DECLARE
  user_count INTEGER;
  user_record RECORD;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO user_count FROM public.users;
  RAISE NOTICE 'Total users in users table: %', user_count;

  -- List all users
  RAISE NOTICE '========== All Users ==========';
  FOR user_record IN
    SELECT email, privilege, id
    FROM public.users
    ORDER BY email
  LOOP
    RAISE NOTICE 'Email: %, Privilege: %, ID: %',
      user_record.email, user_record.privilege, user_record.id;
  END LOOP;
END $$;

-- Ensure colinr2000@hotmail.co.uk has a record if they exist in auth.users
DO $$
DECLARE
  auth_user_id UUID;
  existing_user RECORD;
BEGIN
  -- Check if this user exists in auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'colinr2000@hotmail.co.uk'
  LIMIT 1;

  IF auth_user_id IS NOT NULL THEN
    RAISE NOTICE 'User colinr2000@hotmail.co.uk exists in auth.users with ID: %', auth_user_id;

    -- Check if they have a record in public.users
    SELECT * INTO existing_user
    FROM public.users
    WHERE id = auth_user_id;

    IF existing_user IS NULL THEN
      RAISE NOTICE 'Creating missing user record for colinr2000@hotmail.co.uk';

      -- Insert the missing user record
      INSERT INTO public.users (id, email, name, username, team_role, avatar, privilege)
      VALUES (
        auth_user_id,
        'colinr2000@hotmail.co.uk',
        'Colin Rogers',
        'colinr2000',
        'Site Team',
        'CR',
        'Viewer+'
      )
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        privilege = EXCLUDED.privilege;

      RAISE NOTICE 'User record created/updated for colinr2000@hotmail.co.uk';
    ELSE
      RAISE NOTICE 'User record already exists: Email: %, Privilege: %',
        existing_user.email, existing_user.privilege;
    END IF;
  ELSE
    RAISE NOTICE 'User colinr2000@hotmail.co.uk does not exist in auth.users';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
