ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS calibration_certificate_url TEXT;
