-- Add Calendar Visibility column to users and dummy_users tables
DO $$ 
BEGIN
    -- Add to public.users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='show_in_resource_calendar') THEN
        ALTER TABLE public.users ADD COLUMN show_in_resource_calendar BOOLEAN DEFAULT true;
    END IF;

    -- Add to public.dummy_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dummy_users' AND column_name='show_in_resource_calendar') THEN
        ALTER TABLE public.dummy_users ADD COLUMN show_in_resource_calendar BOOLEAN DEFAULT true;
    END IF;
END $$;
