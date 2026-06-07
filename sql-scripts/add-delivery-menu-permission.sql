-- Add permission for main Delivery menu item to Privilege Overview
-- This allows the main sidebar item to be hidden/shown via the UI

-- 1. Add to active permissions table
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_DELIVERY', 'View Delivery Menu', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 140
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_DELIVERY' AND privilege_level = p_level);

-- 2. Add to defaults table (for factory resets)
INSERT INTO privilege_permission_defaults (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_DELIVERY', 'View Delivery Menu', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 140
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permission_defaults WHERE permission_key = 'VIEW_DELIVERY' AND privilege_level = p_level);

-- 3. Ensure sub-items are correctly ordered after the parent
UPDATE privilege_permissions SET display_order = 141 WHERE permission_key = 'VIEW_DELIVERY_TRACKER';
UPDATE privilege_permissions SET display_order = 142 WHERE permission_key = 'VIEW_DELIVERY_TODO';

UPDATE privilege_permission_defaults SET display_order = 141 WHERE permission_key = 'VIEW_DELIVERY_TRACKER';
UPDATE privilege_permission_defaults SET display_order = 142 WHERE permission_key = 'VIEW_DELIVERY_TODO';
