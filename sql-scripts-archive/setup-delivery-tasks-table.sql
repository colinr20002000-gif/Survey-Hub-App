-- SQL script to create the delivery_tasks table for Supabase
-- This table will store tasks specific to the Delivery Team

CREATE TABLE delivery_tasks (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  text text not null,
  completed boolean default false not null,
  project text default 'Delivery Team' not null,
  assigned_to jsonb default '[]' not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE delivery_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to perform all operations
CREATE POLICY "Enable all access for authenticated users" ON delivery_tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_delivery_tasks_completed ON delivery_tasks(completed);
CREATE INDEX idx_delivery_tasks_created_at ON delivery_tasks(created_at);
CREATE INDEX idx_delivery_tasks_project ON delivery_tasks(project);

-- Insert some sample delivery tasks for testing
INSERT INTO delivery_tasks (text, completed, project, assigned_to) VALUES
('Review delivery schedule for Q4 projects', false, 'Delivery Team', '[1, 2]'),
('Update client delivery notifications', false, 'Delivery Team', '[2]'),
('Coordinate with site teams for equipment delivery', true, 'Delivery Team', '[1, 3]'),
('Prepare monthly delivery report', false, 'Delivery Team', '[1]');