-- Migration: Add Availability Status Time-Restricted Permissions to Privilege Overview
-- Date: 2025-11-26
-- Description: Add EDIT_AVAILABILITY_STATUS_24H and EDIT_ANY_AVAILABILITY_STATUS permissions
-- to privilege_permissions table for admin configuration

-- ============================================================================
-- STEP 1: Add EDIT_AVAILABILITY_STATUS_24H permission
-- ============================================================================

-- Delete existing entries if they exist (to avoid duplicates)
DELETE FROM privilege_permissions WHERE permission_key = 'EDIT_AVAILABILITY_STATUS_24H';

-- Insert EDIT_AVAILABILITY_STATUS_24H for all privilege levels
-- Viewer+ and above should have this permission by default (24h edit window)
INSERT INTO privilege_permissions (
    permission_key,
    privilege_level,
    permission_label,
    permission_category,
    is_granted,
    display_order
)
VALUES
    ('EDIT_AVAILABILITY_STATUS_24H', 'Viewer', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', false, 500),
    ('EDIT_AVAILABILITY_STATUS_24H', 'Viewer+', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', true, 501),
    ('EDIT_AVAILABILITY_STATUS_24H', 'Editor', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', true, 502),
    ('EDIT_AVAILABILITY_STATUS_24H', 'Editor+', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', true, 503),
    ('EDIT_AVAILABILITY_STATUS_24H', 'Admin', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', true, 504),
    ('EDIT_AVAILABILITY_STATUS_24H', 'Super Admin', 'Edit Own Availability Status (24h Window)', 'Resource Calendar', true, 505);

-- ============================================================================
-- STEP 2: Add EDIT_ANY_AVAILABILITY_STATUS permission
-- ============================================================================

-- Delete existing entries if they exist (to avoid duplicates)
DELETE FROM privilege_permissions WHERE permission_key = 'EDIT_ANY_AVAILABILITY_STATUS';

-- Insert EDIT_ANY_AVAILABILITY_STATUS for all privilege levels
-- Only Editor+ and above should have this permission by default (unrestricted editing)
INSERT INTO privilege_permissions (
    permission_key,
    privilege_level,
    permission_label,
    permission_category,
    is_granted,
    display_order
)
VALUES
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Viewer', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', false, 600),
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Viewer+', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', false, 601),
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Editor', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', true, 602),
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Editor+', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', true, 603),
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Admin', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', true, 604),
    ('EDIT_ANY_AVAILABILITY_STATUS', 'Super Admin', 'Edit Any Availability Status (No Time Limit)', 'Resource Calendar', true, 605);

-- ============================================================================
-- STEP 3: Verify permissions were added
-- ============================================================================

DO $$
DECLARE
  edit_24h_count INTEGER;
  edit_any_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO edit_24h_count
  FROM privilege_permissions
  WHERE permission_key = 'EDIT_AVAILABILITY_STATUS_24H';

  SELECT COUNT(*) INTO edit_any_count
  FROM privilege_permissions
  WHERE permission_key = 'EDIT_ANY_AVAILABILITY_STATUS';

  IF edit_24h_count = 6 AND edit_any_count = 6 THEN
    RAISE NOTICE '✅ Both availability status permissions added successfully (6 entries each)';
  ELSE
    RAISE WARNING '⚠️  Expected 12 total entries, but found 24h: %, any: %',
      edit_24h_count, edit_any_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Display permission descriptions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Availability Status Permissions Added:';
  RAISE NOTICE '';
  RAISE NOTICE '1. EDIT_AVAILABILITY_STATUS_24H';
  RAISE NOTICE '   Allows users to edit/delete their own';
  RAISE NOTICE '   availability status within 24 hours';
  RAISE NOTICE '   Default: Viewer+ and above';
  RAISE NOTICE '';
  RAISE NOTICE '2. EDIT_ANY_AVAILABILITY_STATUS';
  RAISE NOTICE '   Allows unrestricted editing of any';
  RAISE NOTICE '   availability status (no time limit)';
  RAISE NOTICE '   Default: Editor and above';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Availability status time-restricted permissions';
  RAISE NOTICE 'added to Privilege Overview';
  RAISE NOTICE 'Admins can now configure these features';
  RAISE NOTICE '========================================';
END $$;
