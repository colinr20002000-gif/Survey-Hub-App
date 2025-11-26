-- Migration: Add DELETE_EQUIPMENT_COMMENTS and DELETE_VEHICLE_COMMENTS to privilege_permissions
-- Date: 2025-11-26
-- Description: Add new permissions to the privilege_permissions table so they appear in the Privilege Overview UI

-- ============================================================================
-- STEP 1: Add DELETE_EQUIPMENT_COMMENTS permission
-- ============================================================================

-- Delete existing entries if they exist (to avoid duplicates)
DELETE FROM privilege_permissions WHERE permission_key = 'DELETE_EQUIPMENT_COMMENTS';

-- Insert DELETE_EQUIPMENT_COMMENTS for all privilege levels
-- Only Editor, Editor+, Admin, and Super Admin should have this permission by default
INSERT INTO privilege_permissions (
    permission_key,
    privilege_level,
    permission_label,
    permission_category,
    is_granted,
    display_order
)
VALUES
    ('DELETE_EQUIPMENT_COMMENTS', 'Viewer', 'Delete Any Equipment Comment', 'Equipment Management', false, 300),
    ('DELETE_EQUIPMENT_COMMENTS', 'Viewer+', 'Delete Any Equipment Comment', 'Equipment Management', false, 301),
    ('DELETE_EQUIPMENT_COMMENTS', 'Editor', 'Delete Any Equipment Comment', 'Equipment Management', true, 302),
    ('DELETE_EQUIPMENT_COMMENTS', 'Editor+', 'Delete Any Equipment Comment', 'Equipment Management', true, 303),
    ('DELETE_EQUIPMENT_COMMENTS', 'Admin', 'Delete Any Equipment Comment', 'Equipment Management', true, 304),
    ('DELETE_EQUIPMENT_COMMENTS', 'Super Admin', 'Delete Any Equipment Comment', 'Equipment Management', true, 305);

-- ============================================================================
-- STEP 2: Add DELETE_VEHICLE_COMMENTS permission
-- ============================================================================

-- Delete existing entries if they exist (to avoid duplicates)
DELETE FROM privilege_permissions WHERE permission_key = 'DELETE_VEHICLE_COMMENTS';

-- Insert DELETE_VEHICLE_COMMENTS for all privilege levels
-- Only Editor, Editor+, Admin, and Super Admin should have this permission by default
INSERT INTO privilege_permissions (
    permission_key,
    privilege_level,
    permission_label,
    permission_category,
    is_granted,
    display_order
)
VALUES
    ('DELETE_VEHICLE_COMMENTS', 'Viewer', 'Delete Any Vehicle Comment', 'Vehicle Management', false, 400),
    ('DELETE_VEHICLE_COMMENTS', 'Viewer+', 'Delete Any Vehicle Comment', 'Vehicle Management', false, 401),
    ('DELETE_VEHICLE_COMMENTS', 'Editor', 'Delete Any Vehicle Comment', 'Vehicle Management', true, 402),
    ('DELETE_VEHICLE_COMMENTS', 'Editor+', 'Delete Any Vehicle Comment', 'Vehicle Management', true, 403),
    ('DELETE_VEHICLE_COMMENTS', 'Admin', 'Delete Any Vehicle Comment', 'Vehicle Management', true, 404),
    ('DELETE_VEHICLE_COMMENTS', 'Super Admin', 'Delete Any Vehicle Comment', 'Vehicle Management', true, 405);

-- ============================================================================
-- STEP 3: Verify permissions were added
-- ============================================================================
DO $$
DECLARE
  equipment_count INTEGER;
  vehicle_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO equipment_count
  FROM privilege_permissions
  WHERE permission_key = 'DELETE_EQUIPMENT_COMMENTS';

  SELECT COUNT(*) INTO vehicle_count
  FROM privilege_permissions
  WHERE permission_key = 'DELETE_VEHICLE_COMMENTS';

  IF equipment_count = 6 AND vehicle_count = 6 THEN
    RAISE NOTICE '✅ Both DELETE comment permissions added successfully (6 entries each)';
  ELSE
    RAISE WARNING '⚠️  Expected 12 total entries, but found equipment: %, vehicle: %',
      equipment_count, vehicle_count;
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'DELETE_EQUIPMENT_COMMENTS and DELETE_VEHICLE_COMMENTS';
  RAISE NOTICE 'permissions added to Privilege Overview';
  RAISE NOTICE 'Admins can now configure who can delete comments';
  RAISE NOTICE '========================================';
END $$;
