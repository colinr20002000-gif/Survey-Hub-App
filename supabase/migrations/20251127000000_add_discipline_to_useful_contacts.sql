-- Add discipline column to useful_contacts table for grouping contacts
ALTER TABLE useful_contacts ADD COLUMN IF NOT EXISTS discipline TEXT;

-- Add index for faster discipline searches and grouping
CREATE INDEX IF NOT EXISTS idx_useful_contacts_discipline ON useful_contacts(discipline);

-- Add comment to describe the column
COMMENT ON COLUMN useful_contacts.discipline IS 'Discipline/category for grouping contacts';
