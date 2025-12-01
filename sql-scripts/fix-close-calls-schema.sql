-- Unified script to fix Close Calls schema
-- Run this script to ensure all columns and policies are present

-- 1. Create table if it doesn't exist
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

-- 2. Add project_id (BIGINT to match projects table)
-- We check if column exists first to avoid errors
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'close_calls' AND column_name = 'project_id') THEN
        ALTER TABLE close_calls ADD COLUMN project_id BIGINT REFERENCES projects(id);
    END IF;
END $$;

-- 3. Add project_name (TEXT for manual entry)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'close_calls' AND column_name = 'project_name') THEN
        ALTER TABLE close_calls ADD COLUMN project_name TEXT;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE close_calls ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Drop first to ensure latest definition)
DROP POLICY IF EXISTS "Everyone can view close calls" ON close_calls;
CREATE POLICY "Everyone can view close calls" ON close_calls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert close calls" ON close_calls;
CREATE POLICY "Authenticated users can insert close calls" ON close_calls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own close calls" ON close_calls;
CREATE POLICY "Users can update own close calls" ON close_calls FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin')));

DROP POLICY IF EXISTS "Users can delete own close calls" ON close_calls;
CREATE POLICY "Users can delete own close calls" ON close_calls FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin')));

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_close_calls_project_id ON close_calls(project_id);

-- 7. Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('close-call-photos', 'close-call-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage Policies
DROP POLICY IF EXISTS "Close Call Photos Public Access" ON storage.objects;
CREATE POLICY "Close Call Photos Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'close-call-photos' );

DROP POLICY IF EXISTS "Close Call Photos Upload Access" ON storage.objects;
CREATE POLICY "Close Call Photos Upload Access" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'close-call-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Close Call Photos Update Access" ON storage.objects;
CREATE POLICY "Close Call Photos Update Access" ON storage.objects FOR UPDATE USING ( bucket_id = 'close-call-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Close Call Photos Delete Access" ON storage.objects;
CREATE POLICY "Close Call Photos Delete Access" ON storage.objects FOR DELETE USING ( bucket_id = 'close-call-photos' AND auth.role() = 'authenticated' );
