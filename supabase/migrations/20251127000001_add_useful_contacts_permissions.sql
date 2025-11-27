-- Add useful contacts management permissions to privilege_permissions table
-- Date: 2025-11-27
-- Description: Add ADD_USEFUL_CONTACTS, EDIT_USEFUL_CONTACTS, and DELETE_USEFUL_CONTACTS permissions
-- Permissions are granted to Editor, Editor+, Admin, and Super Admin

-- ADD_USEFUL_CONTACTS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ADD_USEFUL_CONTACTS', 'Viewer', false, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Viewer+', false, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Editor', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Editor+', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Admin', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Super Admin', true, 'Add Useful Contacts', 'Contact Management', 203);

-- EDIT_USEFUL_CONTACTS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('EDIT_USEFUL_CONTACTS', 'Viewer', false, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Viewer+', false, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Editor', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Editor+', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Admin', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Super Admin', true, 'Edit Useful Contacts', 'Contact Management', 204);

-- DELETE_USEFUL_CONTACTS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('DELETE_USEFUL_CONTACTS', 'Viewer', false, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Viewer+', false, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Editor', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Editor+', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Admin', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Super Admin', true, 'Delete Useful Contacts', 'Contact Management', 205);

-- Sync to defaults table
INSERT INTO privilege_permission_defaults (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ADD_USEFUL_CONTACTS', 'Viewer', false, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Viewer+', false, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Editor', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Editor+', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Admin', true, 'Add Useful Contacts', 'Contact Management', 203),
('ADD_USEFUL_CONTACTS', 'Super Admin', true, 'Add Useful Contacts', 'Contact Management', 203),
('EDIT_USEFUL_CONTACTS', 'Viewer', false, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Viewer+', false, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Editor', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Editor+', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Admin', true, 'Edit Useful Contacts', 'Contact Management', 204),
('EDIT_USEFUL_CONTACTS', 'Super Admin', true, 'Edit Useful Contacts', 'Contact Management', 204),
('DELETE_USEFUL_CONTACTS', 'Viewer', false, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Viewer+', false, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Editor', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Editor+', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Admin', true, 'Delete Useful Contacts', 'Contact Management', 205),
('DELETE_USEFUL_CONTACTS', 'Super Admin', true, 'Delete Useful Contacts', 'Contact Management', 205);
