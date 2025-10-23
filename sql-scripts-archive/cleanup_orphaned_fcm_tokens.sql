-- Clean up orphaned FCM tokens where users have been inactive for more than 24 hours
-- This helps with the case where users logged out but FCM tokens weren't properly deactivated

-- Option 1: Deactivate tokens for users who haven't been active in 24+ hours
-- (This requires checking auth.sessions or last_sign_in_at)
UPDATE public.push_subscriptions
SET is_active = false
WHERE is_active = true
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE last_sign_in_at < NOW() - INTERVAL '24 hours'
       OR last_sign_in_at IS NULL
  );

-- Option 2: More aggressive cleanup - deactivate tokens older than 7 days
-- UPDATE public.push_subscriptions
-- SET is_active = false
-- WHERE is_active = true
--   AND updated_at < NOW() - INTERVAL '7 days';

-- Option 3: Delete very old inactive tokens (30+ days) to keep table clean
DELETE FROM public.push_subscriptions
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';

-- Show summary of cleanup
SELECT
  COUNT(*) FILTER (WHERE is_active = true) as active_subscriptions,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_subscriptions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT user_email) as unique_emails
FROM public.push_subscriptions;