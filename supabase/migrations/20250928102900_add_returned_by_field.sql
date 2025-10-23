-- Add returned_by field to track who returned equipment
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES auth.users(id);

-- Add comment for the new field
COMMENT ON COLUMN equipment_assignments.returned_by IS 'User who returned the equipment';