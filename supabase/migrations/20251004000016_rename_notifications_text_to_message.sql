-- Rename notifications.text to notifications.message to match our app code
-- The existing table has a 'text' column but our app expects 'message'

DO $$
BEGIN
    -- Check if 'text' column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'text'
    ) THEN
        -- Check if 'message' column already exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'message'
        ) THEN
            -- Both exist - drop the 'text' column since message is what we want
            ALTER TABLE public.notifications DROP COLUMN text;
            RAISE NOTICE 'Dropped redundant text column (message column exists)';
        ELSE
            -- Rename text to message
            ALTER TABLE public.notifications RENAME COLUMN text TO message;
            RAISE NOTICE 'Renamed text column to message';
        END IF;
    ELSE
        RAISE NOTICE 'text column does not exist - nothing to rename';
    END IF;
END $$;

-- Ensure message column is NOT NULL
ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
    has_message BOOLEAN;
    has_text BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'message'
    ) INTO has_message;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'text'
    ) INTO has_text;

    RAISE NOTICE '✅ message column exists: %', has_message;
    RAISE NOTICE '✅ text column exists: %', has_text;
    RAISE NOTICE '✅ Schema cache reload notified';
END $$;
