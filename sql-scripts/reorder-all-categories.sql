-- Reorder Permission Categories to match user request
-- This script updates the display_order for all permissions within each category
-- to enforce the specific category order requested.

-- 1. View Access (100-199)
UPDATE privilege_permissions SET display_order = 100 + (display_order % 100)
WHERE permission_category = 'View Access';

-- 2. Settings (200-299)
UPDATE privilege_permissions SET display_order = 200 + (display_order % 100)
WHERE permission_category = 'Settings';

-- 3. Admin (300-399)
UPDATE privilege_permissions SET display_order = 300 + (display_order % 100)
WHERE permission_category = 'Admin';

-- 4. Projects (400-499)
UPDATE privilege_permissions SET display_order = 400 + (display_order % 100)
WHERE permission_category = 'Projects';

-- 5. Announcements (500-599)
UPDATE privilege_permissions SET display_order = 500 + (display_order % 100)
WHERE permission_category = 'Announcements';

-- 6. Resource - Resource Calendar (600-699)
UPDATE privilege_permissions SET display_order = 600 + (display_order % 100)
WHERE permission_category = 'Resource - Resource Calendar';

-- 7. Resource - To Do List (700-799)
UPDATE privilege_permissions SET display_order = 700 + (display_order % 100)
WHERE permission_category = 'Resource - To Do List';

-- 8. Resource - Close Calls (800-899)
UPDATE privilege_permissions SET display_order = 800 + (display_order % 100)
WHERE permission_category = 'Resource - Close Calls';

-- 9. Resource - Media (900-999)
UPDATE privilege_permissions SET display_order = 900 + (display_order % 100)
WHERE permission_category = 'Resource - Media';

-- 10. Equipment - Calendar (1000-1099)
UPDATE privilege_permissions SET display_order = 1000 + (display_order % 100)
WHERE permission_category = 'Equipment - Calendar';

-- 11. Equipment - Assignments (1100-1199)
UPDATE privilege_permissions SET display_order = 1100 + (display_order % 100)
WHERE permission_category = 'Equipment - Assignments';

-- 12. Equipment - Register (1200-1299)
UPDATE privilege_permissions SET display_order = 1200 + (display_order % 100)
WHERE permission_category = 'Equipment - Register';

-- 13. Equipment - Check & Adjust (1300-1399)
UPDATE privilege_permissions SET display_order = 1300 + (display_order % 100)
WHERE permission_category = 'Equipment - Check & Adjust';

-- 14. Vehicles - Vehicle Management (1400-1499)
UPDATE privilege_permissions SET display_order = 1400 + (display_order % 100)
WHERE permission_category = 'Vehicles - Vehicle Management';

-- 15. Vehicles - Vehicle Inspection (1500-1599)
UPDATE privilege_permissions SET display_order = 1500 + (display_order % 100)
WHERE permission_category = 'Vehicles - Vehicle Inspection';

-- 16. Delivery - To Do List (1600-1699)
UPDATE privilege_permissions SET display_order = 1600 + (display_order % 100)
WHERE permission_category = 'Delivery - To Do List';

-- 17. Training Centre - Document Hub (1700-1799)
UPDATE privilege_permissions SET display_order = 1700 + (display_order % 100)
WHERE permission_category = 'Training Centre - Document Hub';

-- 18. Contact Details - On-Call Contacts (1800-1899)
UPDATE privilege_permissions SET display_order = 1800 + (display_order % 100)
WHERE permission_category = 'Contact Details - On-Call Contacts';

-- 19. Contact Details - Subcontractors (1900-1999)
UPDATE privilege_permissions SET display_order = 1900 + (display_order % 100)
WHERE permission_category = 'Contact Details - Subcontractors';

-- 20. Contact Details - Useful Contacts (2000-2099)
UPDATE privilege_permissions SET display_order = 2000 + (display_order % 100)
WHERE permission_category = 'Contact Details - Useful Contacts';

-- 21. Analytics - Project Logs (2100-2199)
UPDATE privilege_permissions SET display_order = 2100 + (display_order % 100)
WHERE permission_category = 'Analytics - Project Logs';

-- 22. Analytics - AFV (2200-2299)
UPDATE privilege_permissions SET display_order = 2200 + (display_order % 100)
WHERE permission_category = 'Analytics - AFV';

-- 23. Leaderboard (2300-2399)
UPDATE privilege_permissions SET display_order = 2300 + (display_order % 100)
WHERE permission_category = 'Leaderboard';
