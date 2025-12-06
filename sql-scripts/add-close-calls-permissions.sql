-- Add permissions for Close Calls buttons to Privilege Overview

-- 1. ADD_CLOSE_CALL (Category: Resource - Close Calls)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'ADD_CLOSE_CALL', 'Add Close Call', 'Resource - Close Calls', 
    CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    151
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;

-- 2. EXPORT_CLOSE_CALLS (Category: Resource - Close Calls)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'EXPORT_CLOSE_CALLS', 'Export Close Calls', 'Resource - Close Calls', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    152
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;

-- 3. MANAGE_CLOSE_CALLS (Category: Resource - Close Calls)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'MANAGE_CLOSE_CALLS', 'Manage Close Calls (Edit/Delete)', 'Resource - Close Calls', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    153
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;