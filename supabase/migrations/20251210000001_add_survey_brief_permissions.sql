-- Add Survey Brief permissions to privilege_permissions table

-- 1. Edit Brief
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('EDIT_SURVEY_BRIEF', 'Viewer', false, 'Edit Brief', 'Projects', 23),
('EDIT_SURVEY_BRIEF', 'Viewer+', false, 'Edit Brief', 'Projects', 23),
('EDIT_SURVEY_BRIEF', 'Editor', true, 'Edit Brief', 'Projects', 23),
('EDIT_SURVEY_BRIEF', 'Editor+', true, 'Edit Brief', 'Projects', 23),
('EDIT_SURVEY_BRIEF', 'Admin', true, 'Edit Brief', 'Projects', 23),
('EDIT_SURVEY_BRIEF', 'Super Admin', true, 'Edit Brief', 'Projects', 23)
ON CONFLICT (permission_key, privilege_level) DO UPDATE SET
    is_granted = EXCLUDED.is_granted,
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category,
    display_order = EXCLUDED.display_order;

-- 2. Email Brief
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('EMAIL_SURVEY_BRIEF', 'Viewer', true, 'Email Brief', 'Projects', 24),
('EMAIL_SURVEY_BRIEF', 'Viewer+', true, 'Email Brief', 'Projects', 24),
('EMAIL_SURVEY_BRIEF', 'Editor', true, 'Email Brief', 'Projects', 24),
('EMAIL_SURVEY_BRIEF', 'Editor+', true, 'Email Brief', 'Projects', 24),
('EMAIL_SURVEY_BRIEF', 'Admin', true, 'Email Brief', 'Projects', 24),
('EMAIL_SURVEY_BRIEF', 'Super Admin', true, 'Email Brief', 'Projects', 24)
ON CONFLICT (permission_key, privilege_level) DO UPDATE SET
    is_granted = EXCLUDED.is_granted,
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category,
    display_order = EXCLUDED.display_order;

-- 3. Download PDF
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Viewer', true, 'Download PDF', 'Projects', 25),
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Viewer+', true, 'Download PDF', 'Projects', 25),
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Editor', true, 'Download PDF', 'Projects', 25),
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Editor+', true, 'Download PDF', 'Projects', 25),
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Admin', true, 'Download PDF', 'Projects', 25),
('DOWNLOAD_SURVEY_BRIEF_PDF', 'Super Admin', true, 'Download PDF', 'Projects', 25)
ON CONFLICT (permission_key, privilege_level) DO UPDATE SET
    is_granted = EXCLUDED.is_granted,
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category,
    display_order = EXCLUDED.display_order;
