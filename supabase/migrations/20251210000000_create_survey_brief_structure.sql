-- Create Survey Brief modular structure
-- This migration adds a JSONB column for the flexible Survey Brief tab

-- Add new modular column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS survey_brief_items JSONB DEFAULT '[]'::jsonb;

-- Add comments to describe the new column
COMMENT ON COLUMN projects.survey_brief_items IS 'Modular survey brief items array: [{id, type, title, content, url}] where type can be: meeting_times, track_detail, equipment, miscellaneous, photo';
