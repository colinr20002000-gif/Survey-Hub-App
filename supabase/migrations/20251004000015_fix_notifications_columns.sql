-- Fix notifications table - ensure message column exists and is NOT NULL
-- The error PGRST204 indicates the schema cache doesn't see the message column

-- First, let's see what we have
DO $$
BEGIN
    RAISE NOTICE 'Checking notifications table structure...';
END $$;

-- Add message column with NOT NULL constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'message'
    ) THEN
        -- First add as nullable
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column';

        -- Update any existing rows to have a default message
        UPDATE public.notifications SET message = 'Notification' WHERE message IS NULL;

        -- Now make it NOT NULL
        ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;
        RAISE NOTICE 'Set message column to NOT NULL';
    ELSE
        RAISE NOTICE 'message column already exists';

        -- Ensure it's NOT NULL
        ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;
        RAISE NOTICE 'Ensured message column is NOT NULL';
    END IF;
END $$;

-- Ensure title column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column';
    ELSE
        RAISE NOTICE 'title column already exists';
    END IF;
END $$;

-- Reload the schema cache by notifying PostgREST
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications';

    RAISE NOTICE '✅ Notifications table has % columns', column_count;
    RAISE NOTICE '✅ Schema cache reload notified';
END $$;
