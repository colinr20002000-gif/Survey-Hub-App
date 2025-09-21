-- SQL script to create the project_tasks table for Supabase
-- This table will store tasks specific to the Project Team

CREATE TABLE project_tasks (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  text text not null,
  completed boolean default false not null,
  project text default 'Project Team' not null,
  assigned_to jsonb default '[]' not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to perform all operations
CREATE POLICY "Enable all access for authenticated users" ON project_tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_project_tasks_completed ON project_tasks(completed);
CREATE INDEX idx_project_tasks_created_at ON project_tasks(created_at);
CREATE INDEX idx_project_tasks_project ON project_tasks(project);

-- Insert some sample project tasks for testing
INSERT INTO project_tasks (text, completed, project, assigned_to) VALUES
('Review project specifications and requirements', false, 'Project Team', '[1, 2]'),
('Coordinate with design team for deliverables', false, 'Project Team', '[2]'),
('Update project timeline and milestones', true, 'Project Team', '[1, 3]'),
('Prepare monthly project status report', false, 'Project Team', '[1]');