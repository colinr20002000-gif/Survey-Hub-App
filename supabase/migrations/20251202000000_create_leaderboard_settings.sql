-- Create a table to store global leaderboard settings
CREATE TABLE IF NOT EXISTS public.leaderboard_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.leaderboard_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow everyone to read settings
DROP POLICY IF EXISTS "Allow public read of leaderboard settings" ON public.leaderboard_settings;
CREATE POLICY "Allow public read of leaderboard settings"
ON public.leaderboard_settings FOR SELECT
USING (true);

-- Allow authenticated users to update settings
DROP POLICY IF EXISTS "Allow authenticated update of leaderboard settings" ON public.leaderboard_settings;
CREATE POLICY "Allow authenticated update of leaderboard settings"
ON public.leaderboard_settings FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert settings
DROP POLICY IF EXISTS "Allow authenticated insert of leaderboard settings" ON public.leaderboard_settings;
CREATE POLICY "Allow authenticated insert of leaderboard settings"
ON public.leaderboard_settings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Initial data (Default settings)
INSERT INTO public.leaderboard_settings (key, value)
VALUES (
    'global_filters',
    jsonb_build_object(
        'start_date', (CURRENT_DATE - INTERVAL '1 month'),
        'end_date', CURRENT_DATE,
        'selected_departments', '[]'::jsonb
    )
)
ON CONFLICT (key) DO NOTHING;
