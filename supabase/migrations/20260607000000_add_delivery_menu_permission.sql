-- Add permission for main Delivery menu item to Privilege Overview
-- This migration adds the 'VIEW_DELIVERY' permission key to the database

-- 1. Add to active permissions table
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order)
SELECT 'VIEW_DELIVERY', p_level, true, 'View Delivery Menu', 'View Access', 140
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO NOTHING;

-- 2. Add to defaults table (for factory resets)
INSERT INTO privilege_permission_defaults (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order)
SELECT 'VIEW_DELIVERY', p_level, true, 'View Delivery Menu', 'View Access', 140
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO NOTHING;

-- 3. Ensure sub-items are correctly ordered after the parent
UPDATE privilege_permissions SET display_order = 141 WHERE permission_key = 'VIEW_DELIVERY_TRACKER';
UPDATE privilege_permissions SET display_order = 142 WHERE permission_key = 'VIEW_DELIVERY_TODO';

UPDATE privilege_permission_defaults SET display_order = 141 WHERE permission_key = 'VIEW_DELIVERY_TRACKER';
UPDATE privilege_permission_defaults SET display_order = 142 WHERE permission_key = 'VIEW_DELIVERY_TODO';
