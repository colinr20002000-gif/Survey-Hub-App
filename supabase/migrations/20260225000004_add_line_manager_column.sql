-- Add Line Manager column to users and dummy_users tables
DO $$ 
BEGIN
    -- Add to public.users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='line_manager_id') THEN
        ALTER TABLE public.users ADD COLUMN line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add to public.dummy_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dummy_users' AND column_name='line_manager_id') THEN
        ALTER TABLE public.dummy_users ADD COLUMN line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update the manager_assignments table to be consistent or remove if redundant.
-- Since the user specifically asked for a "column in the user table", 
-- the direct column is preferred.
