-- Unified script to setup Media feature (mirrored from Close Calls)

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    elr VARCHAR(50),
    mileage VARCHAR(50),
    comments TEXT,
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    project_id BIGINT REFERENCES projects(id),
    project_name TEXT,
    client VARCHAR(255),
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE media_posts ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Drop first to ensure latest definition)
DROP POLICY IF EXISTS "Everyone can view media posts" ON media_posts;
CREATE POLICY "Everyone can view media posts" ON media_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert media posts" ON media_posts;
CREATE POLICY "Authenticated users can insert media posts" ON media_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own media posts" ON media_posts;
CREATE POLICY "Users can update own media posts" ON media_posts FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin')));

DROP POLICY IF EXISTS "Users can delete own media posts" ON media_posts;
CREATE POLICY "Users can delete own media posts" ON media_posts FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin')));

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_media_posts_project_id ON media_posts(project_id);

-- 5. Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-photos', 'media-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies
DROP POLICY IF EXISTS "Media Photos Public Access" ON storage.objects;
CREATE POLICY "Media Photos Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'media-photos' );

DROP POLICY IF EXISTS "Media Photos Upload Access" ON storage.objects;
CREATE POLICY "Media Photos Upload Access" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'media-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Media Photos Update Access" ON storage.objects;
CREATE POLICY "Media Photos Update Access" ON storage.objects FOR UPDATE USING ( bucket_id = 'media-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Media Photos Delete Access" ON storage.objects;
CREATE POLICY "Media Photos Delete Access" ON storage.objects FOR DELETE USING ( bucket_id = 'media-photos' AND auth.role() = 'authenticated' );

-- 7. Permissions
-- VIEW_MEDIA
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_MEDIA', 'View Media', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 160
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;

-- ADD_MEDIA (Category: Resource)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'ADD_MEDIA', 'Add Media Post', 'Resource', 
    CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    161
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;

-- EXPORT_MEDIA (Category: Resource)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'EXPORT_MEDIA', 'Export Media Posts', 'Resource', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    162
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;

-- MANAGE_MEDIA (Category: Resource)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'MANAGE_MEDIA', 'Manage Media (Edit/Delete)', 'Resource', 
    CASE WHEN p_level IN ('Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 
    163
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
ON CONFLICT (permission_key, privilege_level) DO UPDATE 
SET permission_label = EXCLUDED.permission_label, permission_category = EXCLUDED.permission_category, display_order = EXCLUDED.display_order;
