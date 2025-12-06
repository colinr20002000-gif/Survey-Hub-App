-- Update Close Calls permissions to 'Resource - Close Calls' category
UPDATE privilege_permissions
SET permission_category = 'Resource - Close Calls'
WHERE permission_key IN ('ADD_CLOSE_CALL', 'EXPORT_CLOSE_CALLS', 'MANAGE_CLOSE_CALLS');

-- Update Media permissions to 'Resource - Media' category
UPDATE privilege_permissions
SET permission_category = 'Resource - Media'
WHERE permission_key IN ('ADD_MEDIA', 'EXPORT_MEDIA', 'MANAGE_MEDIA');
