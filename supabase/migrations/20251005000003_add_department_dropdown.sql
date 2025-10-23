-- Add department dropdown category and items
-- Departments should match the actual team structure in the organization

-- Create or update the department category
INSERT INTO dropdown_categories (name, description)
VALUES ('department', 'User department categories')
ON CONFLICT (name) DO NOTHING;

-- Clear existing department items
DELETE FROM dropdown_items
WHERE category_id = (SELECT id FROM dropdown_categories WHERE name = 'department');

-- Insert the correct departments based on the actual team structure
INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
SELECT
    dc.id,
    dept_data.value,
    dept_data.display_text,
    dept_data.sort_order,
    TRUE
FROM dropdown_categories dc
CROSS JOIN (
    VALUES
        ('Site Team', 'Site Team', 1),
        ('Project Team', 'Project Team', 2),
        ('Delivery Team', 'Delivery Team', 3),
        ('Design Team', 'Design Team', 4),
        ('Office Staff', 'Office Staff', 5),
        ('Subcontractor', 'Subcontractor', 6),
        ('Track Handback', 'Track Handback', 7)
) AS dept_data(value, display_text, sort_order)
WHERE dc.name = 'department'
ON CONFLICT (category_id, value) DO NOTHING;

-- Verification
DO $$
DECLARE
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count
    FROM dropdown_items di
    JOIN dropdown_categories dc ON di.category_id = dc.id
    WHERE dc.name = 'department' AND di.is_active = true;

    RAISE NOTICE '✅ Department category configured';
    RAISE NOTICE '✅ Added % department options', dept_count;
    RAISE NOTICE '✅ Departments: Site Team, Project Team, Delivery Team, Design Team, Office Staff, Subcontractor, Track Handback';
END $$;
