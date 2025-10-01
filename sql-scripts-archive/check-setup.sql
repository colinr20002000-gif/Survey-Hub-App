-- Check if subscriptions table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'subscriptions';

-- If it exists, check its structure
\d subscriptions;

-- Check if we have any subscriptions
SELECT count(*) as subscription_count FROM subscriptions;

-- Check recent subscriptions
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;