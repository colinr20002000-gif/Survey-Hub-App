-- Add Archive On-Call Contacts permissions

INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
-- Archive On-Call Contacts
('ARCHIVE_ON_CALL_CONTACTS', 'Viewer', false, 'Archive On-Call Contacts', 'Contact Details', 68),
('ARCHIVE_ON_CALL_CONTACTS', 'Viewer+', false, 'Archive On-Call Contacts', 'Contact Details', 68),
('ARCHIVE_ON_CALL_CONTACTS', 'Editor', true, 'Archive On-Call Contacts', 'Contact Details', 68),
('ARCHIVE_ON_CALL_CONTACTS', 'Editor+', true, 'Archive On-Call Contacts', 'Contact Details', 68),
('ARCHIVE_ON_CALL_CONTACTS', 'Admin', true, 'Archive On-Call Contacts', 'Contact Details', 68),

-- View Archived On-Call Contacts
('VIEW_ARCHIVED_ON_CALL_CONTACTS', 'Viewer', false, 'View Archived On-Call Contacts', 'Contact Details', 69),
('VIEW_ARCHIVED_ON_CALL_CONTACTS', 'Viewer+', false, 'View Archived On-Call Contacts', 'Contact Details', 69),
('VIEW_ARCHIVED_ON_CALL_CONTACTS', 'Editor', true, 'View Archived On-Call Contacts', 'Contact Details', 69),
('VIEW_ARCHIVED_ON_CALL_CONTACTS', 'Editor+', true, 'View Archived On-Call Contacts', 'Contact Details', 69),
('VIEW_ARCHIVED_ON_CALL_CONTACTS', 'Admin', true, 'View Archived On-Call Contacts', 'Contact Details', 69);
