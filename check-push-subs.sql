-- Check push subscriptions and user departments
SELECT
    u.name,
    u.email,
    u.department,
    u.privilege,
    ps.is_active,
    ps.created_at as subscription_date
FROM push_subscriptions ps
JOIN users u ON ps.user_id = u.id
WHERE ps.is_active = true
ORDER BY u.department, u.name;

-- Also check which users should match "Site Team"
SELECT
    id,
    name,
    email,
    department,
    privilege
FROM users
WHERE department = 'Site Team' OR privilege = 'Site Team'
ORDER BY name;
