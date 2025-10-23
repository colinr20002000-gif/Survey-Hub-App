-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
-- Everyone can view photos
CREATE POLICY "Everyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Editor or higher can upload photos
CREATE POLICY "Editor or higher can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'photos' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
    )
);

-- Editor or higher can update photos
CREATE POLICY "Editor or higher can update photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'photos' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
    )
);

-- Editor or higher can delete photos
CREATE POLICY "Editor or higher can delete photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'photos' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Project Managers', 'Site Managers', 'Delivery Managers', 'Admin')
    )
);
