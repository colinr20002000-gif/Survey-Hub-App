-- Add privilege column to dummy_users table
ALTER TABLE dummy_users ADD COLUMN privilege TEXT DEFAULT 'Viewer';

-- Update existing dummy users to have Viewer privilege if they don't have one
UPDATE dummy_users
SET privilege = 'Viewer'
WHERE privilege IS NULL;

-- Add a check constraint to ensure only valid privileges are used
ALTER TABLE dummy_users
ADD CONSTRAINT dummy_users_privilege_check
CHECK (privilege IN ('Viewer', 'Viewer+', 'Editor', 'Subcontractor', 'Admin'));