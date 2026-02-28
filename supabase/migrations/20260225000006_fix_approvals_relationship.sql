-- =========================================================
-- TIMESHEET APPROVALS FIX
-- This script fixes the "Could not find a relationship" error 
-- on the Approvals page by linking timesheets to the public users table.
-- =========================================================

DO $$ 
BEGIN
    -- 1. Update the foreign key to point to the public.users table
    -- First, drop the old constraint that points to auth.users
    ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_user_id_fkey;
    
    -- Add the new constraint pointing to public.users
    -- This allows PostgREST (Supabase API) to "see" the relationship for joins
    ALTER TABLE timesheets 
    ADD CONSTRAINT timesheets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 2. Do the same for timesheet_entries just in case
    ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_user_id_fkey;
    -- Note: entries usually link via timesheet_id, but if you add user_id directly later, 
    -- it should point to public.users.
END $$;

-- 3. Ensure the line_manager_id in users is also properly indexed for speed
CREATE INDEX IF NOT EXISTS idx_users_line_manager ON public.users(line_manager_id);

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
