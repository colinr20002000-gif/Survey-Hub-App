-- Add SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON permission
-- This controls the visibility of the "Manage" button on the Equipment Register page

INSERT INTO public.privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order)
VALUES 
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Viewer', false, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120),
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Viewer+', false, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120),
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Editor', true, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120),
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Editor+', true, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120),
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Admin', true, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120),
  ('SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON', 'Super Admin', true, 'Show Manage Button (Equipment Register)', 'Button Visibility', 120)
ON CONFLICT (permission_key, privilege_level) DO UPDATE
SET 
  is_granted = EXCLUDED.is_granted,
  permission_label = EXCLUDED.permission_label,
  permission_category = EXCLUDED.permission_category,
  display_order = EXCLUDED.display_order;
