-- Complete SQL to set up the dropdown system for team roles
-- Run this in your Supabase SQL Editor

-- Step 1: Create dropdown_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS dropdown_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create dropdown_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS dropdown_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES dropdown_categories(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    display_text VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, value)
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dropdown_items_category_id ON dropdown_items(category_id);
CREATE INDEX IF NOT EXISTS idx_dropdown_items_sort_order ON dropdown_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_dropdown_items_is_active ON dropdown_items(is_active);

-- Step 4: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Create triggers to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_dropdown_categories_updated_at ON dropdown_categories;
CREATE TRIGGER update_dropdown_categories_updated_at
    BEFORE UPDATE ON dropdown_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dropdown_items_updated_at ON dropdown_items;
CREATE TRIGGER update_dropdown_items_updated_at
    BEFORE UPDATE ON dropdown_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Insert the Team Role category
INSERT INTO dropdown_categories (name, description)
VALUES ('team_role', 'Team roles for user assignments in projects')
ON CONFLICT (name) DO NOTHING;

-- Step 7: Clear any existing team roles and insert the correct ones
DELETE FROM dropdown_items
WHERE category_id = (SELECT id FROM dropdown_categories WHERE name = 'team_role');

-- Step 8: Insert the team roles that match your current system
INSERT INTO dropdown_items (category_id, value, display_text, sort_order)
SELECT
    dc.id,
    role_data.value,
    role_data.display_text,
    role_data.sort_order
FROM dropdown_categories dc
CROSS JOIN (
    VALUES
        ('Site Team', 'Site Team', 1),
        ('Project Team', 'Project Team', 2),
        ('Delivery Team', 'Delivery Team', 3),
        ('Design Team', 'Design Team', 4),
        ('Office Staff', 'Office Staff', 5),
        ('Subcontractor', 'Subcontractor', 6)
) AS role_data(value, display_text, sort_order)
WHERE dc.name = 'team_role';

-- Step 9: Verify the data was inserted correctly
SELECT
    dc.name as category_name,
    di.value,
    di.display_text,
    di.sort_order,
    di.is_active
FROM dropdown_items di
JOIN dropdown_categories dc ON di.category_id = dc.id
WHERE dc.name = 'team_role'
ORDER BY di.sort_order;