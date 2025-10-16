-- Check ALL push subscriptions (active and inactive)
SELECT
    ps.id,
    u.name,
    u.email,
    u.department,
    ps.is_active,
    ps.last_used_at,
    ps.device_info->>'platform' as platform,
    ps.device_info->>'browserName' as browser,
    LEFT(ps.fcm_token, 30) || '...' as token_preview
FROM push_subscriptions ps
JOIN users u ON ps.user_id = u.id
ORDER BY ps.is_active DESC, ps.last_used_at DESC;

-- Count active vs inactive
SELECT
    is_active,
    COUNT(*) as count
FROM push_subscriptions
GROUP BY is_active;

-- Check which users should have subscriptions but don't
SELECT
    u.id,
    u.name,
    u.email,
    u.department,
    u.privilege,
    CASE WHEN ps.id IS NULL THEN 'NO SUBSCRIPTION' ELSE 'HAS SUBSCRIPTION' END as subscription_status
FROM users u
LEFT JOIN push_subscriptions ps ON u.id = ps.user_id AND ps.is_active = true
WHERE u.email IN ('colin.rogers@inorail.co.uk', 'jay.kinney@inorail.co.uk')
ORDER BY u.name;
