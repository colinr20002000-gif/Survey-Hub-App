-- =========================================================
-- FINAL TIMESHEET SYSTEM REPAIR
-- This script fixes all "column not found" and "relationship" errors.
-- =========================================================

-- 1. FIX COLUMN TYPES AND RELATIONSHIPS (The root of the "Failed to Load" errors)
DO $$ 
BEGIN
    -- Fix timesheet_entries (Remove broken subtask relationship and fix project_id type)
    ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_subtask_id_fkey;
    ALTER TABLE timesheet_entries ALTER COLUMN subtask_id TYPE TEXT;
    
    -- Ensure project_id is BIGINT to match your projects table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='project_id') THEN
        ALTER TABLE timesheet_entries ALTER COLUMN project_id TYPE BIGINT USING project_id::bigint;
    ELSE
        ALTER TABLE timesheet_entries ADD COLUMN project_id BIGINT REFERENCES projects(id);
    END IF;

    -- Fix timesheet_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='dropdown_item_id') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN dropdown_item_id UUID REFERENCES dropdown_items(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='project_id') THEN
        ALTER TABLE timesheet_tasks ALTER COLUMN project_id TYPE BIGINT USING project_id::bigint;
    ELSE
        ALTER TABLE timesheet_tasks ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. ENSURE ALL OTHER COLUMNS EXIST
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='is_internal') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN is_internal BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='is_billable') THEN
        ALTER TABLE timesheet_entries ADD COLUMN is_billable BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_entries' AND column_name='notes') THEN
        ALTER TABLE timesheet_entries ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. RE-REGISTER DROPDOWN CATEGORIES
INSERT INTO dropdown_categories (name, description)
VALUES 
    ('Timesheet Items', 'Project-level categories for timesheets (Sick, PTO, etc.)'),
    ('Timesheet Sub_Tasks', 'Global subtasks available for all timesheet entries')
ON CONFLICT (name) DO NOTHING;

-- 4. RE-REGISTER PERMISSIONS
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

-- 5. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
