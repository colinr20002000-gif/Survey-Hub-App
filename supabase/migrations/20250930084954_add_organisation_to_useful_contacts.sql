-- Add organisation column to useful_contacts table
ALTER TABLE useful_contacts ADD COLUMN IF NOT EXISTS organisation TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN useful_contacts.organisation IS 'Organisation name for the contact';