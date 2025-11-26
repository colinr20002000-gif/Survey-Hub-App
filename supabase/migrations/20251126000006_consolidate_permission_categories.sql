-- Migration: Consolidate Duplicate Permission Categories
-- Date: 2025-11-26
-- Description: Fix duplicate and inconsistent category names in privilege_permissions table
-- Issues:
--   1. "Equipment" and "Equipment Management" should be one category
--   2. "Vehicles" and "Vehicle Management" should be one category
--   3. Multiple "Vehicle Inspection" entries with whitespace/formatting issues

-- ============================================================================
-- STEP 1: Consolidate "Equipment" and "Equipment Management" into "Equipment Management"
-- ============================================================================

UPDATE privilege_permissions
SET permission_category = 'Equipment Management'
WHERE permission_category = 'Equipment';

-- ============================================================================
-- STEP 2: Consolidate "Vehicles" and "Vehicle Management" into "Vehicle Management"
-- ============================================================================

UPDATE privilege_permissions
SET permission_category = 'Vehicle Management'
WHERE permission_category = 'Vehicles';

-- ============================================================================
-- STEP 3: Consolidate all Vehicle Inspection categories (fix whitespace issues)
-- ============================================================================

-- Fix entries with line breaks and extra whitespace
UPDATE privilege_permissions
SET permission_category = 'Vehicle Inspection'
WHERE permission_category LIKE '%Vehicle%Inspection%'
  AND permission_category != 'Vehicle Inspection';

-- Alternative: Update any variation that contains "Vehicle" and "Inspection"
UPDATE privilege_permissions
SET permission_category = 'Vehicle Inspection'
WHERE permission_category IN (
    'Vehicle\r\n  Inspection',
    'Vehicle        \r\n  Inspection',
    'Vehicle  Inspection'
);

-- Trim any remaining whitespace
UPDATE privilege_permissions
SET permission_category = TRIM(permission_category)
WHERE permission_category LIKE '%  %' OR permission_category LIKE E'%\r\n%';

-- ============================================================================
-- STEP 4: Verify consolidation
-- ============================================================================

DO $$
DECLARE
  category_count INTEGER;
  equipment_count INTEGER;
  vehicle_mgmt_count INTEGER;
  vehicle_inspection_count INTEGER;
BEGIN
  -- Check total unique categories
  SELECT COUNT(DISTINCT permission_category) INTO category_count
  FROM privilege_permissions;

  -- Check specific categories
  SELECT COUNT(DISTINCT permission_category) INTO equipment_count
  FROM privilege_permissions
  WHERE permission_category LIKE '%Equipment%';

  SELECT COUNT(DISTINCT permission_category) INTO vehicle_mgmt_count
  FROM privilege_permissions
  WHERE permission_category LIKE '%Vehicle%'
    AND permission_category NOT LIKE '%Inspection%';

  SELECT COUNT(DISTINCT permission_category) INTO vehicle_inspection_count
  FROM privilege_permissions
  WHERE permission_category LIKE '%Inspection%';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total unique categories: %', category_count;
  RAISE NOTICE 'Equipment categories: % (should be 1)', equipment_count;
  RAISE NOTICE 'Vehicle Management categories: % (should be 1)', vehicle_mgmt_count;
  RAISE NOTICE 'Vehicle Inspection categories: % (should be 1)', vehicle_inspection_count;

  IF equipment_count = 1 AND vehicle_mgmt_count = 1 AND vehicle_inspection_count = 1 THEN
    RAISE NOTICE '✅ All categories consolidated successfully!';
  ELSE
    RAISE WARNING '⚠️  Some categories may still need consolidation';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 5: Show final category list
-- ============================================================================

DO $$
DECLARE
  category_record RECORD;
BEGIN
  RAISE NOTICE 'Final category list:';
  FOR category_record IN
    SELECT permission_category, COUNT(*) as count
    FROM privilege_permissions
    GROUP BY permission_category
    ORDER BY permission_category
  LOOP
    RAISE NOTICE '  - %: % permissions', category_record.permission_category, category_record.count;
  END LOOP;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Permission categories consolidated:';
  RAISE NOTICE '  • Equipment → Equipment Management';
  RAISE NOTICE '  • Vehicles → Vehicle Management';
  RAISE NOTICE '  • Fixed Vehicle Inspection formatting';
  RAISE NOTICE '========================================';
END $$;
