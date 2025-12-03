-- Create a table to store global leaderboard settings
CREATE TABLE IF NOT EXISTS leaderboard_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE leaderboard_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Allow public read of leaderboard settings"
ON leaderboard_settings FOR SELECT
USING (true);

-- Allow authenticated users to update settings (or restrict to admins if preferred, but user said 'user to determine')
-- Assuming 'user' implies authorized users.
CREATE POLICY "Allow authenticated update of leaderboard settings"
ON leaderboard_settings FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow insert for initial setup (or use a seed script)
CREATE POLICY "Allow authenticated insert of leaderboard settings"
ON leaderboard_settings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Insert default settings if not exists
INSERT INTO leaderboard_settings (key, value)
VALUES (
    'global_filters',
    jsonb_build_object(
        'start_date', (CURRENT_DATE - INTERVAL '1 month'),
        'end_date', CURRENT_DATE,
        'selected_departments', '[]'::jsonb
    )
)
ON CONFLICT (key) DO NOTHING;
