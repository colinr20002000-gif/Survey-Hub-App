-- Update team roles to match the current hardcoded values in the UserAdmin component
-- This replaces the generic roles with the specific team-based roles currently used

-- First, clear existing team roles
DELETE FROM dropdown_items
WHERE category_id = (SELECT id FROM dropdown_categories WHERE name = 'team_role');

-- Insert the correct team roles that match the current hardcoded list
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
WHERE dc.name = 'team_role'
ON CONFLICT (category_id, value) DO NOTHING;