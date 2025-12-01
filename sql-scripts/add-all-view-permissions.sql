-- Add new permissions for new sidebar items if they don't exist
-- Corrected: Removed 'description' column which does not exist in the table

-- Equipment > Assignments
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_EQUIPMENT', 'View Assignments', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 100
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_EQUIPMENT' AND privilege_level = p_level);

-- Equipment > Calendar
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_EQUIPMENT_CALENDAR', 'View Calendar', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 101
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_EQUIPMENT_CALENDAR' AND privilege_level = p_level);

-- Equipment > Register
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_EQUIPMENT_REGISTER', 'View Equipment Register', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 102
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_EQUIPMENT_REGISTER' AND privilege_level = p_level);

-- Equipment > Check & Adjust
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_CHECK_ADJUST', 'View Check & Adjust', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 103
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_CHECK_ADJUST' AND privilege_level = p_level);

-- Vehicles > Vehicle Inspection
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_VEHICLE_INSPECTION', 'View Vehicle Inspections', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 111
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_VEHICLE_INSPECTION' AND privilege_level = p_level);

-- Training Centre > Video Tutorials
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_VIDEO_TUTORIALS', 'View Video Tutorials', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 121
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_VIDEO_TUTORIALS' AND privilege_level = p_level);

-- Training Centre > Rail Components
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_RAIL_COMPONENTS', 'View Rail Components', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 122
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_RAIL_COMPONENTS' AND privilege_level = p_level);

-- Analytics > Resource
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_RESOURCE_ANALYTICS', 'View Resource Analytics', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 131
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_RESOURCE_ANALYTICS' AND privilege_level = p_level);

-- Delivery > Delivery Tracker
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_DELIVERY_TRACKER', 'View Delivery Tracker', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 141
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_DELIVERY_TRACKER' AND privilege_level = p_level);

-- Delivery > To Do List
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_DELIVERY_TODO', 'View Delivery To Do', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 142
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_DELIVERY_TODO' AND privilege_level = p_level);