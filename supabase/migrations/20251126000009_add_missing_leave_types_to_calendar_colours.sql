-- Migration: Add Missing Leave Types to Calendar Colours
-- Date: 2025-11-26
-- Description: Add missing leave types that exist in the codebase but not in calendar_colours table
-- Missing items: Annual Leave (am), Annual Leave (pm), Compassionate Leave, Enforced Rest,
--                Travel Shift, Paternity Leave, Xmas, No Assignment

-- ============================================================================
-- STEP 1: Insert missing leave types
-- ============================================================================

-- Default purple color for leave types: #d8b4fe (purple-300 equivalent)
INSERT INTO calendar_colours (
    calendar_type,
    category_type,
    category_value,
    category_display,
    colour
)
VALUES
    -- Annual Leave variants
    ('resource', 'leave', 'Annual Leave (am)', 'Annual Leave (am)', '#d8b4fe'),
    ('resource', 'leave', 'Annual Leave (pm)', 'Annual Leave (pm)', '#d8b4fe'),

    -- Additional leave types
    ('resource', 'leave', 'Compassionate Leave', 'Compassionate Leave', '#d8b4fe'),
    ('resource', 'leave', 'Enforced Rest', 'Enforced Rest', '#d8b4fe'),
    ('resource', 'leave', 'Travel Shift', 'Travel Shift', '#d8b4fe'),
    ('resource', 'leave', 'Paternity Leave', 'Paternity Leave', '#d8b4fe'),
    ('resource', 'leave', 'Xmas', 'Xmas', '#d8b4fe'),
    ('resource', 'leave', 'No Assignment', 'No Assignment', '#d8b4fe')
ON CONFLICT DO NOTHING;  -- Skip if already exists

-- ============================================================================
-- STEP 2: Verify all leave types are now in the database
-- ============================================================================

DO $$
DECLARE
  leave_count INTEGER;
  expected_count INTEGER := 16;  -- Total expected leave types
BEGIN
  SELECT COUNT(*) INTO leave_count
  FROM calendar_colours
  WHERE calendar_type = 'resource'
    AND category_type = 'leave';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Leave types in calendar_colours: %', leave_count;
  RAISE NOTICE 'Expected leave types: %', expected_count;

  IF leave_count >= expected_count THEN
    RAISE NOTICE '✅ All leave types present in database!';
  ELSE
    RAISE WARNING '⚠️  Missing % leave types', expected_count - leave_count;
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: Display all leave types for verification
-- ============================================================================

DO $$
DECLARE
  leave_record RECORD;
BEGIN
  RAISE NOTICE 'Complete list of leave types in calendar_colours:';
  FOR leave_record IN
    SELECT category_value, colour
    FROM calendar_colours
    WHERE calendar_type = 'resource'
      AND category_type = 'leave'
    ORDER BY category_value
  LOOP
    RAISE NOTICE '  - %: %', leave_record.category_value, leave_record.colour;
  END LOOP;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration Complete!';
  RAISE NOTICE 'Added 8 missing leave types:';
  RAISE NOTICE '  • Annual Leave (am)';
  RAISE NOTICE '  • Annual Leave (pm)';
  RAISE NOTICE '  • Compassionate Leave';
  RAISE NOTICE '  • Enforced Rest';
  RAISE NOTICE '  • Travel Shift';
  RAISE NOTICE '  • Paternity Leave';
  RAISE NOTICE '  • Xmas';
  RAISE NOTICE '  • No Assignment';
  RAISE NOTICE '========================================';
END $$;
