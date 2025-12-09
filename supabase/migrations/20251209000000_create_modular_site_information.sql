-- Create modular site information structure
-- This migration adds JSONB columns for flexible site information

-- Add new modular columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS site_info_sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS site_info_photos JSONB DEFAULT '[]'::jsonb;

-- Add comments to describe the new columns
COMMENT ON COLUMN projects.site_info_sections IS 'Modular sections array: [{id, type, order, data}] where type can be: site_location, chainage_reference, site_mileage, track_information';
COMMENT ON COLUMN projects.site_info_photos IS 'Photo boxes array: [{id, title, url, order}]';

-- Drop old site information columns that are being replaced by the modular structure
ALTER TABLE projects
DROP COLUMN IF EXISTS postcode,
DROP COLUMN IF EXISTS elr,
DROP COLUMN IF EXISTS chainage_datum,
DROP COLUMN IF EXISTS start_mileage,
DROP COLUMN IF EXISTS end_mileage,
DROP COLUMN IF EXISTS design_track,
DROP COLUMN IF EXISTS reference_track,
DROP COLUMN IF EXISTS section_appendix_url,
DROP COLUMN IF EXISTS routeview_url,
DROP COLUMN IF EXISTS signal_diagram_url,
DROP COLUMN IF EXISTS google_maps_link,
DROP COLUMN IF EXISTS what3words_link,
DROP COLUMN IF EXISTS tracks;
