-- Create photo albums table
CREATE TABLE IF NOT EXISTS photo_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_albums
-- Everyone can view albums
CREATE POLICY "Everyone can view photo albums"
    ON photo_albums
    FOR SELECT
    USING (true);

-- Only Editor or higher can create albums
CREATE POLICY "Editor or higher can create photo albums"
    ON photo_albums
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- Only Editor or higher can update albums
CREATE POLICY "Editor or higher can update photo albums"
    ON photo_albums
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- Only Editor or higher can delete albums
CREATE POLICY "Editor or higher can delete photo albums"
    ON photo_albums
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- RLS Policies for photos
-- Everyone can view photos
CREATE POLICY "Everyone can view photos"
    ON photos
    FOR SELECT
    USING (true);

-- Only Editor or higher can create photos
CREATE POLICY "Editor or higher can create photos"
    ON photos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- Only Editor or higher can update photos
CREATE POLICY "Editor or higher can update photos"
    ON photos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- Only Editor or higher can delete photos
CREATE POLICY "Editor or higher can delete photos"
    ON photos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_albums_created_at ON photo_albums(created_at DESC);

-- Add updated_at trigger for photo_albums
CREATE OR REPLACE FUNCTION update_photo_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_albums_updated_at_trigger
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_albums_updated_at();

-- Add updated_at trigger for photos
CREATE OR REPLACE FUNCTION update_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_updated_at_trigger
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_photos_updated_at();
