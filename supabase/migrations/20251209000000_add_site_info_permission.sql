-- Add EDIT_SITE_INFORMATION permission to privilege_permissions table

INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('EDIT_SITE_INFORMATION', 'Viewer', false, 'Edit Site Information', 'Projects', 22),
('EDIT_SITE_INFORMATION', 'Viewer+', false, 'Edit Site Information', 'Projects', 22),
('EDIT_SITE_INFORMATION', 'Editor', true, 'Edit Site Information', 'Projects', 22),
('EDIT_SITE_INFORMATION', 'Editor+', true, 'Edit Site Information', 'Projects', 22),
('EDIT_SITE_INFORMATION', 'Admin', true, 'Edit Site Information', 'Projects', 22),
('EDIT_SITE_INFORMATION', 'Super Admin', true, 'Edit Site Information', 'Projects', 22)
ON CONFLICT (permission_key, privilege_level) DO UPDATE SET
    is_granted = EXCLUDED.is_granted,
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category,
    display_order = EXCLUDED.display_order;
