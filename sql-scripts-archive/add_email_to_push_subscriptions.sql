-- Add email column to push_subscriptions table for easier identification
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS user_email text;

-- Add an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email
ON public.push_subscriptions USING btree (user_email)
TABLESPACE pg_default;

-- Update existing records to populate email from auth.users
-- Note: This is optional and only works if you want to backfill existing data
UPDATE public.push_subscriptions
SET user_email = auth.users.email
FROM auth.users
WHERE push_subscriptions.user_id = auth.users.id
AND push_subscriptions.user_email IS NULL;