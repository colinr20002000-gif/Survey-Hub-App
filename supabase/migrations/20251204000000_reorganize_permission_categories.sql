-- Reorganize Permission Categories by Page/Section
-- This migration reorganizes permissions to match the sidebar structure
-- Each section represents a page or sub-page from the navigation menu

-- ============================================
-- VIEW ACCESS - All page access permissions
-- ============================================
UPDATE privilege_permissions SET permission_category = 'View Access'
WHERE permission_key IN (
    'ACCESS_ADMIN_MODE',
    'VIEW_PROJECTS',
    'VIEW_ANNOUNCEMENTS',
    'VIEW_RESOURCE_CALENDAR',
    'VIEW_TASKS',
    'VIEW_CLOSE_CALLS',
    'VIEW_EQUIPMENT_CALENDAR',
    'VIEW_EQUIPMENT',
    'VIEW_EQUIPMENT_REGISTER',
    'VIEW_CHECK_ADJUST',
    'VIEW_VEHICLES',
    'VIEW_VEHICLE_INSPECTION',
    'VIEW_DELIVERY_TRACKER',
    'VIEW_DELIVERY_TODO',
    'VIEW_DOCUMENT_HUB',
    'VIEW_VIDEO_TUTORIALS',
    'VIEW_RAIL_COMPONENTS',
    'VIEW_ANALYTICS',
    'VIEW_PROJECT_LOGS',
    'VIEW_RESOURCE_ANALYTICS',
    'VIEW_AFV',
    'VIEW_LEADERBOARD'
);

-- ============================================
-- PROJECTS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Projects'
WHERE permission_key IN (
    'CREATE_PROJECTS',
    'EDIT_PROJECTS',
    'DELETE_PROJECTS',
    'ARCHIVE_PROJECTS',
    'SHOW_ARCHIVED_PROJECTS_TOGGLE',
    'SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE',
    'UPLOAD_PROJECT_FILES',
    'DOWNLOAD_PROJECT_FILES'
);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Announcements'
WHERE permission_key IN (
    'CREATE_ANNOUNCEMENTS',
    'EDIT_ANNOUNCEMENTS',
    'DELETE_ANNOUNCEMENTS'
);

-- ============================================
-- RESOURCE - RESOURCE CALENDAR
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Resource - Resource Calendar'
WHERE permission_key IN (
    'ALLOCATE_RESOURCES',
    'EDIT_RESOURCE_ALLOCATIONS',
    'DELETE_RESOURCE_ALLOCATIONS',
    'SET_AVAILABILITY_STATUS',
    'EDIT_AVAILABILITY_STATUS_24H',
    'EDIT_ANY_AVAILABILITY_STATUS',
    'SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE'
);

-- ============================================
-- RESOURCE - TO DO LIST
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Resource - To Do List'
WHERE permission_key IN (
    'CREATE_TASKS',
    'EDIT_TASKS',
    'DELETE_TASKS',
    'ASSIGN_TASKS',
    'COMPLETE_PROJECT_TASKS'
);

-- ============================================
-- RESOURCE - CLOSE CALLS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Resource - Close Calls'
WHERE permission_key IN (
    'ADD_CLOSE_CALL',
    'MANAGE_CLOSE_CALLS',
    'EXPORT_CLOSE_CALLS'
);

-- ============================================
-- EQUIPMENT - CALENDAR
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Equipment - Calendar'
WHERE permission_key IN (
    'CREATE_EQUIPMENT_CALENDAR_ENTRY',
    'EDIT_EQUIPMENT_CALENDAR_ENTRY',
    'DELETE_EQUIPMENT_CALENDAR_ENTRY',
    'SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE',
    'SHOW_CHECK_DISCREPANCIES_BUTTON'
);

-- ============================================
-- EQUIPMENT - ASSIGNMENTS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Equipment - Assignments'
WHERE permission_key IN (
    'ASSIGN_EQUIPMENT',
    'TRANSFER_EQUIPMENT',
    'RETURN_EQUIPMENT',
    'ADD_EQUIPMENT_COMMENTS',
    'DELETE_EQUIPMENT_COMMENTS',
    'SHOW_EQUIPMENT_AUDIT_TRAIL',
    'SHOW_ARCHIVED_EQUIPMENT_TOGGLE'
);

