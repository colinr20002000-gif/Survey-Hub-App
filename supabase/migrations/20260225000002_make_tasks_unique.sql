-- 1. Add dropdown_item_id to link tasks to specific dynamic items (Sick, PTO, etc.)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timesheet_tasks' AND column_name='dropdown_item_id') THEN
        ALTER TABLE timesheet_tasks ADD COLUMN dropdown_item_id UUID REFERENCES dropdown_items(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Update existing internal tasks to link to their respective items if possible
-- (This is a safety step, but since we are removing 'Shared', new tasks will be created per item anyway)

-- 3. Update permissions to ensure everything is correct
DO $$
DECLARE
    priv_level TEXT;
    priv_levels TEXT[] := ARRAY['Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privilege_permissions') THEN
        FOREACH priv_level IN ARRAY priv_levels LOOP
            INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
            VALUES (priv_level, 'MANAGE_TIMESHEET_TASKS', 'Manage Timesheet Tasks', 'View Access', true, 26)
            ON CONFLICT (privilege_level, permission_key) DO UPDATE SET is_granted = true;
        END LOOP;
    END IF;
END $$;
