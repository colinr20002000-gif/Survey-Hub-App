-- Add privilege column to dummy_users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dummy_users'
        AND column_name = 'privilege'
    ) THEN
        ALTER TABLE dummy_users ADD COLUMN privilege TEXT DEFAULT 'Viewer';
    END IF;
END $$;

-- Update existing dummy users to have Viewer privilege if they don't have one
UPDATE dummy_users
SET privilege = 'Viewer'
WHERE privilege IS NULL;

-- Add a check constraint to ensure only valid privileges are used
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'dummy_users_privilege_check'
    ) THEN
        ALTER TABLE dummy_users
        ADD CONSTRAINT dummy_users_privilege_check
        CHECK (privilege IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'));
    END IF;
END $$;