-- Add Equipment Calendar CRUD permissions and Project Logs import permission

-- Equipment Calendar CRUD permissions (Equipment Calendar category)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
-- Create Equipment Calendar Entries
('CREATE_EQUIPMENT_CALENDAR_ENTRY', 'Viewer', false, 'Create Equipment Calendar Entries', 'Equipment Calendar', 60),
('CREATE_EQUIPMENT_CALENDAR_ENTRY', 'Viewer+', false, 'Create Equipment Calendar Entries', 'Equipment Calendar', 60),
('CREATE_EQUIPMENT_CALENDAR_ENTRY', 'Editor', true, 'Create Equipment Calendar Entries', 'Equipment Calendar', 60),
('CREATE_EQUIPMENT_CALENDAR_ENTRY', 'Editor+', true, 'Create Equipment Calendar Entries', 'Equipment Calendar', 60),
('CREATE_EQUIPMENT_CALENDAR_ENTRY', 'Admin', true, 'Create Equipment Calendar Entries', 'Equipment Calendar', 60),

-- Edit Equipment Calendar Entries
('EDIT_EQUIPMENT_CALENDAR_ENTRY', 'Viewer', false, 'Edit Equipment Calendar Entries', 'Equipment Calendar', 61),
('EDIT_EQUIPMENT_CALENDAR_ENTRY', 'Viewer+', false, 'Edit Equipment Calendar Entries', 'Equipment Calendar', 61),
('EDIT_EQUIPMENT_CALENDAR_ENTRY', 'Editor', true, 'Edit Equipment Calendar Entries', 'Equipment Calendar', 61),
('EDIT_EQUIPMENT_CALENDAR_ENTRY', 'Editor+', true, 'Edit Equipment Calendar Entries', 'Equipment Calendar', 61),
('EDIT_EQUIPMENT_CALENDAR_ENTRY', 'Admin', true, 'Edit Equipment Calendar Entries', 'Equipment Calendar', 61),

-- Delete Equipment Calendar Entries
('DELETE_EQUIPMENT_CALENDAR_ENTRY', 'Viewer', false, 'Delete Equipment Calendar Entries', 'Equipment Calendar', 62),
('DELETE_EQUIPMENT_CALENDAR_ENTRY', 'Viewer+', false, 'Delete Equipment Calendar Entries', 'Equipment Calendar', 62),
('DELETE_EQUIPMENT_CALENDAR_ENTRY', 'Editor', true, 'Delete Equipment Calendar Entries', 'Equipment Calendar', 62),
('DELETE_EQUIPMENT_CALENDAR_ENTRY', 'Editor+', true, 'Delete Equipment Calendar Entries', 'Equipment Calendar', 62),
('DELETE_EQUIPMENT_CALENDAR_ENTRY', 'Admin', true, 'Delete Equipment Calendar Entries', 'Equipment Calendar', 62),

-- Project Logs import permission (Admin Access category)
('IMPORT_PROJECT_LOGS', 'Viewer', false, 'Import Project Logs CSV', 'Admin Access', 63),
('IMPORT_PROJECT_LOGS', 'Viewer+', false, 'Import Project Logs CSV', 'Admin Access', 63),
('IMPORT_PROJECT_LOGS', 'Editor', false, 'Import Project Logs CSV', 'Admin Access', 63),
('IMPORT_PROJECT_LOGS', 'Editor+', true, 'Import Project Logs CSV', 'Admin Access', 63),
('IMPORT_PROJECT_LOGS', 'Admin', true, 'Import Project Logs CSV', 'Admin Access', 63);
