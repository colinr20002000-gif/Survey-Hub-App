-- Update notification RLS to explicitly allow self-notifications and manager-to-staff notifications
-- This ensures that when a user is their own manager, they still receive alerts.

-- 1. Drop existing insert policies
DROP POLICY IF EXISTS "Managers can insert notifications for their team" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;

-- 2. Create more explicit policy
CREATE POLICY "Notifications insert policy" 
ON notifications 
FOR INSERT 
WITH CHECK (
    -- Case A: User is creating a notification for themselves
    auth.uid() = user_id 
    OR 
    -- Case B: Manager is creating a notification for someone they manage
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = notifications.user_id 
        AND users.line_manager_id = auth.uid()
    )
);

-- 3. Also ensure the select policy is solid
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Refresh cache
NOTIFY pgrst, 'reload schema';
