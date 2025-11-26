-- Create subcontractors table for managing subcontractor contacts
CREATE TABLE IF NOT EXISTS public.subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    mobile_number TEXT,
    team_role TEXT,
    department TEXT,
    organisation TEXT,
    competencies TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

-- Everyone can view subcontractors
CREATE POLICY "Users can view subcontractors"
ON public.subcontractors
FOR SELECT
USING (true);

-- Editors and above can insert subcontractors
CREATE POLICY "Users with Editor or higher can insert subcontractors"
ON public.subcontractors
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
    )
);

-- Editors and above can update subcontractors
CREATE POLICY "Users with Editor or higher can update subcontractors"
ON public.subcontractors
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
    )
);

-- Editors and above can delete subcontractors
CREATE POLICY "Users with Editor or higher can delete subcontractors"
ON public.subcontractors
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
    )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcontractors_updated_at
    BEFORE UPDATE ON public.subcontractors
    FOR EACH ROW
    EXECUTE FUNCTION update_subcontractors_updated_at();
