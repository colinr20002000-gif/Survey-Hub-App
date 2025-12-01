-- Create table for Check & Adjust logs
CREATE TABLE IF NOT EXISTS check_adjust_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ha_collimation TEXT,
    va_collimation TEXT,
    trunnion_axis_tilt TEXT,
    auto_lock_collimation_hz TEXT,
    auto_lock_collimation_vt TEXT,
    tribrach_circular_level BOOLEAN DEFAULT false,
    prism_precise_level BOOLEAN DEFAULT false,
    prism_optical_plummet BOOLEAN DEFAULT false,
    compensator BOOLEAN DEFAULT false,
    status VARCHAR(50) CHECK (status IN ('Pass', 'Fail')),
    evidence_url TEXT,
    next_due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE check_adjust_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON check_adjust_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON check_adjust_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for creators and admins" ON check_adjust_logs
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND privilege IN ('Admin', 'Super Admin'))
    );

-- Create storage bucket for evidence if it doesn't exist (this usually needs to be done in Supabase dashboard, but including for reference)
-- insert into storage.buckets (id, name) values ('evidence', 'evidence');
