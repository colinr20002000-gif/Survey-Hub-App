-- Update check_adjust_logs table to support multiple photos
ALTER TABLE check_adjust_logs 
ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing evidence_url data to evidence_urls for backward compatibility
UPDATE check_adjust_logs 
SET evidence_urls = jsonb_build_array(evidence_url) 
WHERE evidence_url IS NOT NULL AND (evidence_urls IS NULL OR jsonb_array_length(evidence_urls) = 0);
