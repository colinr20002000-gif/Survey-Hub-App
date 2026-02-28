-- =========================================================
-- SUPPORT DUMMY USER TIMESHEETS
-- Removes strict foreign key constraints to allow dummy users
-- to have timesheets and manager assignments.
-- =========================================================

-- 1. Fix timesheets table
-- Remove strict reference to auth.users to allow public.dummy_users IDs
ALTER TABLE IF EXISTS public.timesheets 
DROP CONSTRAINT IF EXISTS timesheets_user_id_fkey;

-- 2. Fix manager_assignments table
-- Remove strict reference to auth.users to allow public.dummy_users IDs
ALTER TABLE IF EXISTS public.manager_assignments
DROP CONSTRAINT IF EXISTS manager_assignments_user_id_fkey;

-- 3. Update RLS for timesheets to support line managers viewing dummy users
-- Managers can view timesheets of users they manage (both real and dummy)
DROP POLICY IF EXISTS "Managers can view assigned timesheets" ON public.timesheets;
CREATE POLICY "Managers can view assigned timesheets" ON public.timesheets 
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = timesheets.user_id AND users.line_manager_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.dummy_users 
        WHERE dummy_users.id = timesheets.user_id AND dummy_users.line_manager_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.privilege IN ('Admin', 'Super Admin')
    )
);

-- Managers can update timesheets of users they manage
DROP POLICY IF EXISTS "Managers can approve/reject timesheets" ON public.timesheets;
CREATE POLICY "Managers can approve/reject timesheets" ON public.timesheets 
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = timesheets.user_id AND users.line_manager_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.dummy_users 
        WHERE dummy_users.id = timesheets.user_id AND dummy_users.line_manager_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.privilege IN ('Admin', 'Super Admin')
    )
);

-- 4. Update Timesheet Entries RLS
DROP POLICY IF EXISTS "Managers can view assigned entries" ON public.timesheet_entries;
CREATE POLICY "Managers can view assigned entries" ON public.timesheet_entries
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.timesheets
        WHERE timesheets.id = timesheet_entries.timesheet_id
        AND (
            EXISTS (SELECT 1 FROM public.users WHERE users.id = timesheets.user_id AND users.line_manager_id = auth.uid())
            OR
            EXISTS (SELECT 1 FROM public.dummy_users WHERE dummy_users.id = timesheets.user_id AND dummy_users.line_manager_id = auth.uid())
            OR
            EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.privilege IN ('Admin', 'Super Admin'))
        )
    )
);

-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
