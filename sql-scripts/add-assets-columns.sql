-- Add is_asset and asset_tag columns to equipment table
-- is_asset distinguishes between standard equipment and the new "Assets" type
-- asset_tag is a specific identifier for these Assets

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'is_asset') THEN
        ALTER TABLE equipment ADD COLUMN is_asset BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'asset_tag') THEN
        ALTER TABLE equipment ADD COLUMN asset_tag TEXT;
    END IF;
END $$;
