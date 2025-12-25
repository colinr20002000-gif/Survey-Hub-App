-- Add file_urls column to announcements table to support attachments
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;
