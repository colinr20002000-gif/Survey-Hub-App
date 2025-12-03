-- Add Leaderboard permissions to privilege_permissions table

-- Analytics > Leaderboard
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_LEADERBOARD', 'View Leaderboard', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 150
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_LEADERBOARD' AND privilege_level = p_level);

-- Button Visibility permissions (Leaderboard - Settings)
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('MANAGE_LEADERBOARD_SETTINGS', 'Viewer', false, 'Manage Leaderboard Settings', 'Button Visibility', 70),
('MANAGE_LEADERBOARD_SETTINGS', 'Viewer+', false, 'Manage Leaderboard Settings', 'Button Visibility', 70),
('MANAGE_LEADERBOARD_SETTINGS', 'Editor', false, 'Manage Leaderboard Settings', 'Button Visibility', 70),
('MANAGE_LEADERBOARD_SETTINGS', 'Editor+', false, 'Manage Leaderboard Settings', 'Button Visibility', 70),
('MANAGE_LEADERBOARD_SETTINGS', 'Admin', true, 'Manage Leaderboard Settings', 'Button Visibility', 70),
('MANAGE_LEADERBOARD_SETTINGS', 'Super Admin', true, 'Manage Leaderboard Settings', 'Button Visibility', 70);
