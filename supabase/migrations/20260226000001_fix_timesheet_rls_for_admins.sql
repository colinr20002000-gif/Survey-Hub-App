-- Explicitly allow Admins and Editors to manage ALL timesheets
-- This fixes the "new row violates row-level security policy" error

-- 1. DROP old policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Admins can insert all timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Admins can update all timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Admins can manage all timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Management can manage all timesheets" ON public.timesheets;

-- 2. CREATE a single, robust "Super Policy" for management
CREATE POLICY "Management can manage all timesheets" ON public.timesheets
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    );

-- 3. DO the same for entries so they can add hours
DROP POLICY IF EXISTS "Admins can manage all entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Management can manage all entries" ON public.timesheet_entries;
CREATE POLICY "Management can manage all entries" ON public.timesheet_entries
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    );

-- 4. Refresh schema
NOTIFY pgrst, 'reload schema';
