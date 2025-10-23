-- Add Button Visibility permissions to privilege_permissions table
-- These control visibility of specific UI buttons throughout the application

-- Button Visibility permissions (Equipment Calendar)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_CHECK_DISCREPANCIES_BUTTON', 'Viewer', false, 'Show Check Discrepancies Button', 'Button Visibility', 60),
('SHOW_CHECK_DISCREPANCIES_BUTTON', 'Viewer+', false, 'Show Check Discrepancies Button', 'Button Visibility', 60),
('SHOW_CHECK_DISCREPANCIES_BUTTON', 'Editor', true, 'Show Check Discrepancies Button', 'Button Visibility', 60),
('SHOW_CHECK_DISCREPANCIES_BUTTON', 'Editor+', true, 'Show Check Discrepancies Button', 'Button Visibility', 60),
('SHOW_CHECK_DISCREPANCIES_BUTTON', 'Admin', true, 'Show Check Discrepancies Button', 'Button Visibility', 60);

-- Button Visibility permissions (Resource Calendar - Export Image)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE', 'Viewer', false, 'Show Export Image (Resource Calendar)', 'Button Visibility', 61),
('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE', 'Viewer+', false, 'Show Export Image (Resource Calendar)', 'Button Visibility', 61),
('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE', 'Editor', true, 'Show Export Image (Resource Calendar)', 'Button Visibility', 61),
('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE', 'Editor+', true, 'Show Export Image (Resource Calendar)', 'Button Visibility', 61),
('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE', 'Admin', true, 'Show Export Image (Resource Calendar)', 'Button Visibility', 61);

-- Button Visibility permissions (Equipment Calendar - Export Image)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE', 'Viewer', false, 'Show Export Image (Equipment Calendar)', 'Button Visibility', 62),
('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE', 'Viewer+', false, 'Show Export Image (Equipment Calendar)', 'Button Visibility', 62),
('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE', 'Editor', true, 'Show Export Image (Equipment Calendar)', 'Button Visibility', 62),
('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE', 'Editor+', true, 'Show Export Image (Equipment Calendar)', 'Button Visibility', 62),
('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE', 'Admin', true, 'Show Export Image (Equipment Calendar)', 'Button Visibility', 62);

-- Button Visibility permissions (Project Tasks - Show Archived)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE', 'Viewer', true, 'Show Archived Toggle (Project Tasks)', 'Button Visibility', 63),
('SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE', 'Viewer+', true, 'Show Archived Toggle (Project Tasks)', 'Button Visibility', 63),
('SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE', 'Editor', true, 'Show Archived Toggle (Project Tasks)', 'Button Visibility', 63),
('SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE', 'Editor+', true, 'Show Archived Toggle (Project Tasks)', 'Button Visibility', 63),
('SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE', 'Admin', true, 'Show Archived Toggle (Project Tasks)', 'Button Visibility', 63);

-- Button Visibility permissions (Delivery Tasks - Show Archived)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE', 'Viewer', true, 'Show Archived Toggle (Delivery Tasks)', 'Button Visibility', 64),
('SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE', 'Viewer+', true, 'Show Archived Toggle (Delivery Tasks)', 'Button Visibility', 64),
('SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE', 'Editor', true, 'Show Archived Toggle (Delivery Tasks)', 'Button Visibility', 64),
('SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE', 'Editor+', true, 'Show Archived Toggle (Delivery Tasks)', 'Button Visibility', 64),
('SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE', 'Admin', true, 'Show Archived Toggle (Delivery Tasks)', 'Button Visibility', 64);

-- Button Visibility permissions (Equipment - Audit Trail)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_EQUIPMENT_AUDIT_TRAIL', 'Viewer', false, 'Show Audit Trail (Equipment)', 'Button Visibility', 65),
('SHOW_EQUIPMENT_AUDIT_TRAIL', 'Viewer+', false, 'Show Audit Trail (Equipment)', 'Button Visibility', 65),
('SHOW_EQUIPMENT_AUDIT_TRAIL', 'Editor', true, 'Show Audit Trail (Equipment)', 'Button Visibility', 65),
('SHOW_EQUIPMENT_AUDIT_TRAIL', 'Editor+', true, 'Show Audit Trail (Equipment)', 'Button Visibility', 65),
('SHOW_EQUIPMENT_AUDIT_TRAIL', 'Admin', true, 'Show Audit Trail (Equipment)', 'Button Visibility', 65);

