-- Add site information columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS elr TEXT,
ADD COLUMN IF NOT EXISTS chainage_datum TEXT,
ADD COLUMN IF NOT EXISTS start_mileage TEXT,
ADD COLUMN IF NOT EXISTS end_mileage TEXT,
ADD COLUMN IF NOT EXISTS design_track TEXT,
ADD COLUMN IF NOT EXISTS reference_track TEXT,
ADD COLUMN IF NOT EXISTS section_appendix_url TEXT,
ADD COLUMN IF NOT EXISTS routeview_url TEXT,
ADD COLUMN IF NOT EXISTS signal_diagram_url TEXT;

-- Add comments to describe the columns
COMMENT ON COLUMN projects.postcode IS 'Site postcode';
COMMENT ON COLUMN projects.elr IS 'Engineer''s Line Reference';
COMMENT ON COLUMN projects.chainage_datum IS 'Chainage datum reference';
COMMENT ON COLUMN projects.start_mileage IS 'Starting mileage of the site';
COMMENT ON COLUMN projects.end_mileage IS 'Ending mileage of the site';
COMMENT ON COLUMN projects.design_track IS 'Design track reference';
COMMENT ON COLUMN projects.reference_track IS 'Reference track';
COMMENT ON COLUMN projects.section_appendix_url IS 'URL to section appendix photo';
COMMENT ON COLUMN projects.routeview_url IS 'URL to routeview photo';
COMMENT ON COLUMN projects.signal_diagram_url IS 'URL to signal diagram photo';
