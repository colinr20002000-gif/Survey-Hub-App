DO $$
BEGIN
    -- 1. Handle Column Renames (Old -> New)
    -- Rename compensator_x to auto_lock_collimation_hz if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'compensator_x') THEN
        ALTER TABLE check_adjust_logs RENAME COLUMN compensator_x TO auto_lock_collimation_hz;
    END IF;

    -- Rename compensator_y to auto_lock_collimation_vt if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'compensator_y') THEN
        ALTER TABLE check_adjust_logs RENAME COLUMN compensator_y TO auto_lock_collimation_vt;
    END IF;

    -- 2. Handle New Boolean Columns (Safe Add)
    -- Add tribrach_circular_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'tribrach_circular_level') THEN
        ALTER TABLE check_adjust_logs ADD COLUMN tribrach_circular_level BOOLEAN DEFAULT false;
    END IF;

    -- Add prism_precise_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'prism_precise_level') THEN
        ALTER TABLE check_adjust_logs ADD COLUMN prism_precise_level BOOLEAN DEFAULT false;
    END IF;

    -- Add prism_optical_plummet if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'prism_optical_plummet') THEN
        ALTER TABLE check_adjust_logs ADD COLUMN prism_optical_plummet BOOLEAN DEFAULT false;
    END IF;

    -- Add compensator if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_adjust_logs' AND column_name = 'compensator') THEN
        ALTER TABLE check_adjust_logs ADD COLUMN compensator BOOLEAN DEFAULT false;
    END IF;

END $$;
