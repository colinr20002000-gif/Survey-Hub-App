-- Update calendar_colours table to allow equipment category type
ALTER TABLE calendar_colours
DROP CONSTRAINT IF EXISTS calendar_colours_category_type_check;

ALTER TABLE calendar_colours
ADD CONSTRAINT calendar_colours_category_type_check
CHECK (category_type IN ('shift', 'leave', 'equipment'));

-- Update comments
COMMENT ON COLUMN calendar_colours.category_type IS 'Type of category: shift, leave, or equipment';
