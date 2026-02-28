-- =========================================================
-- ULTIMATE TIMESHEET & USER ADMIN FIX
-- Run this in Supabase SQL Editor to resolve all remaining errors.
-- =========================================================

-- 1. ADD MISSING COLUMNS (FIXES ALL ERRORS)
DO $$ 
BEGIN
    -- Fix timesheet_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='dropdown_item_id') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN dropdown_item_id UUID REFERENCES dropdown_items(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='project_id') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE;
    END IF;

    -- Fix timesheet_entries
    -- Remove broken subtask relationship if it exists
    ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_subtask_id_fkey;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='subtask_id') THEN
        ALTER TABLE timesheet_entries ADD COLUMN subtask_id TEXT;
    ELSE
        ALTER TABLE timesheet_entries ALTER COLUMN subtask_id TYPE TEXT;
    END IF;

    -- Fix users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='line_manager_id') THEN
        ALTER TABLE users ADD COLUMN line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Fix dummy_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dummy_users' AND column_name='line_manager_id') THEN
        ALTER TABLE dummy_users ADD COLUMN line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. ENSURE DROPDOWN CATEGORY EXISTS
INSERT INTO dropdown_categories (name, description)
VALUES ('Timesheet Sub_Tasks', 'Global subtasks for timesheets')
ON CONFLICT (name) DO NOTHING;

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
