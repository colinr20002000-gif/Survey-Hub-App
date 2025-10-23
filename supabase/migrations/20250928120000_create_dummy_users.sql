-- Create dummy_users table for non-login users that appear in resource calendars and equipment assignments
CREATE TABLE IF NOT EXISTS dummy_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(10) DEFAULT 'DU',
    team_role VARCHAR(100),
    department VARCHAR(100),
    organisation VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create updated_at trigger for dummy_users
CREATE OR REPLACE FUNCTION update_dummy_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dummy_users_updated_at ON dummy_users;
CREATE TRIGGER update_dummy_users_updated_at
    BEFORE UPDATE ON dummy_users
    FOR EACH ROW
    EXECUTE FUNCTION update_dummy_users_updated_at();

-- Add RLS policies for dummy_users
ALTER TABLE dummy_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view dummy users" ON dummy_users;
DROP POLICY IF EXISTS "Only admins can insert dummy users" ON dummy_users;
DROP POLICY IF EXISTS "Only admins can update dummy users" ON dummy_users;
DROP POLICY IF EXISTS "Only admins can delete dummy users" ON dummy_users;

-- Policy: Anyone authenticated can read dummy users
CREATE POLICY "Anyone can view dummy users" ON dummy_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only admins can insert dummy users
CREATE POLICY "Only admins can insert dummy users" ON dummy_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );

-- Policy: Only admins can update dummy users
CREATE POLICY "Only admins can update dummy users" ON dummy_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );

-- Policy: Only admins can delete dummy users
CREATE POLICY "Only admins can delete dummy users" ON dummy_users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = 'Admin'
        )
    );

-- Add some example dummy users
INSERT INTO dummy_users (name, username, email, avatar, team_role, department, organisation) VALUES
('Project Manager Alpha', 'pm_alpha', 'pm.alpha@dummy.local', 'PMA', 'Project Team', 'Engineering', 'Main Office'),
('Site Supervisor Beta', 'site_beta', 'site.beta@dummy.local', 'SSB', 'Site Team', 'Operations', 'Field Office'),
('Design Lead Gamma', 'design_gamma', 'design.gamma@dummy.local', 'DLG', 'Design Team', 'Engineering', 'Main Office')
ON CONFLICT (username) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dummy_users_active ON dummy_users(is_active);
CREATE INDEX IF NOT EXISTS idx_dummy_users_team_role ON dummy_users(team_role);
CREATE INDEX IF NOT EXISTS idx_dummy_users_department ON dummy_users(department);