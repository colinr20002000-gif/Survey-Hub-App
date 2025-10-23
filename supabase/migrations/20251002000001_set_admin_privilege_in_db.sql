-- ============================================================================
-- Set Admin Privilege in Database for Super Admin
-- ============================================================================
-- This fixes the issue where the super admin override was only happening
-- in the frontend React state, but the database still had the original privilege.
-- The RLS policies check the database privilege column, not React state.
-- ============================================================================

-- Update colin.rogers@inorail.co.uk to Admin in the database
UPDATE public.users
SET privilege = 'Admin'
WHERE email = 'colin.rogers@inorail.co.uk'
  AND privilege != 'Admin';

-- Verify (this will show in migration logs)
DO $$
DECLARE
  current_priv TEXT;
BEGIN
  SELECT privilege INTO current_priv
  FROM public.users
  WHERE email = 'colin.rogers@inorail.co.uk';

  RAISE NOTICE 'colin.rogers@inorail.co.uk privilege is now: %', current_priv;
END $$;
