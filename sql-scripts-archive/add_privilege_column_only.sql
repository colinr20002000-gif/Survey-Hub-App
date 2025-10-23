-- Simple script to add privilege column to dummy_users
DO $$
BEGIN
    -- Check if column exists before adding it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='dummy_users' AND column_name='privilege') THEN
        ALTER TABLE dummy_users ADD COLUMN privilege TEXT DEFAULT 'Viewer';
        RAISE NOTICE 'Added privilege column to dummy_users';
    ELSE
        RAISE NOTICE 'privilege column already exists in dummy_users';
    END IF;
END
$$;