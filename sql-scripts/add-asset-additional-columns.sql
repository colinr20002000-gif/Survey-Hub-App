-- Add quantity, kit_group, assigned_to_text, and last_checked columns to equipment table
-- These columns are specifically for Assets, but added to the main equipment table.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'quantity') THEN
        ALTER TABLE equipment ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'kit_group') THEN
        ALTER TABLE equipment ADD COLUMN kit_group TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'assigned_to_text') THEN
        ALTER TABLE equipment ADD COLUMN assigned_to_text TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'last_checked') THEN
        ALTER TABLE equipment ADD COLUMN last_checked DATE;
    END IF;
END $$;