-- ============================================
-- EQUIPMENT - REGISTER
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Equipment - Register'
WHERE permission_key IN (
    'ADD_EQUIPMENT',
    'EDIT_EQUIPMENT',
    'DELETE_EQUIPMENT',
    'SHOW_EQUIPMENT_REGISTER_MANAGE_BUTTON',
    'IMPORT_ASSETS_CSV',
    'DELETE_ALL_ASSETS'
);

-- ============================================
-- EQUIPMENT - CHECK & ADJUST
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Equipment - Check & Adjust'
WHERE permission_key IN (
    'ADD_CHECK_ADJUST_LOG',
    'EDIT_CHECK_ADJUST_LOG',
    'DELETE_CHECK_ADJUST_LOG',
    'EXPORT_CHECK_ADJUST_REPORTS',
    'EXPORT_CHECK_ADJUST_CERTIFICATE'
);

-- ============================================
-- VEHICLES - VEHICLE MANAGEMENT
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Vehicles - Vehicle Management'
WHERE permission_key IN (
    'ADD_VEHICLES',
    'EDIT_VEHICLES',
    'DELETE_VEHICLES',
    'ASSIGN_VEHICLES',
    'RETURN_VEHICLES',
    'ADD_VEHICLE_COMMENTS',
    'DELETE_VEHICLE_COMMENTS',
    'SHOW_VEHICLE_AUDIT_TRAIL',
    'SHOW_ARCHIVED_VEHICLES_TOGGLE'
);

-- ============================================
-- VEHICLES - VEHICLE INSPECTION
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Vehicles - Vehicle Inspection'
WHERE permission_key IN (
    'CREATE_VEHICLE_INSPECTIONS',
    'VIEW_VEHICLE_INSPECTIONS',
    'DELETE_VEHICLE_INSPECTIONS',
    'EXPORT_VEHICLE_INSPECTIONS',
    'CLEANUP_VEHICLE_INSPECTION_PHOTOS'
);

-- ============================================
-- DELIVERY - TO DO LIST
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Delivery - To Do List'
WHERE permission_key IN (
    'SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE'
);

-- ============================================
-- TRAINING CENTRE - DOCUMENT HUB
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Training Centre - Document Hub'
WHERE permission_key IN (
    'UPLOAD_DOCUMENTS',
    'DELETE_DOCUMENTS',
    'DOWNLOAD_DOCUMENT_HUB_FILES'
);

-- ============================================
-- CONTACT DETAILS - SUBCONTRACTORS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Contact Details - Subcontractors'
WHERE permission_key IN (
    'ADD_SUBCONTRACTORS',
    'EDIT_SUBCONTRACTORS',
    'DELETE_SUBCONTRACTORS'
);

-- ============================================
-- CONTACT DETAILS - USEFUL CONTACTS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Contact Details - Useful Contacts'
WHERE permission_key IN (
    'ADD_USEFUL_CONTACTS',
    'EDIT_USEFUL_CONTACTS',
    'DELETE_USEFUL_CONTACTS'
);

-- ============================================
-- CONTACT DETAILS - ON-CALL CONTACTS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Contact Details - On-Call Contacts'
WHERE permission_key IN (
    'CREATE_ON_CALL_CONTACTS',
    'EDIT_ON_CALL_CONTACTS',
    'DELETE_ON_CALL_CONTACTS',
    'ARCHIVE_ON_CALL_CONTACTS',
    'VIEW_ON_CALL_CONTACTS',
    'VIEW_ARCHIVED_ON_CALL_CONTACTS'
);

-- ============================================
-- ANALYTICS - PROJECT LOGS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Analytics - Project Logs'
WHERE permission_key IN (
    'IMPORT_PROJECT_LOGS',
    'IMPORT_PROJECT_LOGS_CSV'
);

