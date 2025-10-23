-- Allow equipment_id to be nullable to support comment-only entries
ALTER TABLE equipment_calendar
ALTER COLUMN equipment_id DROP NOT NULL;

-- Add a check constraint to ensure at least equipment_id or comment is provided
ALTER TABLE equipment_calendar
ADD CONSTRAINT equipment_or_comment_required
CHECK (equipment_id IS NOT NULL OR (comment IS NOT NULL AND comment <> ''));

COMMENT ON CONSTRAINT equipment_or_comment_required ON equipment_calendar IS 'Ensures at least equipment or a non-empty comment is provided';
