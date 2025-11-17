-- Create vehicle_inspection_logs table
CREATE TABLE IF NOT EXISTS vehicle_inspection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL,
    mileage INTEGER NOT NULL,

    -- Fluids checks
    check_engine_oil TEXT CHECK (check_engine_oil IN ('satisfactory', 'defective', 'n/a')),
    check_brake TEXT CHECK (check_brake IN ('satisfactory', 'defective', 'n/a')),
    check_clutch TEXT CHECK (check_clutch IN ('satisfactory', 'defective', 'n/a')),
    check_power_steering TEXT CHECK (check_power_steering IN ('satisfactory', 'defective', 'n/a')),
    check_auto_transmission TEXT CHECK (check_auto_transmission IN ('satisfactory', 'defective', 'n/a')),
    check_screen_wash TEXT CHECK (check_screen_wash IN ('satisfactory', 'defective', 'n/a')),
    check_fuel TEXT CHECK (check_fuel IN ('satisfactory', 'defective', 'n/a')),
    check_coolant TEXT CHECK (check_coolant IN ('satisfactory', 'defective', 'n/a')),

    -- Lights/Electric checks
    check_indicators TEXT CHECK (check_indicators IN ('satisfactory', 'defective', 'n/a')),
    check_side_lights TEXT CHECK (check_side_lights IN ('satisfactory', 'defective', 'n/a')),
    check_headlights_dipped TEXT CHECK (check_headlights_dipped IN ('satisfactory', 'defective', 'n/a')),
    check_headlights_main TEXT CHECK (check_headlights_main IN ('satisfactory', 'defective', 'n/a')),
    check_number_plate_light TEXT CHECK (check_number_plate_light IN ('satisfactory', 'defective', 'n/a')),
    check_reversing_light TEXT CHECK (check_reversing_light IN ('satisfactory', 'defective', 'n/a')),
    check_warning_lights TEXT CHECK (check_warning_lights IN ('satisfactory', 'defective', 'n/a')),
    check_horn TEXT CHECK (check_horn IN ('satisfactory', 'defective', 'n/a')),

    -- External Condition checks
    check_door_wing_mirrors TEXT CHECK (check_door_wing_mirrors IN ('satisfactory', 'defective', 'n/a')),
    check_wiper_blades TEXT CHECK (check_wiper_blades IN ('satisfactory', 'defective', 'n/a')),
    check_screen_washers TEXT CHECK (check_screen_washers IN ('satisfactory', 'defective', 'n/a')),
    check_tyre_pressure TEXT CHECK (check_tyre_pressure IN ('satisfactory', 'defective', 'n/a')),
    check_tyre_condition TEXT CHECK (check_tyre_condition IN ('satisfactory', 'defective', 'n/a')),
    check_windscreen_wipers TEXT CHECK (check_windscreen_wipers IN ('satisfactory', 'defective', 'n/a')),
    check_spare_wheel TEXT CHECK (check_spare_wheel IN ('satisfactory', 'defective', 'n/a')),
    check_cleanliness TEXT CHECK (check_cleanliness IN ('satisfactory', 'defective', 'n/a')),

    -- Internal Condition checks
    check_seat_belts TEXT CHECK (check_seat_belts IN ('satisfactory', 'defective', 'n/a')),
    check_first_aid_kit TEXT CHECK (check_first_aid_kit IN ('satisfactory', 'defective', 'n/a')),
    check_fire_extinguisher TEXT CHECK (check_fire_extinguisher IN ('satisfactory', 'defective', 'n/a')),
    check_head_restraint TEXT CHECK (check_head_restraint IN ('satisfactory', 'defective', 'n/a')),
    check_torch TEXT CHECK (check_torch IN ('satisfactory', 'defective', 'n/a')),
    check_general_bodywork TEXT CHECK (check_general_bodywork IN ('satisfactory', 'defective', 'n/a')),
    check_spill_kit TEXT CHECK (check_spill_kit IN ('satisfactory', 'defective', 'n/a')),
    check_door_locking TEXT CHECK (check_door_locking IN ('satisfactory', 'defective', 'n/a')),

    -- Comments and damage
    comments TEXT,
    damage_notes TEXT,

    -- Photo URLs (stored as JSON array)
    photos JSONB DEFAULT '[]'::jsonb,

    -- Status tracking
    has_defects BOOLEAN DEFAULT false,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_logs_vehicle_id ON vehicle_inspection_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_logs_user_id ON vehicle_inspection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_logs_inspection_date ON vehicle_inspection_logs(inspection_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_logs_has_defects ON vehicle_inspection_logs(has_defects);

-- Enable RLS
ALTER TABLE vehicle_inspection_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read vehicle inspection logs" ON vehicle_inspection_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert vehicle inspection logs" ON vehicle_inspection_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update vehicle inspection logs" ON vehicle_inspection_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete vehicle inspection logs" ON vehicle_inspection_logs;

CREATE POLICY "Allow authenticated users to read vehicle inspection logs"
    ON vehicle_inspection_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert vehicle inspection logs"
    ON vehicle_inspection_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vehicle inspection logs"
    ON vehicle_inspection_logs
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete vehicle inspection logs"
    ON vehicle_inspection_logs
    FOR DELETE
    TO authenticated
    USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_inspection_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicle_inspection_logs_updated_at ON vehicle_inspection_logs;
CREATE TRIGGER update_vehicle_inspection_logs_updated_at
    BEFORE UPDATE ON vehicle_inspection_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_inspection_logs_updated_at();
