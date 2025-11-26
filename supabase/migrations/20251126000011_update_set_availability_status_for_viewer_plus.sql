-- Migration: Update SET_AVAILABILITY_STATUS permission for Viewer+
-- Date: 2025-11-26
-- Description: Grant Viewer+ the ability to set their own availability status
-- This allows Viewer+ to create availability status entries on the Resource Calendar

-- ============================================================================
-- STEP 1: Update Viewer+ to have SET_AVAILABILITY_STATUS permission
-- ============================================================================

UPDATE privilege_permissions
SET is_granted = true
WHERE permission_key = 'SET_AVAILABILITY_STATUS'
  AND privilege_level = 'Viewer+';

-- ============================================================================
-- STEP 2: Verify the update
-- ============================================================================

DO $$
DECLARE
  viewer_plus_granted BOOLEAN;
BEGIN
  SELECT is_granted INTO viewer_plus_granted
  FROM privilege_permissions
  WHERE permission_key = 'SET_AVAILABILITY_STATUS'
    AND privilege_level = 'Viewer+'
  LIMIT 1;

  IF viewer_plus_granted THEN
    RAISE NOTICE '✅ SET_AVAILABILITY_STATUS granted to Viewer+';
  ELSE
    RAISE WARNING '⚠️  Failed to grant SET_AVAILABILITY_STATUS to Viewer+';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Show current permission status
-- ============================================================================

DO $$
DECLARE
  perm_record RECORD;
BEGIN
  RAISE NOTICE 'SET_AVAILABILITY_STATUS permission status:';
  FOR perm_record IN
    SELECT privilege_level, is_granted
    FROM privilege_permissions
    WHERE permission_key = 'SET_AVAILABILITY_STATUS'
    ORDER BY
      CASE privilege_level
        WHEN 'Viewer' THEN 1
        WHEN 'Viewer+' THEN 2
        WHEN 'Editor' THEN 3
        WHEN 'Editor+' THEN 4
        WHEN 'Admin' THEN 5
        WHEN 'Super Admin' THEN 6
      END
  LOOP
    RAISE NOTICE '  % %: %',
      CASE WHEN perm_record.is_granted THEN '✅' ELSE '❌' END,
      perm_record.privilege_level,
      CASE WHEN perm_record.is_granted THEN 'Granted' ELSE 'Denied' END;
  END LOOP;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Viewer+ now has SET_AVAILABILITY_STATUS permission';
  RAISE NOTICE 'They can create their own availability status';
  RAISE NOTICE 'Combined with 24h edit window, full workflow enabled';
  RAISE NOTICE '========================================';
END $$;
