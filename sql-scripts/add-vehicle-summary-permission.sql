-- Add VIEW_VEHICLE_SUMMARY permission to all privilege levels
-- This allows the permission to show up in the Privilege Overview and be managed by admins

INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
VALUES 
('Viewer', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105),
('Viewer+', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105),
('Editor', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105),
('Editor+', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105),
('Admin', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105),
('Super Admin', 'VIEW_VEHICLE_SUMMARY', 'View Vehicle Summary', 'View Access', true, 105)
ON CONFLICT (privilege_level, permission_key) DO UPDATE 
SET permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category,
    display_order = EXCLUDED.display_order;
