-- Update privilege permission labels to match new sidebar names

-- Update VIEW_EQUIPMENT label
UPDATE privilege_permissions
SET permission_label = 'View Assignments'
WHERE permission_key = 'VIEW_EQUIPMENT';

-- Update VIEW_EQUIPMENT_CALENDAR label
UPDATE privilege_permissions
SET permission_label = 'View Calendar'
WHERE permission_key = 'VIEW_EQUIPMENT_CALENDAR';
