-- Direct SQL to add privilege column to dummy_users table
ALTER TABLE dummy_users ADD COLUMN privilege TEXT DEFAULT 'Viewer';