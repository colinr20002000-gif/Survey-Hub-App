-- Add archived column to on_call_contacts table
ALTER TABLE on_call_contacts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index on archived column for faster queries
CREATE INDEX IF NOT EXISTS idx_on_call_contacts_archived ON on_call_contacts(archived);
