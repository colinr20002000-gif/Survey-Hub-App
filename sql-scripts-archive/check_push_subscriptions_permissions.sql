-- Check if RLS is enabled on push_subscriptions table
SELECT schemaname, tablename, rowsecurity, hasrls
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'push_subscriptions';

-- Check existing RLS policies for push_subscriptions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'push_subscriptions';

-- Check table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'push_subscriptions';

-- If RLS is enabled but no policies exist, you might need to add these:
--
-- -- Allow authenticated users to insert their own push subscriptions
-- CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
--
-- -- Allow authenticated users to select their own push subscriptions
-- CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
--   FOR SELECT USING (auth.uid() = user_id);
--
-- -- Allow authenticated users to update their own push subscriptions
-- CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
--   FOR UPDATE USING (auth.uid() = user_id);
--
-- -- Allow authenticated users to delete their own push subscriptions
-- CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
--   FOR DELETE USING (auth.uid() = user_id);