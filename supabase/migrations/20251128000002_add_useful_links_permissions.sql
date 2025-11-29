-- Add permissions for Useful Links feature
-- Date: 2025-11-28

-- Insert permission category if it doesn't exist
INSERT INTO permission_categories (name, display_name, description, sort_order)
VALUES ('useful_links', 'Useful Links', 'Manage useful website links and categories', 14)
ON CONFLICT (name) DO NOTHING;

-- Get the category ID
DO $$
DECLARE
    category_id_var uuid;
BEGIN
    SELECT id INTO category_id_var
    FROM permission_categories
    WHERE name = 'useful_links';

    -- Insert permissions for Useful Links
    INSERT INTO permissions (category_id, name, display_name, description, sort_order)
    VALUES
        (category_id_var, 'view_useful_links', 'View Useful Links', 'Can view the Useful Links page and see all links', 1),
        (category_id_var, 'create_useful_links', 'Create Links', 'Can add new useful links', 2),
        (category_id_var, 'edit_useful_links', 'Edit Links', 'Can edit existing useful links', 3),
        (category_id_var, 'delete_useful_links', 'Delete Links', 'Can delete useful links', 4)
    ON CONFLICT (name) DO NOTHING;
END $$;

-- Set default permissions for each privilege level
DO $$
DECLARE
    perm_view_id uuid;
    perm_create_id uuid;
    perm_edit_id uuid;
    perm_delete_id uuid;
BEGIN
    -- Get permission IDs
    SELECT id INTO perm_view_id FROM permissions WHERE name = 'view_useful_links';
    SELECT id INTO perm_create_id FROM permissions WHERE name = 'create_useful_links';
    SELECT id INTO perm_edit_id FROM permissions WHERE name = 'edit_useful_links';
    SELECT id INTO perm_delete_id FROM permissions WHERE name = 'delete_useful_links';

    -- Super Admin: All permissions
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Super Admin', perm_view_id, true),
        ('Super Admin', perm_create_id, true),
        ('Super Admin', perm_edit_id, true),
        ('Super Admin', perm_delete_id, true)
    ON CONFLICT (privilege, permission_id) DO NOTHING;

    -- Admin: All permissions
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Admin', perm_view_id, true),
        ('Admin', perm_create_id, true),
        ('Admin', perm_edit_id, true),
        ('Admin', perm_delete_id, true)
    ON CONFLICT (privilege, permission_id) DO NOTHING;

    -- Editor Plus: View, Create, Edit
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Editor Plus', perm_view_id, true),
        ('Editor Plus', perm_create_id, true),
        ('Editor Plus', perm_edit_id, true),
        ('Editor Plus', perm_delete_id, false)
    ON CONFLICT (privilege, permission_id) DO NOTHING;

    -- Editor: View, Create
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Editor', perm_view_id, true),
        ('Editor', perm_create_id, true),
        ('Editor', perm_edit_id, false),
        ('Editor', perm_delete_id, false)
    ON CONFLICT (privilege, permission_id) DO NOTHING;

    -- Viewer Plus: View only
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Viewer Plus', perm_view_id, true),
        ('Viewer Plus', perm_create_id, false),
        ('Viewer Plus', perm_edit_id, false),
        ('Viewer Plus', perm_delete_id, false)
    ON CONFLICT (privilege, permission_id) DO NOTHING;

    -- Viewer: View only
    INSERT INTO default_permissions (privilege, permission_id, is_enabled)
    VALUES
        ('Viewer', perm_view_id, true),
        ('Viewer', perm_create_id, false),
        ('Viewer', perm_edit_id, false),
        ('Viewer', perm_delete_id, false)
    ON CONFLICT (privilege, permission_id) DO NOTHING;
END $$;
