-- Fix delivery tasks data to use proper UUID strings instead of integer IDs
-- This script changes the column type and clears the existing sample data

-- First, clear the existing sample data
DELETE FROM delivery_tasks;

-- Change the assigned_to column from bigint[] to jsonb to support UUID strings
ALTER TABLE delivery_tasks
ALTER COLUMN assigned_to TYPE jsonb USING '[]'::jsonb;

-- Insert new sample delivery tasks with proper JSONB format for assigned_to
INSERT INTO delivery_tasks (text, completed, project, assigned_to) VALUES
('Review delivery schedule for Q4 projects', false, 'Delivery Team', '[]'::jsonb),
('Update client delivery notifications', false, 'Delivery Team', '[]'::jsonb),
('Coordinate with site teams for equipment delivery', true, 'Delivery Team', '[]'::jsonb),
('Prepare monthly delivery report', false, 'Delivery Team', '[]'::jsonb);

-- Note: The assigned_to field is now empty JSONB arrays [] and can store UUID strings
-- New delivery tasks can be created with proper UUID assignments from the UI