-- Create calendar_colours table for storing custom tile colours
CREATE TABLE IF NOT EXISTS calendar_colours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_type TEXT NOT NULL CHECK (calendar_type IN ('resource', 'equipment')),
    category_type TEXT NOT NULL CHECK (category_type IN ('status', 'discipline')),
    category_value TEXT NOT NULL,
    category_display TEXT NOT NULL,
    colour TEXT NOT NULL DEFAULT '#F97316',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(calendar_type, category_value)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_colours_type ON calendar_colours(calendar_type);
CREATE INDEX IF NOT EXISTS idx_calendar_colours_category ON calendar_colours(category_type, category_value);

-- Add RLS policies
ALTER TABLE calendar_colours ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read calendar colours
CREATE POLICY "Allow read access to calendar colours" ON calendar_colours
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins and super admins to manage calendar colours
CREATE POLICY "Allow admin to manage calendar colours" ON calendar_colours
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_colours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_colours_updated_at
    BEFORE UPDATE ON calendar_colours
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_colours_updated_at();

-- Add comment to table
COMMENT ON TABLE calendar_colours IS 'Stores custom colours for calendar tiles by category';
COMMENT ON COLUMN calendar_colours.calendar_type IS 'Type of calendar: resource or equipment';
COMMENT ON COLUMN calendar_colours.category_type IS 'Type of category: status or discipline';
COMMENT ON COLUMN calendar_colours.category_value IS 'The value of the category item';
COMMENT ON COLUMN calendar_colours.category_display IS 'Display name for the category';
COMMENT ON COLUMN calendar_colours.colour IS 'Hex colour code for the tile';
