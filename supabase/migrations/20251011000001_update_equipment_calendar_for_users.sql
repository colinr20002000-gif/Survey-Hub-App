-- Drop the existing equipment_calendar table and recreate with correct structure
DROP TABLE IF EXISTS equipment_calendar CASCADE;

-- Equipment Calendar table for tracking equipment assignments to users over time
CREATE TABLE equipment_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    allocation_date DATE NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_equipment_calendar_user_id ON equipment_calendar(user_id);
CREATE INDEX idx_equipment_calendar_equipment_id ON equipment_calendar(equipment_id);
CREATE INDEX idx_equipment_calendar_allocation_date ON equipment_calendar(allocation_date);

-- Create trigger for updated_at column
CREATE TRIGGER update_equipment_calendar_updated_at
BEFORE UPDATE ON equipment_calendar
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE equipment_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_calendar
-- Everyone can view equipment calendar
CREATE POLICY "Everyone can view equipment calendar" ON equipment_calendar
    FOR SELECT USING (true);

-- Editor and above can insert equipment calendar entries
CREATE POLICY "Editor and above can insert equipment calendar" ON equipment_calendar
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Project Managers', 'Editor')
        )
    );

-- Editor and above can update equipment calendar entries
CREATE POLICY "Editor and above can update equipment calendar" ON equipment_calendar
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Project Managers', 'Editor')
        )
    );

-- Editor and above can delete equipment calendar entries
CREATE POLICY "Editor and above can delete equipment calendar" ON equipment_calendar
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Project Managers', 'Editor')
        )
    );

-- Add comment
COMMENT ON TABLE equipment_calendar IS 'Tracks equipment assignments to users across calendar weeks';
