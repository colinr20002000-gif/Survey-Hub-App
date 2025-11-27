-- Add Useful Contacts dropdown category for managing useful contact disciplines
-- Date: 2025-11-27

-- Check if category already exists, if not create it
INSERT INTO dropdown_categories (name, description)
VALUES ('useful_contacts', 'Disciplines for useful contacts')
ON CONFLICT (name) DO NOTHING;

-- Add some default discipline options (can be modified via Dropdown Menu Management)
DO $$
DECLARE
    category_id_var uuid;
BEGIN
    -- Get the category ID
    SELECT id INTO category_id_var
    FROM dropdown_categories
    WHERE name = 'useful_contacts';

    -- Insert default disciplines only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM dropdown_items WHERE category_id = category_id_var) THEN
        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        VALUES
            (category_id_var, 'insurance', 'Insurance', 1, true),
            (category_id_var, 'legal', 'Legal', 2, true),
            (category_id_var, 'finance', 'Finance', 3, true),
            (category_id_var, 'hr', 'HR', 4, true),
            (category_id_var, 'it', 'IT Support', 5, true),
            (category_id_var, 'safety', 'Health & Safety', 6, true),
            (category_id_var, 'suppliers', 'Suppliers', 7, true);
    END IF;
END $$;
