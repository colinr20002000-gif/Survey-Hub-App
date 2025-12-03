-- Add new_asset_tag column to equipment table
-- This column is intended to store a secondary or updated asset tag for Assets.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'new_asset_tag') THEN
        ALTER TABLE equipment ADD COLUMN new_asset_tag TEXT;
    END IF;
END $$;
