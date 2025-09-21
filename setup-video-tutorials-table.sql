-- SQL script to create the video_tutorials table for Supabase
-- This table will store video tutorial information with dynamic categories

CREATE TABLE video_tutorials (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  title text not null,
  url text not null,
  category_value text not null,
  description text,
  thumbnail_url text,
  is_active boolean default true not null,
  created_by uuid references auth.users(id),
  sort_order integer default 0
);

-- Enable Row Level Security (RLS)
ALTER TABLE video_tutorials ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view all videos
CREATE POLICY "Enable read access for authenticated users" ON video_tutorials
FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admin/super admin to perform all operations
CREATE POLICY "Enable all access for admin users" ON video_tutorials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.jwt() ->> 'sub'
    AND users.privilege IN ('Admin', 'Super Admin')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_video_tutorials_category ON video_tutorials(category_value);
CREATE INDEX idx_video_tutorials_active ON video_tutorials(is_active);
CREATE INDEX idx_video_tutorials_sort_order ON video_tutorials(sort_order);
CREATE INDEX idx_video_tutorials_created_at ON video_tutorials(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_tutorials_updated_at
    BEFORE UPDATE ON video_tutorials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample categories for video tutorials (run this only if the category doesn't exist)
-- First, check if 'video_tutorials' category exists, if not create it
INSERT INTO dropdown_categories (name, description)
SELECT 'video_tutorials', 'Categories for video tutorials'
WHERE NOT EXISTS (
    SELECT 1 FROM dropdown_categories WHERE name = 'video_tutorials'
);

-- Insert sample category items for video tutorials (only if category exists)
DO $$
DECLARE
    category_id_var bigint;
BEGIN
    -- Get the category ID
    SELECT id INTO category_id_var FROM dropdown_categories WHERE name = 'video_tutorials';

    IF category_id_var IS NOT NULL THEN
        -- Insert sample categories if they don't exist
        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        SELECT category_id_var, 'getting_started', 'Getting Started', 1, true
        WHERE NOT EXISTS (
            SELECT 1 FROM dropdown_items
            WHERE category_id = category_id_var AND value = 'getting_started'
        );

        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        SELECT category_id_var, 'basic_operations', 'Basic Operations', 2, true
        WHERE NOT EXISTS (
            SELECT 1 FROM dropdown_items
            WHERE category_id = category_id_var AND value = 'basic_operations'
        );

        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        SELECT category_id_var, 'advanced_features', 'Advanced Features', 3, true
        WHERE NOT EXISTS (
            SELECT 1 FROM dropdown_items
            WHERE category_id = category_id_var AND value = 'advanced_features'
        );

        INSERT INTO dropdown_items (category_id, value, display_text, sort_order, is_active)
        SELECT category_id_var, 'troubleshooting', 'Troubleshooting', 4, true
        WHERE NOT EXISTS (
            SELECT 1 FROM dropdown_items
            WHERE category_id = category_id_var AND value = 'troubleshooting'
        );
    END IF;
END $$;

-- Insert some sample video tutorials for testing
INSERT INTO video_tutorials (title, url, category_value, description) VALUES
('Welcome to Survey Hub', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'getting_started', 'An introduction to the Survey Hub platform and its main features.'),
('Creating Your First Project', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'getting_started', 'Step-by-step guide to creating and setting up your first project.'),
('Managing User Permissions', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'basic_operations', 'Learn how to manage user roles and permissions effectively.'),
('Advanced Reporting Features', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'advanced_features', 'Explore the advanced reporting and analytics capabilities.');