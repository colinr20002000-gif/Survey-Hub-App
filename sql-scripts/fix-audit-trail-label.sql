-- Update the label for the equipment audit trail permission to match the new "Assignments" page name
UPDATE privilege_permissions
SET permission_label = 'Show Audit Trail (Assignments)'
WHERE permission_key = 'SHOW_EQUIPMENT_AUDIT_TRAIL';

-- Ensure VIEW_EQUIPMENT is labeled correctly as well (just in case)
UPDATE privilege_permissions
SET permission_label = 'View Assignments'
WHERE permission_key = 'VIEW_EQUIPMENT';
