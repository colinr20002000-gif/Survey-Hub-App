-- Add VIEW_VEHICLE_MILEAGE and MANAGE_VEHICLE_MILEAGE to privilege_permissions table

-- VIEW_VEHICLE_MILEAGE (All roles can view)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('VIEW_VEHICLE_MILEAGE', 'Viewer', true, 'View Mileage Logs', 'Vehicles', 35),
('VIEW_VEHICLE_MILEAGE', 'Viewer+', true, 'View Mileage Logs', 'Vehicles', 35),
('VIEW_VEHICLE_MILEAGE', 'Editor', true, 'View Mileage Logs', 'Vehicles', 35),
('VIEW_VEHICLE_MILEAGE', 'Editor+', true, 'View Mileage Logs', 'Vehicles', 35),
('VIEW_VEHICLE_MILEAGE', 'Admin', true, 'View Mileage Logs', 'Vehicles', 35);

-- MANAGE_VEHICLE_MILEAGE (Viewer+ and above can manage/add logs)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('MANAGE_VEHICLE_MILEAGE', 'Viewer', false, 'Manage Mileage Logs', 'Vehicles', 36),
('MANAGE_VEHICLE_MILEAGE', 'Viewer+', true, 'Manage Mileage Logs', 'Vehicles', 36),
('MANAGE_VEHICLE_MILEAGE', 'Editor', true, 'Manage Mileage Logs', 'Vehicles', 36),
('MANAGE_VEHICLE_MILEAGE', 'Editor+', true, 'Manage Mileage Logs', 'Vehicles', 36),
('MANAGE_VEHICLE_MILEAGE', 'Admin', true, 'Manage Mileage Logs', 'Vehicles', 36);
