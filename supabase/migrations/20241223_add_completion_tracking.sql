-- SQL script to add completion tracking fields to both delivery_tasks and project_tasks tables
-- This will track when tasks were completed and by whom

-- Add completion tracking columns to delivery_tasks table
ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add completion tracking columns to project_tasks table
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance on completion tracking lookups
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_completed_by ON delivery_tasks(completed_by);
CREATE INDEX IF NOT EXISTS idx_project_tasks_completed_by ON project_tasks(completed_by);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_completed_at ON delivery_tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_project_tasks_completed_at ON project_tasks(completed_at);