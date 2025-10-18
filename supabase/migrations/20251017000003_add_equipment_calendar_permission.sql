-- Add Equipment Calendar permission to privilege_permissions table

-- Equipment Calendar permission (View Access category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('VIEW_EQUIPMENT_CALENDAR', 'Viewer', true, 'View Equipment Calendar', 'View Access', 59),
('VIEW_EQUIPMENT_CALENDAR', 'Viewer+', true, 'View Equipment Calendar', 'View Access', 59),
('VIEW_EQUIPMENT_CALENDAR', 'Editor', true, 'View Equipment Calendar', 'View Access', 59),
('VIEW_EQUIPMENT_CALENDAR', 'Editor+', true, 'View Equipment Calendar', 'View Access', 59),
('VIEW_EQUIPMENT_CALENDAR', 'Admin', true, 'View Equipment Calendar', 'View Access', 59);
