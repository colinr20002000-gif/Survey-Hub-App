DO $$
BEGIN
    -- Add model column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'model') THEN
        ALTER TABLE equipment ADD COLUMN model TEXT;
    END IF;
END $$;
