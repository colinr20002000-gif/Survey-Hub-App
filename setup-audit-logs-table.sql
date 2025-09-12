-- Create audit_logs table for tracking system activities
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'SYSTEM_EVENT')),
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
-- Admins can see all audit logs
CREATE POLICY "admins_view_audit_logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.privilege = 'Admin'
        )
    );

-- Office Staff, Delivery Surveyors, and Project Managers can view audit logs
CREATE POLICY "privileged_users_view_audit_logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.privilege IN ('Office Staff', 'Delivery Surveyors', 'Project Managers')
        )
    );

-- System can insert audit logs (for automated logging)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO anon, authenticated;
GRANT INSERT ON audit_logs TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO anon, authenticated;

-- Insert some sample audit logs to replace mock data
INSERT INTO audit_logs (user_id, action, entity, entity_id, timestamp, details) VALUES
    (1, 'LOGIN', 'USER', 1, '2024-08-25 10:30:15', '{"ip_address": "192.168.1.10"}'),
    (2, 'CREATE', 'PROJECT', 7, '2024-08-25 09:15:45', '{"after": {"project_name": "Old Oak Common - Site Survey"}}'),
    (1, 'UPDATE', 'USER', 3, '2024-08-25 08:45:22', '{"before": {"role": "Viewer"}, "after": {"role": "Editor"}}'),
    (3, 'DELETE', 'TASK', 5, '2024-08-24 15:50:00', '{"before": {"text": "Initial site walkover"}}'),
    (2, 'LOGOUT', 'USER', 2, '2024-08-24 12:30:00', '{}'),
    (null, 'SYSTEM_EVENT', 'SYSTEM', null, '2024-08-24 11:00:00', '{"type": "ERROR", "message": "Database connection failed"}'),
    (4, 'VIEW', 'DELIVERY_TRACKER', null, '2024-08-23 11:22:10', '{}');