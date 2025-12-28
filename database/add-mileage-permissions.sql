DO $$
DECLARE
    privilege text;
    privileges text[] := ARRAY['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];
BEGIN
    FOREACH privilege IN ARRAY privileges
    LOOP
        -- 1. View Access: Mileage Log
        -- Everyone gets view access by default
        INSERT INTO public.privilege_permissions (privilege_level, permission_category, permission_label, permission_key, is_granted, display_order)
        VALUES (privilege, 'View Access', 'Mileage Log', 'VIEW_VEHICLE_MILEAGE', TRUE, 140)
        ON CONFLICT (privilege_level, permission_key) DO UPDATE SET permission_category = 'View Access', permission_label = 'Mileage Log';

        -- 2. Vehicles - Mileage Log: Bulk Exports
        -- Viewer+ and above
        INSERT INTO public.privilege_permissions (privilege_level, permission_category, permission_label, permission_key, is_granted, display_order)
        VALUES (privilege, 'Vehicles - Mileage Log', 'Bulk Exports', 'SHOW_MILEAGE_BULK_EXPORT', 
            CASE WHEN privilege = 'Viewer' THEN FALSE ELSE TRUE END, 10)
        ON CONFLICT (privilege_level, permission_key) DO NOTHING;

        -- 3. Vehicles - Mileage Log: Create Monthly Log
        -- Viewer+ and above
        INSERT INTO public.privilege_permissions (privilege_level, permission_category, permission_label, permission_key, is_granted, display_order)
        VALUES (privilege, 'Vehicles - Mileage Log', 'Create Monthly Log', 'SHOW_MILEAGE_CREATE_LOG', 
            CASE WHEN privilege = 'Viewer' THEN FALSE ELSE TRUE END, 20)
        ON CONFLICT (privilege_level, permission_key) DO NOTHING;

        -- 4. Vehicles - Mileage Log: Manage
        -- Editor and above
        INSERT INTO public.privilege_permissions (privilege_level, permission_category, permission_label, permission_key, is_granted, display_order)
        VALUES (privilege, 'Vehicles - Mileage Log', 'Manage', 'SHOW_MILEAGE_MANAGE_BUTTON', 
            CASE WHEN privilege IN ('Viewer', 'Viewer+') THEN FALSE ELSE TRUE END, 30)
        ON CONFLICT (privilege_level, permission_key) DO NOTHING;

        -- 5. Vehicles - Mileage Log: Submit Log
        -- Viewer+ and above
        INSERT INTO public.privilege_permissions (privilege_level, permission_category, permission_label, permission_key, is_granted, display_order)
        VALUES (privilege, 'Vehicles - Mileage Log', 'Submit Log', 'SHOW_MILEAGE_SUBMIT_LOG', 
            CASE WHEN privilege = 'Viewer' THEN FALSE ELSE TRUE END, 40)
        ON CONFLICT (privilege_level, permission_key) DO NOTHING;

    END LOOP;
END $$;