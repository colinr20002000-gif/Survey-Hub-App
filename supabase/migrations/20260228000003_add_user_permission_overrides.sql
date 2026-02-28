-- =========================================================
-- ADD USER PERMISSION OVERRIDES
-- Allows specific users to have additional or restricted 
-- permissions regardless of their global privilege level.
-- Supports both real and dummy users.
-- =========================================================

-- 1. Create user_permission_overrides table
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- UUID of either real user or dummy user
    permission_key TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL,
    reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID, -- References users.id
    UNIQUE(user_id, permission_key)
);

-- 2. Add comment for clarity
COMMENT ON TABLE user_permission_overrides IS 'Stores user-specific permission overrides that take precedence over privilege-level permissions. user_id can refer to both public.users and public.dummy_users.';

-- 3. Enable RLS
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Admins can manage all overrides
-- We use a looser check here to avoid circular dependencies if possible
CREATE POLICY "Admins can manage user permission overrides"
    ON user_permission_overrides
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- Users can view their own overrides
CREATE POLICY "Users can view their own permission overrides"
    ON user_permission_overrides
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_key ON user_permission_overrides(permission_key);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_permission_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS trigger_update_user_permission_overrides_updated_at ON user_permission_overrides;
CREATE TRIGGER trigger_update_user_permission_overrides_updated_at
    BEFORE UPDATE ON user_permission_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_user_permission_overrides_updated_at();

-- 7. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
