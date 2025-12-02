-- Add permissions for Check & Adjust features to Privilege Overview

-- 1. ADD_CHECK_ADJUST_LOG (Category: Equipment)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'ADD_CHECK_ADJUST_LOG', 'Add Check & Adjust Log', 'Equipment', 
    CASE WHEN p_level IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    154
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, is_granted = EXCLUDED.is_granted, display_order = EXCLUDED.display_order;

-- 2. EDIT_CHECK_ADJUST_LOG (Category: Equipment)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'EDIT_CHECK_ADJUST_LOG', 'Edit Check & Adjust Log', 'Equipment', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    155
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, is_granted = EXCLUDED.is_granted, display_order = EXCLUDED.display_order;

-- 3. EXPORT_CHECK_ADJUST_REPORTS (Category: Equipment)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'EXPORT_CHECK_ADJUST_REPORTS', 'Export Check & Adjust Reports', 'Equipment', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    156
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, is_granted = EXCLUDED.is_granted, display_order = EXCLUDED.display_order;

-- 4. DELETE_CHECK_ADJUST_LOG (Category: Equipment)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'DELETE_CHECK_ADJUST_LOG', 'Delete Check & Adjust Log', 'Equipment', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    157
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, is_granted = EXCLUDED.is_granted, display_order = EXCLUDED.display_order;

-- 5. EXPORT_CHECK_ADJUST_CERTIFICATE (Category: Equipment)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'EXPORT_CHECK_ADJUST_CERTIFICATE', 'Export Check & Adjust Certificate', 'Equipment', 
    CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    158
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, is_granted = EXCLUDED.is_granted, display_order = EXCLUDED.display_order;
