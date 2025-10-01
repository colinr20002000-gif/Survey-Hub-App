-- Add website column to useful_contacts table
ALTER TABLE useful_contacts ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN useful_contacts.website IS 'Website URL for the contact';