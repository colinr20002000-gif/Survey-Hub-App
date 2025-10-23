-- Add missing Analytics and Announcements permissions to privilege_permissions table

-- Analytics permissions (View Access category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('VIEW_ANALYTICS', 'Viewer', true, 'View Analytics', 'View Access', 54),
('VIEW_ANALYTICS', 'Viewer+', true, 'View Analytics', 'View Access', 54),
('VIEW_ANALYTICS', 'Editor', true, 'View Analytics', 'View Access', 54),
('VIEW_ANALYTICS', 'Editor+', true, 'View Analytics', 'View Access', 54),
('VIEW_ANALYTICS', 'Admin', true, 'View Analytics', 'View Access', 54);

-- Announcements permissions (View Access category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('VIEW_ANNOUNCEMENTS', 'Viewer', true, 'View Announcements', 'View Access', 55),
('VIEW_ANNOUNCEMENTS', 'Viewer+', true, 'View Announcements', 'View Access', 55),
('VIEW_ANNOUNCEMENTS', 'Editor', true, 'View Announcements', 'View Access', 55),
('VIEW_ANNOUNCEMENTS', 'Editor+', true, 'View Announcements', 'View Access', 55),
('VIEW_ANNOUNCEMENTS', 'Admin', true, 'View Announcements', 'View Access', 55);

-- Admin Announcements permissions (Admin Access category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('CREATE_ANNOUNCEMENTS', 'Viewer', false, 'Create Announcements', 'Admin Access', 56),
('CREATE_ANNOUNCEMENTS', 'Viewer+', false, 'Create Announcements', 'Admin Access', 56),
('CREATE_ANNOUNCEMENTS', 'Editor', false, 'Create Announcements', 'Admin Access', 56),
('CREATE_ANNOUNCEMENTS', 'Editor+', false, 'Create Announcements', 'Admin Access', 56),
('CREATE_ANNOUNCEMENTS', 'Admin', true, 'Create Announcements', 'Admin Access', 56),
('EDIT_ANNOUNCEMENTS', 'Viewer', false, 'Edit Announcements', 'Admin Access', 57),
('EDIT_ANNOUNCEMENTS', 'Viewer+', false, 'Edit Announcements', 'Admin Access', 57),
('EDIT_ANNOUNCEMENTS', 'Editor', false, 'Edit Announcements', 'Admin Access', 57),
('EDIT_ANNOUNCEMENTS', 'Editor+', false, 'Edit Announcements', 'Admin Access', 57),
('EDIT_ANNOUNCEMENTS', 'Admin', true, 'Edit Announcements', 'Admin Access', 57),
('DELETE_ANNOUNCEMENTS', 'Viewer', false, 'Delete Announcements', 'Admin Access', 58),
('DELETE_ANNOUNCEMENTS', 'Viewer+', false, 'Delete Announcements', 'Admin Access', 58),
('DELETE_ANNOUNCEMENTS', 'Editor', false, 'Delete Announcements', 'Admin Access', 58),
('DELETE_ANNOUNCEMENTS', 'Editor+', false, 'Delete Announcements', 'Admin Access', 58),
('DELETE_ANNOUNCEMENTS', 'Admin', true, 'Delete Announcements', 'Admin Access', 58);