-- Button Visibility permissions (Vehicles - Audit Trail)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_VEHICLE_AUDIT_TRAIL', 'Viewer', false, 'Show Audit Trail (Vehicles)', 'Button Visibility', 66),
('SHOW_VEHICLE_AUDIT_TRAIL', 'Viewer+', false, 'Show Audit Trail (Vehicles)', 'Button Visibility', 66),
('SHOW_VEHICLE_AUDIT_TRAIL', 'Editor', true, 'Show Audit Trail (Vehicles)', 'Button Visibility', 66),
('SHOW_VEHICLE_AUDIT_TRAIL', 'Editor+', true, 'Show Audit Trail (Vehicles)', 'Button Visibility', 66),
('SHOW_VEHICLE_AUDIT_TRAIL', 'Admin', true, 'Show Audit Trail (Vehicles)', 'Button Visibility', 66);

-- Button Visibility permissions (Projects - Show Archived)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_ARCHIVED_PROJECTS_TOGGLE', 'Viewer', true, 'Show Archived Toggle (Projects)', 'Button Visibility', 67),
('SHOW_ARCHIVED_PROJECTS_TOGGLE', 'Viewer+', true, 'Show Archived Toggle (Projects)', 'Button Visibility', 67),
('SHOW_ARCHIVED_PROJECTS_TOGGLE', 'Editor', true, 'Show Archived Toggle (Projects)', 'Button Visibility', 67),
('SHOW_ARCHIVED_PROJECTS_TOGGLE', 'Editor+', true, 'Show Archived Toggle (Projects)', 'Button Visibility', 67),
('SHOW_ARCHIVED_PROJECTS_TOGGLE', 'Admin', true, 'Show Archived Toggle (Projects)', 'Button Visibility', 67);

-- Button Visibility permissions (Equipment - Show Archived)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_ARCHIVED_EQUIPMENT_TOGGLE', 'Viewer', true, 'Show Archived Toggle (Equipment)', 'Button Visibility', 68),
('SHOW_ARCHIVED_EQUIPMENT_TOGGLE', 'Viewer+', true, 'Show Archived Toggle (Equipment)', 'Button Visibility', 68),
('SHOW_ARCHIVED_EQUIPMENT_TOGGLE', 'Editor', true, 'Show Archived Toggle (Equipment)', 'Button Visibility', 68),
('SHOW_ARCHIVED_EQUIPMENT_TOGGLE', 'Editor+', true, 'Show Archived Toggle (Equipment)', 'Button Visibility', 68),
('SHOW_ARCHIVED_EQUIPMENT_TOGGLE', 'Admin', true, 'Show Archived Toggle (Equipment)', 'Button Visibility', 68);

-- Button Visibility permissions (Vehicles - Show Archived)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('SHOW_ARCHIVED_VEHICLES_TOGGLE', 'Viewer', true, 'Show Archived Toggle (Vehicles)', 'Button Visibility', 69),
('SHOW_ARCHIVED_VEHICLES_TOGGLE', 'Viewer+', true, 'Show Archived Toggle (Vehicles)', 'Button Visibility', 69),
('SHOW_ARCHIVED_VEHICLES_TOGGLE', 'Editor', true, 'Show Archived Toggle (Vehicles)', 'Button Visibility', 69),
('SHOW_ARCHIVED_VEHICLES_TOGGLE', 'Editor+', true, 'Show Archived Toggle (Vehicles)', 'Button Visibility', 69),
('SHOW_ARCHIVED_VEHICLES_TOGGLE', 'Admin', true, 'Show Archived Toggle (Vehicles)', 'Button Visibility', 69);
