-- Add deleted_at column to dummy_users table if it doesn't exist
DO $$
BEGIN
    -- Check if column exists before adding it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='dummy_users' AND column_name='deleted_at') THEN
        ALTER TABLE dummy_users ADD COLUMN deleted_at TIMESTAMP;
        RAISE NOTICE 'Added deleted_at column to dummy_users';
    ELSE
        RAISE NOTICE 'deleted_at column already exists in dummy_users';
    END IF;
END
$$;