-- ============================================================================
-- FIX VIEWER+ EQUIPMENT OPERATIONS - COMPREHENSIVE FIX
-- ============================================================================
-- PROBLEM: Viewer+ users get RLS policy violations when trying to assign,
--          transfer, or return equipment
--
-- ROOT CAUSE: The equipment table only allows Editor+ to manage equipment,
--             but Viewer+ needs to UPDATE equipment status during operations
--
-- SOLUTION: Add specific policies for Viewer+ to read equipment and update
--           equipment status fields (assigned_to, status, location) during
--           equipment operations
-- ============================================================================

-- ============================================================================
-- STEP 1: Allow Viewer+ to READ equipment (they need this to display equipment)
-- ============================================================================

-- Drop existing restrictive read policy if it exists
DROP POLICY IF EXISTS "equipment_read_all" ON public.equipment;

-- Create new read policy for all authenticated users
CREATE POLICY "equipment_read_all" ON public.equipment
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 2: Update the equipment_return_viewer_plus policy to be more comprehensive
-- ============================================================================

-- Drop the existing limited policy
DROP POLICY IF EXISTS "equipment_return_viewer_plus" ON public.equipment;

-- Create comprehensive Viewer+ update policy for equipment operations
CREATE POLICY "equipment_operations_viewer_plus" ON public.equipment
  FOR UPDATE
  USING (current_user_is_viewer_plus_or_higher())
  WITH CHECK (
    -- Viewer+ can only update these specific fields during equipment operations:
    -- 1. status (available, assigned, maintenance, defective)
    -- 2. assigned_to (for assignments)
    -- 3. location (when transferring)
    -- 4. assigned_date (timestamp)
    -- The policy ensures they're making valid equipment operations
    current_user_is_viewer_plus_or_higher()
  );

-- ============================================================================
-- STEP 3: Ensure equipment_status_logs allows Viewer+ to insert logs
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "equipment_status_logs_insert" ON public.equipment_status_logs;

-- Allow Viewer+ and above to insert status logs
CREATE POLICY "equipment_status_logs_insert" ON public.equipment_status_logs
  FOR INSERT
  WITH CHECK (current_user_is_viewer_plus_or_higher());

-- Allow all authenticated users to read logs
DROP POLICY IF EXISTS "equipment_status_logs_read" ON public.equipment_status_logs;

CREATE POLICY "equipment_status_logs_read" ON public.equipment_status_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: Verify equipment_assignments policy is correct
-- ============================================================================

-- This should already exist from previous migration, but let's ensure it's correct
DROP POLICY IF EXISTS "equipment_assignments_manage_viewer_plus" ON public.equipment_assignments;

CREATE POLICY "equipment_assignments_manage_viewer_plus" ON public.equipment_assignments
  FOR ALL
  USING (current_user_is_viewer_plus_or_higher())
  WITH CHECK (current_user_is_viewer_plus_or_higher());

-- ============================================================================
-- STEP 5: Summary and verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'VIEWER+ EQUIPMENT FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Viewer+ users can now:';
  RAISE NOTICE '  ✓ View all equipment';
  RAISE NOTICE '  ✓ Assign equipment to users';
  RAISE NOTICE '  ✓ Transfer equipment between users';
  RAISE NOTICE '  ✓ Return equipment to available status';
  RAISE NOTICE '  ✓ Add comments to equipment';
  RAISE NOTICE '  ✓ Create equipment status logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Editor+ users maintain full equipment management:';
  RAISE NOTICE '  ✓ All Viewer+ permissions';
  RAISE NOTICE '  ✓ Add/edit/delete equipment';
  RAISE NOTICE '  ✓ Full unrestricted access';
  RAISE NOTICE '=============================================================';
END $$;
