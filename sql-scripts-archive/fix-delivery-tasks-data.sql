-- Fix delivery tasks data to use proper UUID strings instead of integer IDs
-- This script clears the existing sample data and updates it with valid UUIDs

-- First, clear the existing sample data
DELETE FROM delivery_tasks;

-- Insert new sample delivery tasks with proper UUID format for assigned_to
-- Note: These UUIDs should match actual user IDs in your users table
-- You can replace these with actual user UUIDs from your users table

INSERT INTO delivery_tasks (text, completed, project, assigned_to) VALUES
('Review delivery schedule for Q4 projects', false, 'Delivery Team', '[]'),
('Update client delivery notifications', false, 'Delivery Team', '[]'),
('Coordinate with site teams for equipment delivery', true, 'Delivery Team', '[]'),
('Prepare monthly delivery report', false, 'Delivery Team', '[]');

-- Note: The assigned_to field is now empty arrays [] since we don't have the actual UUIDs
-- Once this script is run, new delivery tasks can be created with proper UUID assignments from the UI