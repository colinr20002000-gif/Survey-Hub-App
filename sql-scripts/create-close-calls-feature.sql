-- Create close_calls table
CREATE TABLE IF NOT EXISTS close_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    elr VARCHAR(50),
    mileage VARCHAR(50),
    comments TEXT,
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE close_calls ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view (or maybe restricted? "Resource" section usually implies team visibility)
CREATE POLICY "Everyone can view close calls" ON close_calls
    FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert close calls" ON close_calls
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own (or Admin)
CREATE POLICY "Users can update own close calls" ON close_calls
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin'))
    );

-- Users can delete their own (or Admin)
CREATE POLICY "Users can delete own close calls" ON close_calls
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin'))
    );

-- Storage for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('close-call-photos', 'close-call-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Close Call Photos Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Close Call Photos Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Close Call Photos Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Close Call Photos Delete Access" ON storage.objects;

CREATE POLICY "Close Call Photos Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'close-call-photos' );

CREATE POLICY "Close Call Photos Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'close-call-photos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Close Call Photos Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'close-call-photos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Close Call Photos Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'close-call-photos'
    AND auth.role() = 'authenticated'
);

-- Add Permission for Sidebar/Route (Dynamic Permissions)
INSERT INTO privilege_permissions (privilege_level, permission_key, permission_label, permission_category, is_granted, display_order)
SELECT p_level, 'VIEW_CLOSE_CALLS', 'View Close Calls', 'View Access', CASE WHEN p_level IN ('Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') THEN true ELSE false END, 150
FROM (VALUES ('Viewer'), ('Viewer+'), ('Editor'), ('Editor+'), ('Admin'), ('Super Admin')) AS levels(p_level)
WHERE NOT EXISTS (SELECT 1 FROM privilege_permissions WHERE permission_key = 'VIEW_CLOSE_CALLS' AND privilege_level = p_level);
