-- Reorder Permission Categories for Privilege Overview
-- Sets the display_order to control category ordering in the UI

-- 1. View Access
UPDATE privilege_permissions SET display_order = 10 WHERE permission_category = 'View Access';

-- 2. Settings
UPDATE privilege_permissions SET display_order = 20 WHERE permission_category = 'Settings';

-- 3. Admin
UPDATE privilege_permissions SET display_order = 30 WHERE permission_category = 'Admin';

-- 4. Projects
UPDATE privilege_permissions SET display_order = 40 WHERE permission_category = 'Projects';

-- 5. Announcements
UPDATE privilege_permissions SET display_order = 50 WHERE permission_category = 'Announcements';

-- 6. Resource - Resource Calendar
UPDATE privilege_permissions SET display_order = 60 WHERE permission_category = 'Resource - Resource Calendar';

-- 7. Resource - To Do List
UPDATE privilege_permissions SET display_order = 70 WHERE permission_category = 'Resource - To Do List';

-- 8. Resource - Close Calls
UPDATE privilege_permissions SET display_order = 80 WHERE permission_category = 'Resource - Close Calls';

-- 9. Equipment - Calendar
UPDATE privilege_permissions SET display_order = 90 WHERE permission_category = 'Equipment - Calendar';

-- 10. Equipment - Assignments
UPDATE privilege_permissions SET display_order = 100 WHERE permission_category = 'Equipment - Assignments';

-- 11. Equipment - Register
UPDATE privilege_permissions SET display_order = 110 WHERE permission_category = 'Equipment - Register';

-- 12. Equipment - Check & Adjust
UPDATE privilege_permissions SET display_order = 120 WHERE permission_category = 'Equipment - Check & Adjust';

-- 13. Vehicles - Vehicle Management
UPDATE privilege_permissions SET display_order = 130 WHERE permission_category = 'Vehicles - Vehicle Management';

-- 14. Vehicles - Vehicle Inspection
UPDATE privilege_permissions SET display_order = 140 WHERE permission_category = 'Vehicles - Vehicle Inspection';

-- 15. Delivery - To Do List
UPDATE privilege_permissions SET display_order = 150 WHERE permission_category = 'Delivery - To Do List';

-- 16. Training Centre - Document Hub
UPDATE privilege_permissions SET display_order = 160 WHERE permission_category = 'Training Centre - Document Hub';

-- 17. Contact Details - On-Call Contacts
UPDATE privilege_permissions SET display_order = 170 WHERE permission_category = 'Contact Details - On-Call Contacts';

-- 18. Contact Details - Subcontractors
UPDATE privilege_permissions SET display_order = 180 WHERE permission_category = 'Contact Details - Subcontractors';

-- 19. Contact Details - Useful Contacts
UPDATE privilege_permissions SET display_order = 190 WHERE permission_category = 'Contact Details - Useful Contacts';

-- 20. Analytics - Project Logs
UPDATE privilege_permissions SET display_order = 200 WHERE permission_category = 'Analytics - Project Logs';

-- 21. Analytics - AFV
UPDATE privilege_permissions SET display_order = 210 WHERE permission_category = 'Analytics - AFV';

-- 22. Leaderboard
UPDATE privilege_permissions SET display_order = 220 WHERE permission_category = 'Leaderboard';
