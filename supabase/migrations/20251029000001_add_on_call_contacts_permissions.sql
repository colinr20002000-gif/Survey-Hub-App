-- Add On-Call Contacts permissions

INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
-- View On-Call Contacts
('VIEW_ON_CALL_CONTACTS', 'Viewer', true, 'View On-Call Contacts', 'Contact Details', 64),
('VIEW_ON_CALL_CONTACTS', 'Viewer+', true, 'View On-Call Contacts', 'Contact Details', 64),
('VIEW_ON_CALL_CONTACTS', 'Editor', true, 'View On-Call Contacts', 'Contact Details', 64),
('VIEW_ON_CALL_CONTACTS', 'Editor+', true, 'View On-Call Contacts', 'Contact Details', 64),
('VIEW_ON_CALL_CONTACTS', 'Admin', true, 'View On-Call Contacts', 'Contact Details', 64),

-- Create On-Call Contacts
('CREATE_ON_CALL_CONTACTS', 'Viewer', false, 'Create On-Call Contacts', 'Contact Details', 65),
('CREATE_ON_CALL_CONTACTS', 'Viewer+', false, 'Create On-Call Contacts', 'Contact Details', 65),
('CREATE_ON_CALL_CONTACTS', 'Editor', true, 'Create On-Call Contacts', 'Contact Details', 65),
('CREATE_ON_CALL_CONTACTS', 'Editor+', true, 'Create On-Call Contacts', 'Contact Details', 65),
('CREATE_ON_CALL_CONTACTS', 'Admin', true, 'Create On-Call Contacts', 'Contact Details', 65),

-- Edit On-Call Contacts
('EDIT_ON_CALL_CONTACTS', 'Viewer', false, 'Edit On-Call Contacts', 'Contact Details', 66),
('EDIT_ON_CALL_CONTACTS', 'Viewer+', false, 'Edit On-Call Contacts', 'Contact Details', 66),
('EDIT_ON_CALL_CONTACTS', 'Editor', true, 'Edit On-Call Contacts', 'Contact Details', 66),
('EDIT_ON_CALL_CONTACTS', 'Editor+', true, 'Edit On-Call Contacts', 'Contact Details', 66),
('EDIT_ON_CALL_CONTACTS', 'Admin', true, 'Edit On-Call Contacts', 'Contact Details', 66),

-- Delete On-Call Contacts
('DELETE_ON_CALL_CONTACTS', 'Viewer', false, 'Delete On-Call Contacts', 'Contact Details', 67),
('DELETE_ON_CALL_CONTACTS', 'Viewer+', false, 'Delete On-Call Contacts', 'Contact Details', 67),
('DELETE_ON_CALL_CONTACTS', 'Editor', true, 'Delete On-Call Contacts', 'Contact Details', 67),
('DELETE_ON_CALL_CONTACTS', 'Editor+', true, 'Delete On-Call Contacts', 'Contact Details', 67),
('DELETE_ON_CALL_CONTACTS', 'Admin', true, 'Delete On-Call Contacts', 'Contact Details', 67);
