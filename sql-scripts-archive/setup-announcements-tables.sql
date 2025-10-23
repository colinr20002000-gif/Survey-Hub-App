-- Setup announcements and announcement_reads tables
-- Run this in your Supabase SQL editor

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    target_roles TEXT[], -- Array of role names that should see this announcement
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiration
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcement_reads table to track which users have read/dismissed announcements
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dismissed_at TIMESTAMP WITH TIME ZONE, -- NULL means not dismissed, not null means dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per user per announcement
    UNIQUE(announcement_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_target_roles ON announcements USING gin(target_roles);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_read_at ON announcement_reads(read_at);

-- Enable Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
-- Users can read announcements targeted to their role or public announcements
CREATE POLICY "Users can view relevant announcements" ON announcements
    FOR SELECT USING (
        target_roles IS NULL
        OR auth.uid() IN (
            SELECT id FROM users
            WHERE privilege = ANY(target_roles)
        )
    );

-- Only users with editing privileges can create announcements
CREATE POLICY "Authorized users can create announcements" ON announcements
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users
            WHERE privilege IN ('Admin', 'Site Staff', 'Office Staff', 'Project Managers', 'Delivery Surveyors')
        )
    );

-- Users can only edit their own announcements
CREATE POLICY "Users can edit own announcements" ON announcements
    FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own announcements, or admins can delete any announcement
CREATE POLICY "Users can delete own announcements or admins can delete any" ON announcements
    FOR DELETE USING (
        auth.uid() = author_id
        OR auth.uid() IN (
            SELECT id FROM users WHERE privilege = 'Admin'
        )
    );

-- RLS Policies for announcement_reads
-- Users can only see their own read/dismiss records
CREATE POLICY "Users can view own announcement reads" ON announcement_reads
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only create read/dismiss records for themselves
CREATE POLICY "Users can create own announcement reads" ON announcement_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own read/dismiss records
CREATE POLICY "Users can update own announcement reads" ON announcement_reads
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own read/dismiss records
CREATE POLICY "Users can delete own announcement reads" ON announcement_reads
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert sample announcements (optional - remove if you don't want sample data)
INSERT INTO announcements (title, content, category, priority, target_roles, author_id)
SELECT
    'Welcome to the Survey Hub',
    'Welcome to our new Survey Hub application! This system will help streamline our project management and communication. Please explore the features and let us know if you have any feedback.',
    'General',
    'medium',
    NULL, -- Visible to all users
    id
FROM users
WHERE privilege = 'Admin'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, category, priority, target_roles, author_id)
SELECT
    'New Safety Protocols',
    'Updated site safety requirements are now in effect. All field staff must review the new protocols before their next site visit. Please check the safety documentation section for details.',
    'Safety',
    'high',
    ARRAY['Site Staff', 'Delivery Surveyors'],
    id
FROM users
WHERE privilege = 'Admin'
LIMIT 1
ON CONFLICT DO NOTHING;