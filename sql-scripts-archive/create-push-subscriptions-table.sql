-- Create push_subscriptions table with proper RLS policies
-- Run this SQL in the Supabase SQL editor

-- First, ensure the table exists with basic structure
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    fcm_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    device_info JSONB
);

-- Add new columns if they don't exist
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have last_used_at if NULL
UPDATE push_subscriptions
SET last_used_at = COALESCE(last_used_at, updated_at, created_at, NOW())
WHERE last_used_at IS NULL;

-- Create unique constraint to prevent duplicate tokens per user per device
-- This allows the same user to have multiple devices, but only one active subscription per device
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_device ON push_subscriptions(user_id, fcm_token);

-- Create index for device fingerprint to quickly find existing device subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device ON push_subscriptions(device_fingerprint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role can do everything" ON push_subscriptions;

-- Create simple policy for users to manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Allow service role (for server functions) to do everything
CREATE POLICY "Service role can do everything" ON push_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);

-- Create a function to clean up old inactive subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS void AS $$
BEGIN
    -- Delete inactive subscriptions older than 30 days
    DELETE FROM push_subscriptions
    WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '30 days';

    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old inactive push subscriptions';
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle user login subscription management
CREATE OR REPLACE FUNCTION manage_user_push_subscription(
    p_user_id UUID,
    p_user_email TEXT,
    p_fcm_token TEXT,
    p_device_fingerprint TEXT,
    p_device_info JSONB
)
RETURNS TABLE (
    subscription_id UUID,
    action_taken TEXT
) AS $$
DECLARE
    existing_record_id UUID;
    result_action TEXT;
BEGIN
    -- Deactivate subscriptions for this device from other users
    UPDATE push_subscriptions
    SET is_active = false, updated_at = NOW()
    WHERE device_fingerprint = p_device_fingerprint
    AND user_id != p_user_id;

    -- Check for existing subscription for this user on this specific device
    SELECT push_subscriptions.id INTO existing_record_id
    FROM push_subscriptions
    WHERE user_id = p_user_id
    AND device_fingerprint = p_device_fingerprint
    ORDER BY updated_at DESC
    LIMIT 1;

    IF existing_record_id IS NOT NULL THEN
        -- Update existing subscription
        UPDATE push_subscriptions
        SET fcm_token = p_fcm_token,
            user_email = p_user_email,
            is_active = true,
            device_fingerprint = p_device_fingerprint,
            device_info = p_device_info,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE push_subscriptions.id = existing_record_id;

        result_action := 'updated';
    ELSE
        -- Create new subscription and get the returned ID
        INSERT INTO push_subscriptions (
            user_id, user_email, fcm_token, device_fingerprint,
            device_info, is_active, last_used_at
        ) VALUES (
            p_user_id, p_user_email, p_fcm_token, p_device_fingerprint,
            p_device_info, true, NOW()
        ) RETURNING id INTO existing_record_id;

        result_action := 'created';
    END IF;

    -- Return the result with properly named columns
    RETURN QUERY SELECT existing_record_id AS subscription_id, result_action AS action_taken;
END;
$$ LANGUAGE plpgsql;

-- Check the result
SELECT 'push_subscriptions table and functions created successfully' as result;