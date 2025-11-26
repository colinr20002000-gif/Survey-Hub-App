-- Add subcontractor management permissions to privilege_permissions table
-- Date: 2025-11-26
-- Description: Add ADD_SUBCONTRACTORS, EDIT_SUBCONTRACTORS, and DELETE_SUBCONTRACTORS permissions
-- Permissions are granted to Editor, Editor+, Admin, and Super Admin

-- ADD_SUBCONTRACTORS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ADD_SUBCONTRACTORS', 'Viewer', false, 'Add Subcontractors', 'Contact Management', 200),
('ADD_SUBCONTRACTORS', 'Viewer+', false, 'Add Subcontractors', 'Contact Management', 200),
('ADD_SUBCONTRACTORS', 'Editor', true, 'Add Subcontractors', 'Contact Management', 200),
('ADD_SUBCONTRACTORS', 'Editor+', true, 'Add Subcontractors', 'Contact Management', 200),
('ADD_SUBCONTRACTORS', 'Admin', true, 'Add Subcontractors', 'Contact Management', 200),
('ADD_SUBCONTRACTORS', 'Super Admin', true, 'Add Subcontractors', 'Contact Management', 200);

-- EDIT_SUBCONTRACTORS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('EDIT_SUBCONTRACTORS', 'Viewer', false, 'Edit Subcontractors', 'Contact Management', 201),
('EDIT_SUBCONTRACTORS', 'Viewer+', false, 'Edit Subcontractors', 'Contact Management', 201),
('EDIT_SUBCONTRACTORS', 'Editor', true, 'Edit Subcontractors', 'Contact Management', 201),
('EDIT_SUBCONTRACTORS', 'Editor+', true, 'Edit Subcontractors', 'Contact Management', 201),
('EDIT_SUBCONTRACTORS', 'Admin', true, 'Edit Subcontractors', 'Contact Management', 201),
('EDIT_SUBCONTRACTORS', 'Super Admin', true, 'Edit Subcontractors', 'Contact Management', 201);

-- DELETE_SUBCONTRACTORS permission (Contact Management category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('DELETE_SUBCONTRACTORS', 'Viewer', false, 'Delete Subcontractors', 'Contact Management', 202),
('DELETE_SUBCONTRACTORS', 'Viewer+', false, 'Delete Subcontractors', 'Contact Management', 202),
('DELETE_SUBCONTRACTORS', 'Editor', true, 'Delete Subcontractors', 'Contact Management', 202),
('DELETE_SUBCONTRACTORS', 'Editor+', true, 'Delete Subcontractors', 'Contact Management', 202),
('DELETE_SUBCONTRACTORS', 'Admin', true, 'Delete Subcontractors', 'Contact Management', 202),
('DELETE_SUBCONTRACTORS', 'Super Admin', true, 'Delete Subcontractors', 'Contact Management', 202);
