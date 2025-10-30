-- Change SMALLINT columns to INTEGER to handle larger values
-- SMALLINT range: -32768 to 32767
-- INTEGER range: -2147483648 to 2147483647

-- This fixes the error: value "240235" is out of range for type smallint
ALTER TABLE afv ALTER COLUMN business_code TYPE INTEGER;
ALTER TABLE afv ALTER COLUMN discipline_code TYPE INTEGER;
ALTER TABLE afv ALTER COLUMN next_sequence_number TYPE INTEGER;
