-- SQL script to create dropdown lists management system
-- This will allow admins to manage dropdown options for various parts of the application

-- Create dropdown_categories table to store different types of dropdowns
CREATE TABLE IF NOT EXISTS dropdown_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create dropdown_items table to store individual dropdown options
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dropdown_items_category_id ON dropdown_items(category_id);
CREATE INDEX IF NOT EXISTS idx_dropdown_items_sort_order ON dropdown_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_dropdown_items_is_active ON dropdown_items(is_active);

-- Insert the Team Role category
INSERT INTO dropdown_categories (name, description)
VALUES ('team_role', 'Team roles for user assignments in projects')
ON CONFLICT (name) DO NOTHING;

-- Insert default team roles
INSERT INTO dropdown_items (category_id, value, display_text, sort_order)
SELECT
    dc.id,
    role_data.value,
    role_data.display_text,
    role_data.sort_order
FROM dropdown_categories dc
CROSS JOIN (
    VALUES
        ('project_manager', 'Project Manager', 1),
        ('team_lead', 'Team Lead', 2),
        ('senior_developer', 'Senior Developer', 3),
        ('developer', 'Developer', 4),
        ('junior_developer', 'Junior Developer', 5),
        ('designer', 'Designer', 6),
        ('qa_tester', 'QA Tester', 7),
        ('analyst', 'Analyst', 8),
        ('consultant', 'Consultant', 9),
        ('intern', 'Intern', 10)
) AS role_data(value, display_text, sort_order)
WHERE dc.name = 'team_role'
ON CONFLICT (category_id, value) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_dropdown_categories_updated_at
    BEFORE UPDATE ON dropdown_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_items_updated_at
    BEFORE UPDATE ON dropdown_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();