-- Timesheet System Migration

-- 1. Tasks & Subtasks (Managed by Editors/Admins)
CREATE TABLE IF NOT EXISTS timesheet_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Link to project
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_internal BOOLEAN DEFAULT false, -- For internal tasks like Sick Leave, PTO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS timesheet_subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES timesheet_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Manager Assignments (Linking Users to Line Managers)
CREATE TABLE IF NOT EXISTS manager_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Timesheets (The weekly container)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status') THEN
        CREATE TYPE timesheet_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Must be a Saturday
    status timesheet_status DEFAULT 'Draft',
    total_hours NUMERIC(5,2) DEFAULT 0,
    rejection_comment TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    last_modified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date)
);

-- 4. Timesheet Entries (Individual line items per day)
CREATE TABLE IF NOT EXISTS timesheet_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id), -- Link to project table
    project_number TEXT NOT NULL, -- Keep for historical reasons/quick access
    task_id UUID REFERENCES timesheet_tasks(id),
    subtask_id UUID REFERENCES timesheet_subtasks(id),
    entry_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    is_billable BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Triggers for Audit Trail (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_timesheets_updated_at ON timesheets;
CREATE TRIGGER update_timesheets_updated_at
    BEFORE UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timesheet_entries_updated_at ON timesheet_entries;
CREATE TRIGGER update_timesheet_entries_updated_at
    BEFORE UPDATE ON timesheet_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Row Level Security (RLS) Policies
ALTER TABLE timesheet_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Helper function for admin/editor check (simplistic for now, should align with your app's existing logic)
CREATE OR REPLACE FUNCTION is_admin_or_editor()
RETURNS BOOLEAN AS $$
DECLARE
    user_privilege TEXT;
BEGIN
    SELECT privilege INTO user_privilege FROM public.users WHERE id = auth.uid();
    RETURN user_privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tasks & Subtasks: Everyone can read, only Admins/Editors can write
DROP POLICY IF EXISTS "Tasks are viewable by everyone" ON timesheet_tasks;
CREATE POLICY "Tasks are viewable by everyone" ON timesheet_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tasks are manageable by admins" ON timesheet_tasks;
CREATE POLICY "Tasks are manageable by admins" ON timesheet_tasks FOR ALL USING (is_admin_or_editor());

DROP POLICY IF EXISTS "Subtasks are viewable by everyone" ON timesheet_subtasks;
CREATE POLICY "Subtasks are viewable by everyone" ON timesheet_subtasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Subtasks are manageable by admins" ON timesheet_subtasks;
CREATE POLICY "Subtasks are manageable by admins" ON timesheet_subtasks FOR ALL USING (is_admin_or_editor());

-- Manager Assignments
DROP POLICY IF EXISTS "View own manager assignment" ON manager_assignments;
CREATE POLICY "View own manager assignment" ON manager_assignments FOR SELECT USING (auth.uid() = user_id OR auth.uid() = manager_id OR is_admin_or_editor());

DROP POLICY IF EXISTS "Manage assignments" ON manager_assignments;
CREATE POLICY "Manage assignments" ON manager_assignments FOR ALL USING (is_admin_or_editor());

-- Timesheets: Users can read/write their own. Managers can read/update assigned users. Admins can read all.
DROP POLICY IF EXISTS "Users can view own timesheets" ON timesheets;
CREATE POLICY "Users can view own timesheets" ON timesheets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers can view assigned timesheets" ON timesheets;
CREATE POLICY "Managers can view assigned timesheets" ON timesheets FOR SELECT USING (
    EXISTS (SELECT 1 FROM manager_assignments WHERE manager_assignments.user_id = timesheets.user_id AND manager_assignments.manager_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all timesheets" ON timesheets;
CREATE POLICY "Admins can view all timesheets" ON timesheets FOR SELECT USING (is_admin_or_editor());

DROP POLICY IF EXISTS "Users can insert own timesheets" ON timesheets;
CREATE POLICY "Users can insert own timesheets" ON timesheets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Draft/Rejected timesheets" ON timesheets;
CREATE POLICY "Users can update own Draft/Rejected timesheets" ON timesheets FOR UPDATE USING (
    auth.uid() = user_id AND status IN ('Draft', 'Rejected')
);

DROP POLICY IF EXISTS "Managers can approve/reject timesheets" ON timesheets;
CREATE POLICY "Managers can approve/reject timesheets" ON timesheets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM manager_assignments WHERE manager_assignments.user_id = timesheets.user_id AND manager_assignments.manager_id = auth.uid())
);

-- Timesheet Entries
DROP POLICY IF EXISTS "Users can view own entries" ON timesheet_entries;
CREATE POLICY "Users can view own entries" ON timesheet_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM timesheets WHERE timesheets.id = timesheet_id AND timesheets.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can view assigned entries" ON timesheet_entries;
CREATE POLICY "Managers can view assigned entries" ON timesheet_entries FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM timesheets 
        JOIN manager_assignments ON timesheets.user_id = manager_assignments.user_id 
        WHERE timesheets.id = timesheet_id AND manager_assignments.manager_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can view all entries" ON timesheet_entries;
CREATE POLICY "Admins can view all entries" ON timesheet_entries FOR SELECT USING (is_admin_or_editor());

DROP POLICY IF EXISTS "Users can manage entries for own Draft timesheets" ON timesheet_entries;
CREATE POLICY "Users can manage entries for own Draft timesheets" ON timesheet_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM timesheets WHERE timesheets.id = timesheet_id AND timesheets.user_id = auth.uid() AND timesheets.status IN ('Draft', 'Rejected'))
);

-- Seed some default tasks
INSERT INTO timesheet_tasks (name, is_internal) VALUES 
('Project Work', false),
('Sick Leave', true),
('PTO', true),
('Public Holiday', true),
('Training', true),
('Admin', true)
ON CONFLICT DO NOTHING;

-- 7. Register Permissions in the dynamic permission system
DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    -- Check if privilege_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            -- View Access
            INSERT INTO privilege_permissions (
                privilege_level, permission_key, permission_label, 
                permission_category, is_granted, display_order
            ) VALUES (
                priv_level, 'VIEW_TIMESHEETS', 'View Timesheets', 
                'View Access', true, 25
            ) ON CONFLICT (privilege_level, permission_key) DO UPDATE 
            SET is_granted = EXCLUDED.is_granted,
                permission_category = EXCLUDED.permission_category,
                display_order = EXCLUDED.display_order;

            -- Admin/Editor Access
            IF priv_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN
                INSERT INTO privilege_permissions (
                    privilege_level, permission_key, permission_label, 
                    permission_category, is_granted, display_order
                ) VALUES (
                    priv_level, 'MANAGE_TIMESHEET_TASKS', 'Manage Timesheet Tasks', 
                    'Admin', true, 30
                ) ON CONFLICT (privilege_level, permission_key) DO UPDATE 
                SET is_granted = EXCLUDED.is_granted,
                    permission_category = EXCLUDED.permission_category,
                    display_order = EXCLUDED.display_order;
            END IF;
        END LOOP;
    END IF;
END $$;
