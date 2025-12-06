-- Update media_posts table to support multiple photos
ALTER TABLE media_posts 
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing photo_url data to media_urls for backward compatibility
UPDATE media_posts 
SET media_urls = jsonb_build_array(photo_url) 
WHERE photo_url IS NOT NULL AND (media_urls IS NULL OR jsonb_array_length(media_urls) = 0);
