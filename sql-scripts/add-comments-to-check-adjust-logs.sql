DO $$
BEGIN
    -- Add comments column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'comments') THEN
        ALTER TABLE check_adjust_logs ADD COLUMN comments TEXT;
    END IF;
END $$;
