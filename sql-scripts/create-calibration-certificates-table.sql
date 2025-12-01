-- Create table for storing multiple calibration certificates
CREATE TABLE IF NOT EXISTS calibration_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE calibration_certificates ENABLE ROW LEVEL SECURITY;

-- Policies
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view certificates" ON calibration_certificates;
DROP POLICY IF EXISTS "Authenticated users can insert certificates" ON calibration_certificates;
DROP POLICY IF EXISTS "Authenticated users can delete certificates" ON calibration_certificates;

CREATE POLICY "Everyone can view certificates" ON calibration_certificates
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert certificates" ON calibration_certificates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete certificates" ON calibration_certificates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create index
CREATE INDEX IF NOT EXISTS idx_calibration_certificates_equipment_id ON calibration_certificates(equipment_id);

-- Migrate existing data (if any) from equipment table to this new table
-- We'll assume the existing warranty_expiry is the expiry date for the existing url
INSERT INTO calibration_certificates (equipment_id, file_url, expiry_date, created_by)
SELECT 
    id, 
    calibration_certificate_url, 
    COALESCE(warranty_expiry, CURRENT_DATE), -- Fallback if date is missing
    updated_by
FROM equipment 
WHERE calibration_certificate_url IS NOT NULL AND calibration_certificate_url != ''
ON CONFLICT DO NOTHING; -- Basic conflict handling (though UUIDs prevent this mostly)