-- Create on_call_contacts table
CREATE TABLE IF NOT EXISTS on_call_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on week_start_date for faster queries
CREATE INDEX IF NOT EXISTS idx_on_call_contacts_week_start ON on_call_contacts(week_start_date);

-- Enable RLS
ALTER TABLE on_call_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for on_call_contacts
-- Viewers and above can read
CREATE POLICY "Users with Viewer or higher can view on_call_contacts"
    ON on_call_contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin')
        )
    );

-- Editors and above can insert
CREATE POLICY "Users with Editor or higher can insert on_call_contacts"
    ON on_call_contacts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Editor+', 'Admin')
        )
    );

-- Editors and above can update
CREATE POLICY "Users with Editor or higher can update on_call_contacts"
    ON on_call_contacts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Editor+', 'Admin')
        )
    );

-- Editors and above can delete
CREATE POLICY "Users with Editor or higher can delete on_call_contacts"
    ON on_call_contacts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Editor+', 'Admin')
        )
    );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_on_call_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_call_contacts_updated_at
    BEFORE UPDATE ON on_call_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_on_call_contacts_updated_at();
