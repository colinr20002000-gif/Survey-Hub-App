-- Simple setup for video_tutorials table
-- Run this in your Supabase SQL Editor

-- Create the video_tutorials table
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

-- Enable Row Level Security
ALTER TABLE video_tutorials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read videos
CREATE POLICY "Enable read access for authenticated users" ON video_tutorials
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin users to manage videos
CREATE POLICY "Enable all access for admin users" ON video_tutorials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.jwt() ->> 'sub'
    AND users.privilege IN ('Admin', 'Super Admin')
  )
);

-- Create indexes
CREATE INDEX idx_video_tutorials_category ON video_tutorials(category_value);
CREATE INDEX idx_video_tutorials_active ON video_tutorials(is_active);

-- Create video_tutorials category if it doesn't exist
INSERT INTO dropdown_categories (name, description)
SELECT 'video_tutorials', 'Categories for video tutorials'
WHERE NOT EXISTS (
    SELECT 1 FROM dropdown_categories WHERE name = 'video_tutorials'
);

-- Add some sample categories
DO $$
DECLARE
    category_id_var bigint;
BEGIN
    SELECT id INTO category_id_var FROM dropdown_categories WHERE name = 'video_tutorials';

    IF category_id_var IS NOT NULL THEN
        -- Insert sample categories
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
    END IF;
END $$;