-- ============================================
-- ANALYTICS - AFV
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Analytics - AFV'
WHERE permission_key IN (
    'IMPORT_AFV_CSV'
);

-- ============================================
-- LEADERBOARD
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Leaderboard'
WHERE permission_key IN (
    'MANAGE_LEADERBOARD_SETTINGS'
);

-- ============================================
-- SETTINGS
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Settings'
WHERE permission_key IN (
    'CHANGE_PASSWORD',
    'TOGGLE_THEME',
    'SUBMIT_FEEDBACK',
    'USE_FILTERS',
    'USE_SORT'
);

-- ============================================
-- ADMIN
-- ============================================
UPDATE privilege_permissions SET permission_category = 'Admin'
WHERE permission_key IN (
    'ACCESS_FEEDBACK',
    'ACCESS_USER_ADMIN',
    'ACCESS_DOCUMENT_MANAGEMENT',
    'ACCESS_DROPDOWN_MENU',
    'ACCESS_AUDIT_TRAIL',
    'ACCESS_CALENDAR_COLOURS',
    'CREATE_USERS',
    'EDIT_USERS',
    'DELETE_USERS',
    'CHANGE_USER_PRIVILEGES',
    'MANAGE_SYSTEM_SETTINGS'
);

-- Update display_order to group permissions better within each category
-- View Access permissions
UPDATE privilege_permissions SET display_order = 1 WHERE permission_key = 'ACCESS_ADMIN_MODE';
UPDATE privilege_permissions SET display_order = 10 WHERE permission_key = 'VIEW_PROJECTS';
UPDATE privilege_permissions SET display_order = 20 WHERE permission_key = 'VIEW_ANNOUNCEMENTS';
UPDATE privilege_permissions SET display_order = 30 WHERE permission_key = 'VIEW_RESOURCE_CALENDAR';
UPDATE privilege_permissions SET display_order = 40 WHERE permission_key = 'VIEW_TASKS';
UPDATE privilege_permissions SET display_order = 50 WHERE permission_key = 'VIEW_CLOSE_CALLS';
UPDATE privilege_permissions SET display_order = 60 WHERE permission_key = 'VIEW_EQUIPMENT_CALENDAR';
UPDATE privilege_permissions SET display_order = 70 WHERE permission_key = 'VIEW_EQUIPMENT';
UPDATE privilege_permissions SET display_order = 80 WHERE permission_key = 'VIEW_EQUIPMENT_REGISTER';
UPDATE privilege_permissions SET display_order = 90 WHERE permission_key = 'VIEW_CHECK_ADJUST';
UPDATE privilege_permissions SET display_order = 100 WHERE permission_key = 'VIEW_VEHICLES';
UPDATE privilege_permissions SET display_order = 110 WHERE permission_key = 'VIEW_VEHICLE_INSPECTION';
UPDATE privilege_permissions SET display_order = 120 WHERE permission_key = 'VIEW_DELIVERY_TRACKER';
UPDATE privilege_permissions SET display_order = 130 WHERE permission_key = 'VIEW_DELIVERY_TODO';
UPDATE privilege_permissions SET display_order = 140 WHERE permission_key = 'VIEW_DOCUMENT_HUB';
UPDATE privilege_permissions SET display_order = 150 WHERE permission_key = 'VIEW_VIDEO_TUTORIALS';
UPDATE privilege_permissions SET display_order = 160 WHERE permission_key = 'VIEW_RAIL_COMPONENTS';
UPDATE privilege_permissions SET display_order = 170 WHERE permission_key = 'VIEW_ANALYTICS';
UPDATE privilege_permissions SET display_order = 180 WHERE permission_key = 'VIEW_PROJECT_LOGS';
UPDATE privilege_permissions SET display_order = 190 WHERE permission_key = 'VIEW_RESOURCE_ANALYTICS';
UPDATE privilege_permissions SET display_order = 200 WHERE permission_key = 'VIEW_AFV';
UPDATE privilege_permissions SET display_order = 210 WHERE permission_key = 'VIEW_LEADERBOARD';
