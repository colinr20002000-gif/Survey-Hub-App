-- Fix display order for Resource categories to ensure correct grouping and ordering
-- Ordering: Resource Calendar -> To Do List -> Close Calls -> Media

-- 1. View Access: Place VIEW_MEDIA after VIEW_CLOSE_CALLS (50) and before VIEW_EQUIPMENT_CALENDAR (60)
UPDATE privilege_permissions 
SET display_order = 55 
WHERE permission_key = 'VIEW_MEDIA';

-- 2. Resource - Resource Calendar (Start at 1300)
UPDATE privilege_permissions 
SET display_order = 1300 
WHERE permission_key = 'ALLOCATE_RESOURCES';

UPDATE privilege_permissions 
SET display_order = 1301 
WHERE permission_key = 'EDIT_RESOURCE_ALLOCATIONS';

UPDATE privilege_permissions 
SET display_order = 1302 
WHERE permission_key = 'DELETE_RESOURCE_ALLOCATIONS';

UPDATE privilege_permissions 
SET display_order = 1303 
WHERE permission_key = 'SET_AVAILABILITY_STATUS';

UPDATE privilege_permissions 
SET display_order = 1304 
WHERE permission_key = 'EDIT_AVAILABILITY_STATUS_24H';

UPDATE privilege_permissions 
SET display_order = 1305 
WHERE permission_key = 'EDIT_ANY_AVAILABILITY_STATUS';

UPDATE privilege_permissions 
SET display_order = 1306 
WHERE permission_key = 'SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE';

-- 3. Resource - To Do List (Start at 1320)
UPDATE privilege_permissions 
SET display_order = 1320 
WHERE permission_key = 'CREATE_TASKS';

UPDATE privilege_permissions 
SET display_order = 1321 
WHERE permission_key = 'EDIT_TASKS';

UPDATE privilege_permissions 
SET display_order = 1322 
WHERE permission_key = 'DELETE_TASKS';

UPDATE privilege_permissions 
SET display_order = 1323 
WHERE permission_key = 'ASSIGN_TASKS';

UPDATE privilege_permissions 
SET display_order = 1324 
WHERE permission_key = 'COMPLETE_PROJECT_TASKS';

-- 4. Resource - Close Calls (Start at 1340)
UPDATE privilege_permissions 
SET display_order = 1340 
WHERE permission_key = 'ADD_CLOSE_CALL';

UPDATE privilege_permissions 
SET display_order = 1341 
WHERE permission_key = 'EXPORT_CLOSE_CALLS';

UPDATE privilege_permissions 
SET display_order = 1342 
WHERE permission_key = 'MANAGE_CLOSE_CALLS';

-- 5. Resource - Media (Start at 1360)
UPDATE privilege_permissions 
SET display_order = 1360 
WHERE permission_key = 'ADD_MEDIA';

UPDATE privilege_permissions 
SET display_order = 1361 
WHERE permission_key = 'EXPORT_MEDIA';

UPDATE privilege_permissions 
SET display_order = 1362 
WHERE permission_key = 'MANAGE_MEDIA';
