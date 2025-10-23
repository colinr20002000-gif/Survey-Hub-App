-- Equipment Management System Database Schema

-- Equipment table - stores all equipment items
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    purchase_date DATE,
    warranty_expiry DATE,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Equipment assignments table - tracks current and historical assignments
CREATE TABLE IF NOT EXISTS equipment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES auth.users(id),
    return_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Equipment comments table - for team communication about equipment
CREATE TABLE IF NOT EXISTS equipment_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Equipment categories lookup table
CREATE TABLE IF NOT EXISTS equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment_id ON equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_user_id ON equipment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_at ON equipment_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_equipment_comments_equipment_id ON equipment_comments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_comments_created_at ON equipment_comments(created_at);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_assignments_updated_at ON equipment_assignments;
CREATE TRIGGER update_equipment_assignments_updated_at BEFORE UPDATE ON equipment_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_comments_updated_at ON equipment_comments;
CREATE TRIGGER update_equipment_comments_updated_at BEFORE UPDATE ON equipment_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default equipment categories
INSERT INTO equipment_categories (name, description, color) VALUES
    ('Surveying Equipment', 'Total stations, levels, GPS units', '#3B82F6'),
    ('Safety Equipment', 'Hard hats, high-vis vests, safety boots', '#EF4444'),
    ('IT Equipment', 'Laptops, tablets, smartphones', '#10B981'),
    ('Field Equipment', 'Measuring tapes, poles, prisms', '#F59E0B'),
    ('Vehicles', 'Company cars, vans, trucks', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- Row Level Security (RLS) policies
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- Equipment policies
DROP POLICY IF EXISTS "Everyone can view equipment" ON equipment;
CREATE POLICY "Everyone can view equipment" ON equipment
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert equipment" ON equipment;
CREATE POLICY "Authenticated users can insert equipment" ON equipment
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update equipment" ON equipment;
CREATE POLICY "Users can update equipment" ON equipment
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin users can delete equipment" ON equipment;
CREATE POLICY "Admin users can delete equipment" ON equipment
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );

-- Equipment assignments policies
DROP POLICY IF EXISTS "Everyone can view equipment assignments" ON equipment_assignments;
CREATE POLICY "Everyone can view equipment assignments" ON equipment_assignments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert equipment assignments" ON equipment_assignments;
CREATE POLICY "Authenticated users can insert equipment assignments" ON equipment_assignments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their equipment assignments" ON equipment_assignments;
CREATE POLICY "Users can update their equipment assignments" ON equipment_assignments
    FOR UPDATE USING (
        user_id = auth.uid() OR
        assigned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Project Managers')
        )
    );

-- Equipment comments policies
DROP POLICY IF EXISTS "Everyone can view equipment comments" ON equipment_comments;
CREATE POLICY "Everyone can view equipment comments" ON equipment_comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert equipment comments" ON equipment_comments;
CREATE POLICY "Authenticated users can insert equipment comments" ON equipment_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own comments" ON equipment_comments;
CREATE POLICY "Users can update their own comments" ON equipment_comments
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON equipment_comments;
CREATE POLICY "Users can delete their own comments" ON equipment_comments
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );

-- Equipment categories policies
DROP POLICY IF EXISTS "Everyone can view equipment categories" ON equipment_categories;
CREATE POLICY "Everyone can view equipment categories" ON equipment_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin users can manage equipment categories" ON equipment_categories;
CREATE POLICY "Admin users can manage equipment categories" ON equipment_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );