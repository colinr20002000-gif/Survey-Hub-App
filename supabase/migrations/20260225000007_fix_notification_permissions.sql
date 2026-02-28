-- Allow managers to insert notifications for their staff
-- This is required so the Approvals page can trigger alerts.

-- 1. Enable RLS on notifications (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Managers can insert notifications for their team" ON notifications;

-- 3. Create a policy that allows a manager to insert a notification for a user they manage
CREATE POLICY "Managers can insert notifications for their team" 
ON notifications 
FOR INSERT 
WITH CHECK (
    -- Allow users to insert for themselves (e.g. self-alerts)
    auth.uid() = user_id 
    OR 
    -- Allow managers to insert for users they manage
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = notifications.user_id 
        AND users.line_manager_id = auth.uid()
    )
);

-- 4. Ensure users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Refresh cache
NOTIFY pgrst, 'reload schema';
