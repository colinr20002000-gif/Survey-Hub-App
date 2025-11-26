-- Add Subcontractor Contacts dropdown category for managing subcontractor disciplines
-- Date: 2025-11-26

-- Check if category already exists, if not create it
INSERT INTO dropdown_categories (name, description)
VALUES ('subcontractor_contacts', 'Disciplines for subcontractor contacts')
ON CONFLICT (name) DO NOTHING;

-- Add some default discipline options (can be modified via Dropdown Menu Management)
DO $$
DECLARE
    category_id_var uuid;
BEGIN
    -- Get the category ID
    SELECT id INTO category_id_var
    FROM dropdown_categories
    WHERE name = 'subcontractor_contacts';

    -- Insert default disciplines only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM dropdown_items WHERE category_id = category_id_var) THEN
        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        VALUES
            (category_id_var, 'surveying', 'Surveying', 1, true),
            (category_id_var, 'engineering', 'Engineering', 2, true),
            (category_id_var, 'design', 'Design', 3, true),
            (category_id_var, 'construction', 'Construction', 4, true),
            (category_id_var, 'inspection', 'Inspection', 5, true);
    END IF;
END $$;
