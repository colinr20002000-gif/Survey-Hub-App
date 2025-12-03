-- Complete setup for Asset Register feature
-- Run this script in your Supabase SQL Editor to add all necessary columns to the equipment table.

DO $$
BEGIN
    -- 1. Basic Asset Identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'is_asset') THEN
        ALTER TABLE equipment ADD COLUMN is_asset BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'asset_tag') THEN
        ALTER TABLE equipment ADD COLUMN asset_tag TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'new_asset_tag') THEN
        ALTER TABLE equipment ADD COLUMN new_asset_tag TEXT;
    END IF;

    -- 2. Asset Details
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
    
    -- 3. Create index for performance if they don't exist
    -- (Checking indexes in DO block is complex, simplified by just trying to create if not exists is standard postgres logic, but CREATE INDEX IF NOT EXISTS is supported)
END $$;

-- Create indexes outside the block
CREATE INDEX IF NOT EXISTS idx_equipment_is_asset ON equipment(is_asset);
CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON equipment(asset_tag);
