-- Create useful_links table for managing website links organized by category
-- Date: 2025-11-28

CREATE TABLE IF NOT EXISTS useful_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    display_name TEXT NOT NULL,
    url TEXT NOT NULL,
    category_id UUID REFERENCES dropdown_items(id) ON DELETE SET NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_useful_links_category ON useful_links(category_id);
CREATE INDEX IF NOT EXISTS idx_useful_links_display_name ON useful_links(display_name);
CREATE INDEX IF NOT EXISTS idx_useful_links_created_by ON useful_links(created_by);

-- Add RLS policies
ALTER TABLE useful_links ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view useful links
CREATE POLICY "Anyone can view useful links"
ON useful_links FOR SELECT
USING (true);

-- Policy: Authenticated users can insert useful links
CREATE POLICY "Authenticated users can insert useful links"
ON useful_links FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own useful links, or admins can update any
CREATE POLICY "Users can update useful links"
ON useful_links FOR UPDATE
USING (
    auth.uid() = created_by
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Admin', 'Super Admin')
    )
);

-- Policy: Users can delete their own useful links, or admins can delete any
CREATE POLICY "Users can delete useful links"
ON useful_links FOR DELETE
USING (
    auth.uid() = created_by
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Admin', 'Super Admin')
    )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_useful_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER useful_links_updated_at
    BEFORE UPDATE ON useful_links
    FOR EACH ROW
    EXECUTE FUNCTION update_useful_links_updated_at();
