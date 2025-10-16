-- Ensure equipment categories exist with correct data
-- First, check if the table has any data
DO $$
BEGIN
    -- Insert categories if they don't exist
    INSERT INTO equipment_categories (name, description, color) VALUES
        ('Surveying Equipment', 'Total stations, levels, GPS units', '#1e3a8a'),
        ('Safety Equipment', 'Hard hats, high-vis vests, safety boots', '#EF4444'),
        ('IT Equipment', 'Laptops, tablets, smartphones', '#10B981'),
        ('Field Equipment', 'Measuring tapes, poles, prisms', '#F59E0B'),
        ('Vehicles', 'Company cars, vans, trucks', '#8B5CF6')
    ON CONFLICT (name) DO UPDATE SET
        color = EXCLUDED.color,
        description = EXCLUDED.description;
END $$;

-- Verify the policy exists
DROP POLICY IF EXISTS "Everyone can view equipment categories" ON equipment_categories;
CREATE POLICY "Everyone can view equipment categories" ON equipment_categories
    FOR SELECT USING (true);
