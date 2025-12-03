-- Migration to fix permission labels for Equipment Assignments page
-- This aligns the Privilege Overview labels with the page name "Assignments"

-- Update the label for the equipment audit trail permission
UPDATE privilege_permissions
SET permission_label = 'Show Audit Trail (Assignments)'
WHERE permission_key = 'SHOW_EQUIPMENT_AUDIT_TRAIL';

-- Update the label for the main view permission for this page
UPDATE privilege_permissions
SET permission_label = 'View Assignments'
WHERE permission_key = 'VIEW_EQUIPMENT';

-- Verify the update (optional, useful for logs)
DO $$
BEGIN
    RAISE NOTICE 'Updated permission labels for Equipment Assignments page';
END $$;
