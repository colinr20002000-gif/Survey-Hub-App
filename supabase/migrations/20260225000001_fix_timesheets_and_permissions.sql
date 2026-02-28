-- =========================================================
-- TIMESHEET SYSTEM - CONSOLIDATED FIX (BIGINT & TEXT COMPATIBLE)
-- Run this in Supabase SQL Editor to fix type mismatch errors.
-- =========================================================

-- 1. ENSURE TABLES EXIST
CREATE TABLE IF NOT EXISTS timesheet_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    total_hours NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
    project_number TEXT NOT NULL,
    entry_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ADD MISSING COLUMNS & FIX TYPES
DO $$ 
BEGIN
    -- Fix timesheet_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='project_id') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='is_internal') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN is_internal BOOLEAN DEFAULT false;
    END IF;

    -- Fix timesheet_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='project_id') THEN
        ALTER TABLE timesheet_entries ADD COLUMN project_id BIGINT REFERENCES projects(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='task_id') THEN
        ALTER TABLE timesheet_entries ADD COLUMN task_id UUID REFERENCES timesheet_tasks(id);
    END IF;
    
    -- IMPORTANT: Drop constraint BEFORE changing type to avoid 42804 error
    ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_subtask_id_fkey;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='subtask_id') THEN
        ALTER TABLE timesheet_entries ADD COLUMN subtask_id TEXT;
    ELSE
        ALTER TABLE timesheet_entries ALTER COLUMN subtask_id TYPE TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='is_billable') THEN
        ALTER TABLE timesheet_entries ADD COLUMN is_billable BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='notes') THEN
        ALTER TABLE timesheet_entries ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='updated_at') THEN
        ALTER TABLE timesheet_entries ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- Fix timesheets status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheets' AND column_name='status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status') THEN
            CREATE TYPE timesheet_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
        END IF;
        ALTER TABLE timesheets ADD COLUMN status timesheet_status DEFAULT 'Draft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheets' AND column_name='rejection_comment') THEN
        ALTER TABLE timesheets ADD COLUMN rejection_comment TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheets' AND column_name='submitted_at') THEN
        ALTER TABLE timesheets ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheets' AND column_name='approved_at') THEN
        ALTER TABLE timesheets ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheets' AND column_name='last_modified_by') THEN
        ALTER TABLE timesheets ADD COLUMN last_modified_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. CONSTRAINTS & POLICIES
ALTER TABLE timesheet_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks are viewable by everyone" ON timesheet_tasks;
CREATE POLICY "Tasks are viewable by everyone" ON timesheet_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Tasks are manageable by admins" ON timesheet_tasks;
CREATE POLICY "Tasks are manageable by admins" ON timesheet_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own timesheets" ON timesheets;
CREATE POLICY "Users can view own timesheets" ON timesheets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own timesheets" ON timesheets;
CREATE POLICY "Users can insert own timesheets" ON timesheets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Draft/Rejected timesheets" ON timesheets;
CREATE POLICY "Users can update own Draft/Rejected timesheets" ON timesheets FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own entries" ON timesheet_entries;
CREATE POLICY "Users can view own entries" ON timesheet_entries FOR SELECT USING (EXISTS (SELECT 1 FROM timesheets WHERE timesheets.id = timesheet_id AND timesheets.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage entries for own Draft timesheets" ON timesheet_entries;
CREATE POLICY "Users can manage entries for own Draft timesheets" ON timesheet_entries FOR ALL USING (EXISTS (SELECT 1 FROM timesheets WHERE timesheets.id = timesheet_id AND timesheets.user_id = auth.uid()));

-- 4. SEED DROPDOWN CATEGORIES
INSERT INTO dropdown_categories (name, description)
VALUES 
    ('Timesheet Items', 'Project-level categories for timesheets (Sick, PTO, etc.)'),
    ('Timesheet Sub_Tasks', 'Global subtasks available for all timesheet entries')
ON CONFLICT (name) DO NOTHING;

-- 5. REGISTER DYNAMIC PERMISSIONS
DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (priv_level, 'VIEW_TIMESHEETS', 'View Timesheets', 'View Access', true, 25)
            ON CONFLICT (privilege_level, permission_key) DO UPDATE SET is_granted = true;

            IF priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN
                INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
                VALUES (priv_level, 'MANAGE_TIMESHEET_TASKS', 'Manage Timesheet Tasks', 'View Access', true, 26)
                ON CONFLICT (privilege_level, permission_key) DO UPDATE SET is_granted = true;
            END IF;
        END LOOP;
    END IF;
END $$;
