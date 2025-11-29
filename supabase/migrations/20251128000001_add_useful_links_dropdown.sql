-- Add Useful Links dropdown category for managing link categories
-- Date: 2025-11-28

-- Check if category already exists, if not create it
INSERT INTO dropdown_categories (name, description)
VALUES ('useful_links', 'Categories for organizing useful website links')
ON CONFLICT (name) DO NOTHING;

-- Add some default category options (can be modified via Dropdown Menu Management)
DO $$
DECLARE
    category_id_var uuid;
BEGIN
    -- Get the category ID
    SELECT id INTO category_id_var
    FROM dropdown_categories
    WHERE name = 'useful_links';

    -- Insert default categories only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM dropdown_items WHERE category_id = category_id_var) THEN
        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        VALUES
            (category_id_var, 'suppliers', 'Suppliers', 1, true),
            (category_id_var, 'tools', 'Tools & Software', 2, true),
            (category_id_var, 'reference', 'Reference & Documentation', 3, true),
            (category_id_var, 'industry', 'Industry Resources', 4, true),
            (category_id_var, 'training', 'Training & Education', 5, true),
            (category_id_var, 'compliance', 'Compliance & Safety', 6, true),
            (category_id_var, 'general', 'General', 7, true);
    END IF;
END $$;
