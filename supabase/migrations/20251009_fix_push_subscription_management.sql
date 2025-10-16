-- Fix push subscription management to handle multiple users on same device robustly
-- This addresses 409 conflicts and ensures proper token management

-- Drop and recreate the function with improved logic
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
    -- STEP 1: Deactivate ALL subscriptions for this FCM token from OTHER users
    -- This handles multiple users on the same device
    UPDATE push_subscriptions
    SET is_active = false, updated_at = NOW()
    WHERE fcm_token = p_fcm_token
    AND user_id != p_user_id
    AND is_active = true;

    -- STEP 2: Deactivate subscriptions for this device fingerprint from OTHER users
    -- This handles cases where device fingerprint changes but it's the same device
    UPDATE push_subscriptions
    SET is_active = false, updated_at = NOW()
    WHERE device_fingerprint = p_device_fingerprint
    AND user_id != p_user_id
    AND is_active = true;

    -- STEP 3: Check for existing subscription for this user
    -- Try to find by fcm_token first (most reliable), then by device_fingerprint
    SELECT id INTO existing_record_id
    FROM push_subscriptions
    WHERE user_id = p_user_id
    AND (fcm_token = p_fcm_token OR device_fingerprint = p_device_fingerprint)
    ORDER BY
        CASE WHEN fcm_token = p_fcm_token THEN 0 ELSE 1 END,  -- Prefer fcm_token match
        updated_at DESC
    LIMIT 1;

    IF existing_record_id IS NOT NULL THEN
        -- STEP 4A: Update existing subscription
        UPDATE push_subscriptions
        SET fcm_token = p_fcm_token,
            user_email = p_user_email,
            is_active = true,
            device_fingerprint = p_device_fingerprint,
            device_info = p_device_info,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = existing_record_id;

        result_action := 'updated_existing';
    ELSE
        -- STEP 4B: Create new subscription
        -- This should only happen for brand new devices
        INSERT INTO push_subscriptions (
            user_id, user_email, fcm_token, device_fingerprint,
            device_info, is_active, last_used_at
        ) VALUES (
            p_user_id, p_user_email, p_fcm_token, p_device_fingerprint,
            p_device_info, true, NOW()
        )
        ON CONFLICT (user_id, fcm_token) DO UPDATE SET
            -- If somehow there's a conflict, update the existing record
            user_email = EXCLUDED.user_email,
            is_active = true,
            device_fingerprint = EXCLUDED.device_fingerprint,
            device_info = EXCLUDED.device_info,
            last_used_at = NOW(),
            updated_at = NOW()
        RETURNING id INTO existing_record_id;

        result_action := 'created_new';
    END IF;

    -- STEP 5: Clean up old inactive subscriptions for this user (keep database tidy)
    -- Delete inactive subscriptions older than 7 days
    DELETE FROM push_subscriptions
    WHERE user_id = p_user_id
    AND is_active = false
    AND updated_at < NOW() - INTERVAL '7 days';

    -- Return the result
    RETURN QUERY SELECT existing_record_id AS subscription_id, result_action AS action_taken;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION manage_user_push_subscription(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION manage_user_push_subscription IS 'Manages push notification subscriptions, handling multiple users on same device and preventing conflicts';
