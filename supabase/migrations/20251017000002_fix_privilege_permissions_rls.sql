-- Fix RLS policies for privilege_permissions table
-- The UPDATE policy needs both USING and WITH CHECK clauses

-- Drop existing update policy
DROP POLICY IF EXISTS "Only admins can update privilege permissions" ON privilege_permissions;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Only admins can update privilege permissions"
    ON privilege_permissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );
