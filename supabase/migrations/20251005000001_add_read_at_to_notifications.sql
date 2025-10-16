-- Add read_at column to notifications table
-- This column is used to track when a notification was read by the user

DO $$
BEGIN
    -- Add read_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
        RAISE NOTICE 'Added read_at column';
    ELSE
        RAISE NOTICE 'read_at column already exists';
    END IF;
END $$;

-- Update existing read notifications to have a read_at timestamp
-- Set to created_at as a fallback for existing data
UPDATE public.notifications
SET read_at = created_at
WHERE read = true AND read_at IS NULL;

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
    has_read_at BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'read_at'
    ) INTO has_read_at;

    RAISE NOTICE '✅ read_at column exists: %', has_read_at;
    RAISE NOTICE '✅ Schema cache reload notified';
END $$;
