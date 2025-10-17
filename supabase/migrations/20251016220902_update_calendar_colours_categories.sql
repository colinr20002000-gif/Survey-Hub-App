-- Update calendar_colours table to use shift and leave instead of status and discipline
ALTER TABLE calendar_colours
DROP CONSTRAINT IF EXISTS calendar_colours_category_type_check;

ALTER TABLE calendar_colours
ADD CONSTRAINT calendar_colours_category_type_check
CHECK (category_type IN ('shift', 'leave'));

-- Update comments
COMMENT ON COLUMN calendar_colours.category_type IS 'Type of category: shift or leave';
