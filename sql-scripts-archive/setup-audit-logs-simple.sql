CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_audit_logs" ON audit_logs
    FOR SELECT USING (true);

CREATE POLICY "system_insert_audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

GRANT SELECT ON audit_logs TO anon, authenticated;
GRANT INSERT ON audit_logs TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO anon, authenticated;

INSERT INTO audit_logs (user_id, action, entity, entity_id, timestamp, details) VALUES
    (1, 'LOGIN', 'USER', 1, '2024-08-25 10:30:15+01:00', '{"ip_address": "192.168.1.10"}'),
    (2, 'CREATE', 'PROJECT', 7, '2024-08-25 09:15:45+01:00', '{"after": {"project_name": "Old Oak Common - Site Survey"}}'),
    (1, 'UPDATE', 'USER', 3, '2024-08-25 08:45:22+01:00', '{"before": {"role": "Viewer"}, "after": {"role": "Editor"}}'),
    (3, 'DELETE', 'TASK', 5, '2024-08-24 15:50:00+01:00', '{"before": {"text": "Initial site walkover"}}'),
    (2, 'LOGOUT', 'USER', 2, '2024-08-24 12:30:00+01:00', '{}'),
    (null, 'SYSTEM_EVENT', 'SYSTEM', null, '2024-08-24 11:00:00+01:00', '{"type": "ERROR", "message": "Database connection failed"}'),
    (4, 'VIEW', 'DELIVERY_TRACKER', null, '2024-08-23 11:22:10+01:00', '{}');