-- Add AFV and Project Logs permissions to privilege_permissions table

-- First, find the highest display_order to append new permissions at the end
-- We'll start at display_order 200 to ensure we don't conflict with existing permissions

-- VIEW_AFV permission - granted to all privilege levels
INSERT INTO privilege_permissions (permission_key, privilege_level, permission_label, permission_category, is_granted, display_order)
VALUES
    ('VIEW_AFV', 'Viewer', 'View AFV Dashboard', 'View Permissions', true, 200),
    ('VIEW_AFV', 'Viewer+', 'View AFV Dashboard', 'View Permissions', true, 201),
    ('VIEW_AFV', 'Editor', 'View AFV Dashboard', 'View Permissions', true, 202),
    ('VIEW_AFV', 'Editor+', 'View AFV Dashboard', 'View Permissions', true, 203),
    ('VIEW_AFV', 'Admin', 'View AFV Dashboard', 'View Permissions', true, 204),
    ('VIEW_AFV', 'Super Admin', 'View AFV Dashboard', 'View Permissions', true, 205);

-- VIEW_PROJECT_LOGS permission - granted to all privilege levels
INSERT INTO privilege_permissions (permission_key, privilege_level, permission_label, permission_category, is_granted, display_order)
VALUES
    ('VIEW_PROJECT_LOGS', 'Viewer', 'View Project Logs', 'View Permissions', true, 206),
    ('VIEW_PROJECT_LOGS', 'Viewer+', 'View Project Logs', 'View Permissions', true, 207),
    ('VIEW_PROJECT_LOGS', 'Editor', 'View Project Logs', 'View Permissions', true, 208),
    ('VIEW_PROJECT_LOGS', 'Editor+', 'View Project Logs', 'View Permissions', true, 209),
    ('VIEW_PROJECT_LOGS', 'Admin', 'View Project Logs', 'View Permissions', true, 210),
    ('VIEW_PROJECT_LOGS', 'Super Admin', 'View Project Logs', 'View Permissions', true, 211);

-- IMPORT_AFV_CSV permission - granted only to Admin and Super Admin
INSERT INTO privilege_permissions (permission_key, privilege_level, permission_label, permission_category, is_granted, display_order)
VALUES
    ('IMPORT_AFV_CSV', 'Viewer', 'Import AFV CSV', 'Import Permissions', false, 212),
    ('IMPORT_AFV_CSV', 'Viewer+', 'Import AFV CSV', 'Import Permissions', false, 213),
    ('IMPORT_AFV_CSV', 'Editor', 'Import AFV CSV', 'Import Permissions', false, 214),
    ('IMPORT_AFV_CSV', 'Editor+', 'Import AFV CSV', 'Import Permissions', false, 215),
    ('IMPORT_AFV_CSV', 'Admin', 'Import AFV CSV', 'Import Permissions', true, 216),
    ('IMPORT_AFV_CSV', 'Super Admin', 'Import AFV CSV', 'Import Permissions', true, 217);

-- IMPORT_PROJECT_LOGS_CSV permission - granted only to Admin and Super Admin
INSERT INTO privilege_permissions (permission_key, privilege_level, permission_label, permission_category, is_granted, display_order)
VALUES
    ('IMPORT_PROJECT_LOGS_CSV', 'Viewer', 'Import Project Logs CSV', 'Import Permissions', false, 218),
    ('IMPORT_PROJECT_LOGS_CSV', 'Viewer+', 'Import Project Logs CSV', 'Import Permissions', false, 219),
    ('IMPORT_PROJECT_LOGS_CSV', 'Editor', 'Import Project Logs CSV', 'Import Permissions', false, 220),
    ('IMPORT_PROJECT_LOGS_CSV', 'Editor+', 'Import Project Logs CSV', 'Import Permissions', false, 221),
    ('IMPORT_PROJECT_LOGS_CSV', 'Admin', 'Import Project Logs CSV', 'Import Permissions', true, 222),
    ('IMPORT_PROJECT_LOGS_CSV', 'Super Admin', 'Import Project Logs CSV', 'Import Permissions', true, 223);