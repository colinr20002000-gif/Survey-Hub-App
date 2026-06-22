-- Migration: Create calendar_shares table and get_shared_calendar_data RPC
-- Purpose: Support public read-only calendar access for subcontractors
-- Date: 2026-06-22

-- 1. Create calendar_shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_shares_token ON calendar_shares(token);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_active_expiry ON calendar_shares(is_active, expires_at);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Only authenticated users with privilege Editor/Editor+/Admin/Super Admin can manage calendar shares
CREATE POLICY "Authorized users can manage calendar shares"
    ON calendar_shares
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin')
        )
    );

-- 4. Create RPC Function to fetch read-only calendar data securely via token
CREATE OR REPLACE FUNCTION get_shared_calendar_data(
    token_val UUID,
    start_date DATE,
    end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_record RECORD;
    result JSONB;
BEGIN
    -- Verify the token is active and not expired
    SELECT * INTO share_record 
    FROM calendar_shares 
    WHERE token = token_val 
      AND is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > NOW());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid, inactive, or expired calendar share link.';
    END IF;

    -- Fetch and construct the JSON structure
    SELECT jsonb_build_object(
        'allocations', COALESCE((
            SELECT jsonb_agg(sub) FROM (
                SELECT id::text, user_id, allocation_date, assignment_type, project_id, project_number, project_name, client, task, shift, time, comment, leave_type, created_at
                FROM resource_allocations
                WHERE allocation_date >= start_date AND allocation_date <= end_date
                UNION ALL
                SELECT id::text, user_id, allocation_date, assignment_type, project_id, project_number, project_name, client, task, shift, time, comment, leave_type, created_at
                FROM dummy_resource_allocations
                WHERE allocation_date >= start_date AND allocation_date <= end_date
            ) sub
        ), '[]'::jsonb),
        'users', COALESCE((
            SELECT jsonb_agg(sub) FROM (
                SELECT id, name, username, email, privilege::text, team_role, department, organisation, avatar, mobile_number, pts_number, available_saturday, available_sunday, hire_date, termination_date, employment_status, show_in_resource_calendar, FALSE as "isDummy"
                FROM users
                WHERE deleted_at IS NULL
                UNION ALL
                SELECT id, name, username, email, 'Dummy'::text as privilege, team_role, department, organisation, avatar, mobile_number, pts_number, available_saturday, available_sunday, hire_date, termination_date, employment_status, show_in_resource_calendar, TRUE as "isDummy"
                FROM dummy_users
                WHERE is_active = TRUE AND deleted_at IS NULL
            ) sub
        ), '[]'::jsonb),
        'projects', COALESCE((
            SELECT jsonb_agg(p) FROM (
                SELECT id, project_number, project_name, client, "startDate", "targetDate"
                FROM projects
                WHERE archived = FALSE
            ) p
        ), '[]'::jsonb),
        'colours', COALESCE((
            SELECT jsonb_agg(c) FROM (
                SELECT id, category_type, category_value, colour, calendar_type
                FROM calendar_colours
                WHERE calendar_type = 'resource'
            ) c
        ), '[]'::jsonb),
        'departments', COALESCE((
            SELECT jsonb_agg(d.display_text) FROM (
                SELECT di.display_text
                FROM dropdown_items di
                INNER JOIN dropdown_categories dc ON di.category_id = dc.id
                WHERE (dc.name = 'department' OR dc.name = 'Department') AND di.is_active = TRUE
                ORDER BY di.sort_order
            ) d
        ), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant EXECUTE permission to all roles, since we validate internally using token
GRANT EXECUTE ON FUNCTION get_shared_calendar_data(UUID, DATE, DATE) TO public, anon, authenticated;
