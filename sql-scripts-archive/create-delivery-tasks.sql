-- Simple SQL to create delivery_tasks table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE delivery_tasks (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  text text not null,
  completed boolean default false not null,
  project text default 'Delivery Team' not null,
  assigned_to jsonb default '[]' not null
);

-- Enable Row Level Security
ALTER TABLE delivery_tasks ENABLE ROW LEVEL SECURITY;

-- Simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON delivery_tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO delivery_tasks (text, completed, project, assigned_to) VALUES
('Review delivery schedule for Q4 projects', false, 'Delivery Team', '[1, 2]'),
('Update client delivery notifications', false, 'Delivery Team', '[2]'),
('Coordinate with site teams for equipment delivery', true, 'Delivery Team', '[1, 3]'),
('Prepare monthly delivery report', false, 'Delivery Team', '[1]');