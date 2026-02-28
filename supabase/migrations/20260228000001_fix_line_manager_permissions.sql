-- =========================================================
-- LINE MANAGER TIMESHEET PERMISSIONS FIX
-- Allows Line Managers to view and edit their staff's timesheets
-- =========================================================

-- 1. TIMESHEETS TABLE POLICIES
-- Drop old manager policies
DROP POLICY IF EXISTS "Managers can view assigned timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Managers can approve/reject timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Managers can manage staff timesheets" ON public.timesheets;

-- Create comprehensive policy for Line Managers on Timesheets
CREATE POLICY "Line Managers can manage staff timesheets" ON public.timesheets
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = timesheets.user_id 
            AND users.line_manager_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = timesheets.user_id 
            AND users.line_manager_id = auth.uid()
        )
    );

-- 2. TIMESHEET_ENTRIES TABLE POLICIES
-- Drop old manager policies
DROP POLICY IF EXISTS "Managers can view assigned entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Managers can manage staff entries" ON public.timesheet_entries;

-- Create comprehensive policy for Line Managers on Timesheet Entries
CREATE POLICY "Line Managers can manage staff entries" ON public.timesheet_entries
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.timesheets
            JOIN public.users ON timesheets.user_id = users.id
            WHERE timesheets.id = timesheet_entries.timesheet_id
            AND users.line_manager_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.timesheets
            JOIN public.users ON timesheets.user_id = users.id
            WHERE timesheets.id = timesheet_entries.timesheet_id
            AND users.line_manager_id = auth.uid()
        )
    );

-- 3. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
