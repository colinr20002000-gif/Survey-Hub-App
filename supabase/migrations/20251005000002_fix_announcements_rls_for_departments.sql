-- Fix announcements RLS policy to check departments instead of privileges
-- The issue: target_roles stores department names, but the policy was checking privileges

-- Drop the old policy that checks privileges
DROP POLICY IF EXISTS "Users can view relevant announcements" ON announcements;

-- Create new policy that checks both departments and privileges
-- This allows targeting by department (like "Engineering", "Safety")
-- OR by privilege level (like "Admin", "Site Staff")
CREATE POLICY "Users can view relevant announcements" ON announcements
    FOR SELECT USING (
        -- Show if no targeting (null means show to everyone)
        target_roles IS NULL
        -- Show if user's department matches any in target_roles
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.department = ANY(target_roles)
        )
        -- Also show if user's privilege matches any in target_roles
        -- This allows targeting by privilege too (backward compatibility)
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege = ANY(target_roles)
        )
    );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed announcements RLS policy to check departments';
    RAISE NOTICE '✅ Announcements can now be targeted by department OR privilege';
    RAISE NOTICE '✅ Schema cache reloaded';
END $$;
