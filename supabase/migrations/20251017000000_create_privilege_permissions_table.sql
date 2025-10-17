-- Create privilege_permissions table to store dynamic permission configurations
CREATE TABLE IF NOT EXISTS privilege_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL,
    privilege_level TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT false,
    permission_label TEXT NOT NULL,
    permission_category TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_permission_privilege UNIQUE (permission_key, privilege_level)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_privilege_permissions_privilege_level ON privilege_permissions(privilege_level);
CREATE INDEX IF NOT EXISTS idx_privilege_permissions_category ON privilege_permissions(permission_category);

-- Enable RLS
ALTER TABLE privilege_permissions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read privilege permissions
CREATE POLICY "Anyone can view privilege permissions"
    ON privilege_permissions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify privilege permissions
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
    );

-- Only admins can insert privilege permissions
CREATE POLICY "Only admins can insert privilege permissions"
    ON privilege_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- Only admins can delete privilege permissions
CREATE POLICY "Only admins can delete privilege permissions"
    ON privilege_permissions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_privilege_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_privilege_permissions_updated_at
    BEFORE UPDATE ON privilege_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_privilege_permissions_updated_at();

-- Insert default permissions from the current privilege system
-- View Access permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('VIEW_PROJECTS', 'Viewer', true, 'View Projects', 'View Access', 1),
('VIEW_PROJECTS', 'Viewer+', true, 'View Projects', 'View Access', 1),
('VIEW_PROJECTS', 'Editor', true, 'View Projects', 'View Access', 1),
('VIEW_PROJECTS', 'Editor+', true, 'View Projects', 'View Access', 1),
('VIEW_PROJECTS', 'Admin', true, 'View Projects', 'View Access', 1),
('VIEW_EQUIPMENT', 'Viewer', true, 'View Equipment', 'View Access', 2),
('VIEW_EQUIPMENT', 'Viewer+', true, 'View Equipment', 'View Access', 2),
('VIEW_EQUIPMENT', 'Editor', true, 'View Equipment', 'View Access', 2),
('VIEW_EQUIPMENT', 'Editor+', true, 'View Equipment', 'View Access', 2),
('VIEW_EQUIPMENT', 'Admin', true, 'View Equipment', 'View Access', 2),
('VIEW_VEHICLES', 'Viewer', true, 'View Vehicles', 'View Access', 3),
('VIEW_VEHICLES', 'Viewer+', true, 'View Vehicles', 'View Access', 3),
('VIEW_VEHICLES', 'Editor', true, 'View Vehicles', 'View Access', 3),
('VIEW_VEHICLES', 'Editor+', true, 'View Vehicles', 'View Access', 3),
('VIEW_VEHICLES', 'Admin', true, 'View Vehicles', 'View Access', 3),
('VIEW_RESOURCE_CALENDAR', 'Viewer', true, 'View Resource Calendar', 'View Access', 4),
('VIEW_RESOURCE_CALENDAR', 'Viewer+', true, 'View Resource Calendar', 'View Access', 4),
('VIEW_RESOURCE_CALENDAR', 'Editor', true, 'View Resource Calendar', 'View Access', 4),
('VIEW_RESOURCE_CALENDAR', 'Editor+', true, 'View Resource Calendar', 'View Access', 4),
('VIEW_RESOURCE_CALENDAR', 'Admin', true, 'View Resource Calendar', 'View Access', 4),
('VIEW_TASKS', 'Viewer', true, 'View Tasks', 'View Access', 5),
('VIEW_TASKS', 'Viewer+', true, 'View Tasks', 'View Access', 5),
('VIEW_TASKS', 'Editor', true, 'View Tasks', 'View Access', 5),
('VIEW_TASKS', 'Editor+', true, 'View Tasks', 'View Access', 5),
('VIEW_TASKS', 'Admin', true, 'View Tasks', 'View Access', 5),
('VIEW_DOCUMENT_HUB', 'Viewer', true, 'View Document Hub', 'View Access', 6),
('VIEW_DOCUMENT_HUB', 'Viewer+', true, 'View Document Hub', 'View Access', 6),
('VIEW_DOCUMENT_HUB', 'Editor', true, 'View Document Hub', 'View Access', 6),
('VIEW_DOCUMENT_HUB', 'Editor+', true, 'View Document Hub', 'View Access', 6),
('VIEW_DOCUMENT_HUB', 'Admin', true, 'View Document Hub', 'View Access', 6);

-- General Actions permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('USE_FILTERS', 'Viewer', true, 'Use Filters', 'General Actions', 7),
('USE_FILTERS', 'Viewer+', true, 'Use Filters', 'General Actions', 7),
('USE_FILTERS', 'Editor', true, 'Use Filters', 'General Actions', 7),
('USE_FILTERS', 'Editor+', true, 'Use Filters', 'General Actions', 7),
('USE_FILTERS', 'Admin', true, 'Use Filters', 'General Actions', 7),
('USE_SORT', 'Viewer', true, 'Use Sort', 'General Actions', 8),
('USE_SORT', 'Viewer+', true, 'Use Sort', 'General Actions', 8),
('USE_SORT', 'Editor', true, 'Use Sort', 'General Actions', 8),
('USE_SORT', 'Editor+', true, 'Use Sort', 'General Actions', 8),
('USE_SORT', 'Admin', true, 'Use Sort', 'General Actions', 8),
('SUBMIT_FEEDBACK', 'Viewer', true, 'Submit Feedback', 'General Actions', 9),
('SUBMIT_FEEDBACK', 'Viewer+', true, 'Submit Feedback', 'General Actions', 9),
('SUBMIT_FEEDBACK', 'Editor', true, 'Submit Feedback', 'General Actions', 9),
('SUBMIT_FEEDBACK', 'Editor+', true, 'Submit Feedback', 'General Actions', 9),
('SUBMIT_FEEDBACK', 'Admin', true, 'Submit Feedback', 'General Actions', 9),
('CHANGE_PASSWORD', 'Viewer', true, 'Change Password', 'General Actions', 10),
('CHANGE_PASSWORD', 'Viewer+', true, 'Change Password', 'General Actions', 10),
('CHANGE_PASSWORD', 'Editor', true, 'Change Password', 'General Actions', 10),
('CHANGE_PASSWORD', 'Editor+', true, 'Change Password', 'General Actions', 10),
('CHANGE_PASSWORD', 'Admin', true, 'Change Password', 'General Actions', 10),
('TOGGLE_THEME', 'Viewer', true, 'Toggle Light/Dark Theme', 'General Actions', 11),
('TOGGLE_THEME', 'Viewer+', true, 'Toggle Light/Dark Theme', 'General Actions', 11),
('TOGGLE_THEME', 'Editor', true, 'Toggle Light/Dark Theme', 'General Actions', 11),
('TOGGLE_THEME', 'Editor+', true, 'Toggle Light/Dark Theme', 'General Actions', 11),
('TOGGLE_THEME', 'Admin', true, 'Toggle Light/Dark Theme', 'General Actions', 11),
('SET_AVAILABILITY_STATUS', 'Viewer', true, 'Set Availability Status', 'General Actions', 12),
('SET_AVAILABILITY_STATUS', 'Viewer+', true, 'Set Availability Status', 'General Actions', 12),
('SET_AVAILABILITY_STATUS', 'Editor', true, 'Set Availability Status', 'General Actions', 12),
('SET_AVAILABILITY_STATUS', 'Editor+', true, 'Set Availability Status', 'General Actions', 12),
('SET_AVAILABILITY_STATUS', 'Admin', true, 'Set Availability Status', 'General Actions', 12);

-- Tasks permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('COMPLETE_PROJECT_TASKS', 'Viewer', false, 'Complete Tasks', 'Tasks', 13),
('COMPLETE_PROJECT_TASKS', 'Viewer+', true, 'Complete Tasks', 'Tasks', 13),
('COMPLETE_PROJECT_TASKS', 'Editor', true, 'Complete Tasks', 'Tasks', 13),
('COMPLETE_PROJECT_TASKS', 'Editor+', true, 'Complete Tasks', 'Tasks', 13),
('COMPLETE_PROJECT_TASKS', 'Admin', true, 'Complete Tasks', 'Tasks', 13),
('CREATE_TASKS', 'Viewer', false, 'Create Tasks', 'Tasks', 14),
('CREATE_TASKS', 'Viewer+', false, 'Create Tasks', 'Tasks', 14),
('CREATE_TASKS', 'Editor', true, 'Create Tasks', 'Tasks', 14),
('CREATE_TASKS', 'Editor+', true, 'Create Tasks', 'Tasks', 14),
('CREATE_TASKS', 'Admin', true, 'Create Tasks', 'Tasks', 14),
('EDIT_TASKS', 'Viewer', false, 'Edit Tasks', 'Tasks', 15),
('EDIT_TASKS', 'Viewer+', false, 'Edit Tasks', 'Tasks', 15),
('EDIT_TASKS', 'Editor', true, 'Edit Tasks', 'Tasks', 15),
('EDIT_TASKS', 'Editor+', true, 'Edit Tasks', 'Tasks', 15),
('EDIT_TASKS', 'Admin', true, 'Edit Tasks', 'Tasks', 15),
('DELETE_TASKS', 'Viewer', false, 'Delete Tasks', 'Tasks', 16),
('DELETE_TASKS', 'Viewer+', false, 'Delete Tasks', 'Tasks', 16),
('DELETE_TASKS', 'Editor', true, 'Delete Tasks', 'Tasks', 16),
('DELETE_TASKS', 'Editor+', true, 'Delete Tasks', 'Tasks', 16),
('DELETE_TASKS', 'Admin', true, 'Delete Tasks', 'Tasks', 16),
('ASSIGN_TASKS', 'Viewer', false, 'Assign Tasks', 'Tasks', 17),
('ASSIGN_TASKS', 'Viewer+', false, 'Assign Tasks', 'Tasks', 17),
('ASSIGN_TASKS', 'Editor', true, 'Assign Tasks', 'Tasks', 17),
('ASSIGN_TASKS', 'Editor+', true, 'Assign Tasks', 'Tasks', 17),
('ASSIGN_TASKS', 'Admin', true, 'Assign Tasks', 'Tasks', 17);

-- Projects permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('CREATE_PROJECTS', 'Viewer', false, 'Create Projects', 'Projects', 18),
('CREATE_PROJECTS', 'Viewer+', false, 'Create Projects', 'Projects', 18),
('CREATE_PROJECTS', 'Editor', true, 'Create Projects', 'Projects', 18),
('CREATE_PROJECTS', 'Editor+', true, 'Create Projects', 'Projects', 18),
('CREATE_PROJECTS', 'Admin', true, 'Create Projects', 'Projects', 18),
('EDIT_PROJECTS', 'Viewer', false, 'Edit Projects', 'Projects', 19),
('EDIT_PROJECTS', 'Viewer+', false, 'Edit Projects', 'Projects', 19),
('EDIT_PROJECTS', 'Editor', true, 'Edit Projects', 'Projects', 19),
('EDIT_PROJECTS', 'Editor+', true, 'Edit Projects', 'Projects', 19),
('EDIT_PROJECTS', 'Admin', true, 'Edit Projects', 'Projects', 19),
('DELETE_PROJECTS', 'Viewer', false, 'Delete Projects', 'Projects', 20),
('DELETE_PROJECTS', 'Viewer+', false, 'Delete Projects', 'Projects', 20),
('DELETE_PROJECTS', 'Editor', true, 'Delete Projects', 'Projects', 20),
('DELETE_PROJECTS', 'Editor+', true, 'Delete Projects', 'Projects', 20),
('DELETE_PROJECTS', 'Admin', true, 'Delete Projects', 'Projects', 20),
('ARCHIVE_PROJECTS', 'Viewer', false, 'Archive Projects', 'Projects', 21),
('ARCHIVE_PROJECTS', 'Viewer+', false, 'Archive Projects', 'Projects', 21),
('ARCHIVE_PROJECTS', 'Editor', true, 'Archive Projects', 'Projects', 21),
('ARCHIVE_PROJECTS', 'Editor+', true, 'Archive Projects', 'Projects', 21),
('ARCHIVE_PROJECTS', 'Admin', true, 'Archive Projects', 'Projects', 21);

-- Equipment permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ASSIGN_EQUIPMENT', 'Viewer', false, 'Assign Equipment', 'Equipment', 22),
('ASSIGN_EQUIPMENT', 'Viewer+', true, 'Assign Equipment', 'Equipment', 22),
('ASSIGN_EQUIPMENT', 'Editor', true, 'Assign Equipment', 'Equipment', 22),
('ASSIGN_EQUIPMENT', 'Editor+', true, 'Assign Equipment', 'Equipment', 22),
('ASSIGN_EQUIPMENT', 'Admin', true, 'Assign Equipment', 'Equipment', 22),
('TRANSFER_EQUIPMENT', 'Viewer', false, 'Transfer Equipment', 'Equipment', 23),
('TRANSFER_EQUIPMENT', 'Viewer+', true, 'Transfer Equipment', 'Equipment', 23),
('TRANSFER_EQUIPMENT', 'Editor', true, 'Transfer Equipment', 'Equipment', 23),
('TRANSFER_EQUIPMENT', 'Editor+', true, 'Transfer Equipment', 'Equipment', 23),
('TRANSFER_EQUIPMENT', 'Admin', true, 'Transfer Equipment', 'Equipment', 23),
('RETURN_EQUIPMENT', 'Viewer', false, 'Return Equipment', 'Equipment', 24),
('RETURN_EQUIPMENT', 'Viewer+', true, 'Return Equipment', 'Equipment', 24),
('RETURN_EQUIPMENT', 'Editor', true, 'Return Equipment', 'Equipment', 24),
('RETURN_EQUIPMENT', 'Editor+', true, 'Return Equipment', 'Equipment', 24),
('RETURN_EQUIPMENT', 'Admin', true, 'Return Equipment', 'Equipment', 24),
('ADD_EQUIPMENT_COMMENTS', 'Viewer', false, 'Add Equipment Comments', 'Equipment', 25),
('ADD_EQUIPMENT_COMMENTS', 'Viewer+', true, 'Add Equipment Comments', 'Equipment', 25),
('ADD_EQUIPMENT_COMMENTS', 'Editor', true, 'Add Equipment Comments', 'Equipment', 25),
('ADD_EQUIPMENT_COMMENTS', 'Editor+', true, 'Add Equipment Comments', 'Equipment', 25),
('ADD_EQUIPMENT_COMMENTS', 'Admin', true, 'Add Equipment Comments', 'Equipment', 25),
('ADD_EQUIPMENT', 'Viewer', false, 'Add Equipment', 'Equipment', 26),
('ADD_EQUIPMENT', 'Viewer+', false, 'Add Equipment', 'Equipment', 26),
('ADD_EQUIPMENT', 'Editor', true, 'Add Equipment', 'Equipment', 26),
('ADD_EQUIPMENT', 'Editor+', true, 'Add Equipment', 'Equipment', 26),
('ADD_EQUIPMENT', 'Admin', true, 'Add Equipment', 'Equipment', 26),
('EDIT_EQUIPMENT', 'Viewer', false, 'Edit Equipment', 'Equipment', 27),
('EDIT_EQUIPMENT', 'Viewer+', false, 'Edit Equipment', 'Equipment', 27),
('EDIT_EQUIPMENT', 'Editor', true, 'Edit Equipment', 'Equipment', 27),
('EDIT_EQUIPMENT', 'Editor+', true, 'Edit Equipment', 'Equipment', 27),
('EDIT_EQUIPMENT', 'Admin', true, 'Edit Equipment', 'Equipment', 27),
('DELETE_EQUIPMENT', 'Viewer', false, 'Delete Equipment', 'Equipment', 28),
('DELETE_EQUIPMENT', 'Viewer+', false, 'Delete Equipment', 'Equipment', 28),
('DELETE_EQUIPMENT', 'Editor', true, 'Delete Equipment', 'Equipment', 28),
('DELETE_EQUIPMENT', 'Editor+', true, 'Delete Equipment', 'Equipment', 28),
('DELETE_EQUIPMENT', 'Admin', true, 'Delete Equipment', 'Equipment', 28);

-- Vehicles permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ASSIGN_VEHICLES', 'Viewer', false, 'Assign Vehicles', 'Vehicles', 29),
('ASSIGN_VEHICLES', 'Viewer+', true, 'Assign Vehicles', 'Vehicles', 29),
('ASSIGN_VEHICLES', 'Editor', true, 'Assign Vehicles', 'Vehicles', 29),
('ASSIGN_VEHICLES', 'Editor+', true, 'Assign Vehicles', 'Vehicles', 29),
('ASSIGN_VEHICLES', 'Admin', true, 'Assign Vehicles', 'Vehicles', 29),
('RETURN_VEHICLES', 'Viewer', false, 'Return Vehicles', 'Vehicles', 30),
('RETURN_VEHICLES', 'Viewer+', true, 'Return Vehicles', 'Vehicles', 30),
('RETURN_VEHICLES', 'Editor', true, 'Return Vehicles', 'Vehicles', 30),
('RETURN_VEHICLES', 'Editor+', true, 'Return Vehicles', 'Vehicles', 30),
('RETURN_VEHICLES', 'Admin', true, 'Return Vehicles', 'Vehicles', 30),
('ADD_VEHICLE_COMMENTS', 'Viewer', false, 'Add Vehicle Comments', 'Vehicles', 31),
('ADD_VEHICLE_COMMENTS', 'Viewer+', true, 'Add Vehicle Comments', 'Vehicles', 31),
('ADD_VEHICLE_COMMENTS', 'Editor', true, 'Add Vehicle Comments', 'Vehicles', 31),
('ADD_VEHICLE_COMMENTS', 'Editor+', true, 'Add Vehicle Comments', 'Vehicles', 31),
('ADD_VEHICLE_COMMENTS', 'Admin', true, 'Add Vehicle Comments', 'Vehicles', 31),
('ADD_VEHICLES', 'Viewer', false, 'Add Vehicles', 'Vehicles', 32),
('ADD_VEHICLES', 'Viewer+', false, 'Add Vehicles', 'Vehicles', 32),
('ADD_VEHICLES', 'Editor', true, 'Add Vehicles', 'Vehicles', 32),
('ADD_VEHICLES', 'Editor+', true, 'Add Vehicles', 'Vehicles', 32),
('ADD_VEHICLES', 'Admin', true, 'Add Vehicles', 'Vehicles', 32),
('EDIT_VEHICLES', 'Viewer', false, 'Edit Vehicles', 'Vehicles', 33),
('EDIT_VEHICLES', 'Viewer+', false, 'Edit Vehicles', 'Vehicles', 33),
('EDIT_VEHICLES', 'Editor', true, 'Edit Vehicles', 'Vehicles', 33),
('EDIT_VEHICLES', 'Editor+', true, 'Edit Vehicles', 'Vehicles', 33),
('EDIT_VEHICLES', 'Admin', true, 'Edit Vehicles', 'Vehicles', 33),
('DELETE_VEHICLES', 'Viewer', false, 'Delete Vehicles', 'Vehicles', 34),
('DELETE_VEHICLES', 'Viewer+', false, 'Delete Vehicles', 'Vehicles', 34),
('DELETE_VEHICLES', 'Editor', true, 'Delete Vehicles', 'Vehicles', 34),
('DELETE_VEHICLES', 'Editor+', true, 'Delete Vehicles', 'Vehicles', 34),
('DELETE_VEHICLES', 'Admin', true, 'Delete Vehicles', 'Vehicles', 34);

-- Resource Calendar permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ALLOCATE_RESOURCES', 'Viewer', false, 'Allocate Resources', 'Resource Calendar', 35),
('ALLOCATE_RESOURCES', 'Viewer+', false, 'Allocate Resources', 'Resource Calendar', 35),
('ALLOCATE_RESOURCES', 'Editor', true, 'Allocate Resources', 'Resource Calendar', 35),
('ALLOCATE_RESOURCES', 'Editor+', true, 'Allocate Resources', 'Resource Calendar', 35),
('ALLOCATE_RESOURCES', 'Admin', true, 'Allocate Resources', 'Resource Calendar', 35),
('EDIT_RESOURCE_ALLOCATIONS', 'Viewer', false, 'Edit Resource Allocations', 'Resource Calendar', 36),
('EDIT_RESOURCE_ALLOCATIONS', 'Viewer+', false, 'Edit Resource Allocations', 'Resource Calendar', 36),
('EDIT_RESOURCE_ALLOCATIONS', 'Editor', true, 'Edit Resource Allocations', 'Resource Calendar', 36),
('EDIT_RESOURCE_ALLOCATIONS', 'Editor+', true, 'Edit Resource Allocations', 'Resource Calendar', 36),
('EDIT_RESOURCE_ALLOCATIONS', 'Admin', true, 'Edit Resource Allocations', 'Resource Calendar', 36),
('DELETE_RESOURCE_ALLOCATIONS', 'Viewer', false, 'Delete Resource Allocations', 'Resource Calendar', 37),
('DELETE_RESOURCE_ALLOCATIONS', 'Viewer+', false, 'Delete Resource Allocations', 'Resource Calendar', 37),
('DELETE_RESOURCE_ALLOCATIONS', 'Editor', true, 'Delete Resource Allocations', 'Resource Calendar', 37),
('DELETE_RESOURCE_ALLOCATIONS', 'Editor+', true, 'Delete Resource Allocations', 'Resource Calendar', 37),
('DELETE_RESOURCE_ALLOCATIONS', 'Admin', true, 'Delete Resource Allocations', 'Resource Calendar', 37);

-- Documents permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('DOWNLOAD_PROJECT_FILES', 'Viewer', false, 'Download Project Files', 'Documents', 38),
('DOWNLOAD_PROJECT_FILES', 'Viewer+', true, 'Download Project Files', 'Documents', 38),
('DOWNLOAD_PROJECT_FILES', 'Editor', true, 'Download Project Files', 'Documents', 38),
('DOWNLOAD_PROJECT_FILES', 'Editor+', true, 'Download Project Files', 'Documents', 38),
('DOWNLOAD_PROJECT_FILES', 'Admin', true, 'Download Project Files', 'Documents', 38),
('DOWNLOAD_DOCUMENT_HUB_FILES', 'Viewer', false, 'Download Document Hub Files', 'Documents', 39),
('DOWNLOAD_DOCUMENT_HUB_FILES', 'Viewer+', true, 'Download Document Hub Files', 'Documents', 39),
('DOWNLOAD_DOCUMENT_HUB_FILES', 'Editor', true, 'Download Document Hub Files', 'Documents', 39),
('DOWNLOAD_DOCUMENT_HUB_FILES', 'Editor+', true, 'Download Document Hub Files', 'Documents', 39),
('DOWNLOAD_DOCUMENT_HUB_FILES', 'Admin', true, 'Download Document Hub Files', 'Documents', 39),
('UPLOAD_DOCUMENTS', 'Viewer', false, 'Upload Documents', 'Documents', 40),
('UPLOAD_DOCUMENTS', 'Viewer+', false, 'Upload Documents', 'Documents', 40),
('UPLOAD_DOCUMENTS', 'Editor', true, 'Upload Documents', 'Documents', 40),
('UPLOAD_DOCUMENTS', 'Editor+', true, 'Upload Documents', 'Documents', 40),
('UPLOAD_DOCUMENTS', 'Admin', true, 'Upload Documents', 'Documents', 40),
('DELETE_DOCUMENTS', 'Viewer', false, 'Delete Documents', 'Documents', 41),
('DELETE_DOCUMENTS', 'Viewer+', false, 'Delete Documents', 'Documents', 41),
('DELETE_DOCUMENTS', 'Editor', true, 'Delete Documents', 'Documents', 41),
('DELETE_DOCUMENTS', 'Editor+', true, 'Delete Documents', 'Documents', 41),
('DELETE_DOCUMENTS', 'Admin', true, 'Delete Documents', 'Documents', 41),
('UPLOAD_PROJECT_FILES', 'Viewer', false, 'Upload Project Files', 'Documents', 42),
('UPLOAD_PROJECT_FILES', 'Viewer+', false, 'Upload Project Files', 'Documents', 42),
('UPLOAD_PROJECT_FILES', 'Editor', true, 'Upload Project Files', 'Documents', 42),
('UPLOAD_PROJECT_FILES', 'Editor+', true, 'Upload Project Files', 'Documents', 42),
('UPLOAD_PROJECT_FILES', 'Admin', true, 'Upload Project Files', 'Documents', 42);

-- Admin Access permissions
INSERT INTO privilege_permissions (permission_key, privilege_level, is_granted, permission_label, permission_category, display_order) VALUES
('ACCESS_ADMIN_MODE', 'Viewer', false, 'Access Admin Mode', 'Admin Access', 43),
('ACCESS_ADMIN_MODE', 'Viewer+', false, 'Access Admin Mode', 'Admin Access', 43),
('ACCESS_ADMIN_MODE', 'Editor', false, 'Access Admin Mode', 'Admin Access', 43),
('ACCESS_ADMIN_MODE', 'Editor+', false, 'Access Admin Mode', 'Admin Access', 43),
('ACCESS_ADMIN_MODE', 'Admin', true, 'Access Admin Mode', 'Admin Access', 43),
('ACCESS_FEEDBACK', 'Viewer', false, 'Access Feedback Page', 'Admin Access', 44),
('ACCESS_FEEDBACK', 'Viewer+', false, 'Access Feedback Page', 'Admin Access', 44),
('ACCESS_FEEDBACK', 'Editor', false, 'Access Feedback Page', 'Admin Access', 44),
('ACCESS_FEEDBACK', 'Editor+', false, 'Access Feedback Page', 'Admin Access', 44),
('ACCESS_FEEDBACK', 'Admin', true, 'Access Feedback Page', 'Admin Access', 44),
('ACCESS_USER_ADMIN', 'Viewer', false, 'Access User Admin', 'Admin Access', 45),
('ACCESS_USER_ADMIN', 'Viewer+', false, 'Access User Admin', 'Admin Access', 45),
('ACCESS_USER_ADMIN', 'Editor', false, 'Access User Admin', 'Admin Access', 45),
('ACCESS_USER_ADMIN', 'Editor+', false, 'Access User Admin', 'Admin Access', 45),
('ACCESS_USER_ADMIN', 'Admin', true, 'Access User Admin', 'Admin Access', 45),
('ACCESS_DOCUMENT_MANAGEMENT', 'Viewer', false, 'Access Document Management', 'Admin Access', 46),
('ACCESS_DOCUMENT_MANAGEMENT', 'Viewer+', false, 'Access Document Management', 'Admin Access', 46),
('ACCESS_DOCUMENT_MANAGEMENT', 'Editor', false, 'Access Document Management', 'Admin Access', 46),
('ACCESS_DOCUMENT_MANAGEMENT', 'Editor+', false, 'Access Document Management', 'Admin Access', 46),
('ACCESS_DOCUMENT_MANAGEMENT', 'Admin', true, 'Access Document Management', 'Admin Access', 46),
('ACCESS_DROPDOWN_MENU', 'Viewer', false, 'Access Dropdown Menu', 'Admin Access', 47),
('ACCESS_DROPDOWN_MENU', 'Viewer+', false, 'Access Dropdown Menu', 'Admin Access', 47),
('ACCESS_DROPDOWN_MENU', 'Editor', false, 'Access Dropdown Menu', 'Admin Access', 47),
('ACCESS_DROPDOWN_MENU', 'Editor+', false, 'Access Dropdown Menu', 'Admin Access', 47),
('ACCESS_DROPDOWN_MENU', 'Admin', true, 'Access Dropdown Menu', 'Admin Access', 47),
('ACCESS_AUDIT_TRAIL', 'Viewer', false, 'Access Audit Trail', 'Admin Access', 48),
('ACCESS_AUDIT_TRAIL', 'Viewer+', false, 'Access Audit Trail', 'Admin Access', 48),
('ACCESS_AUDIT_TRAIL', 'Editor', false, 'Access Audit Trail', 'Admin Access', 48),
('ACCESS_AUDIT_TRAIL', 'Editor+', false, 'Access Audit Trail', 'Admin Access', 48),
('ACCESS_AUDIT_TRAIL', 'Admin', true, 'Access Audit Trail', 'Admin Access', 48),
('ACCESS_CALENDAR_COLOURS', 'Viewer', false, 'Access Calendar Colours', 'Admin Access', 49),
('ACCESS_CALENDAR_COLOURS', 'Viewer+', false, 'Access Calendar Colours', 'Admin Access', 49),
('ACCESS_CALENDAR_COLOURS', 'Editor', false, 'Access Calendar Colours', 'Admin Access', 49),
('ACCESS_CALENDAR_COLOURS', 'Editor+', false, 'Access Calendar Colours', 'Admin Access', 49),
('ACCESS_CALENDAR_COLOURS', 'Admin', true, 'Access Calendar Colours', 'Admin Access', 49),
('CREATE_USERS', 'Viewer', false, 'Create Users', 'Admin Access', 50),
('CREATE_USERS', 'Viewer+', false, 'Create Users', 'Admin Access', 50),
('CREATE_USERS', 'Editor', false, 'Create Users', 'Admin Access', 50),
('CREATE_USERS', 'Editor+', false, 'Create Users', 'Admin Access', 50),
('CREATE_USERS', 'Admin', true, 'Create Users', 'Admin Access', 50),
('EDIT_USERS', 'Viewer', false, 'Edit Users', 'Admin Access', 51),
('EDIT_USERS', 'Viewer+', false, 'Edit Users', 'Admin Access', 51),
('EDIT_USERS', 'Editor', false, 'Edit Users', 'Admin Access', 51),
('EDIT_USERS', 'Editor+', false, 'Edit Users', 'Admin Access', 51),
('EDIT_USERS', 'Admin', true, 'Edit Users', 'Admin Access', 51),
('DELETE_USERS', 'Viewer', false, 'Delete Users', 'Admin Access', 52),
('DELETE_USERS', 'Viewer+', false, 'Delete Users', 'Admin Access', 52),
('DELETE_USERS', 'Editor', false, 'Delete Users', 'Admin Access', 52),
('DELETE_USERS', 'Editor+', false, 'Delete Users', 'Admin Access', 52),
('DELETE_USERS', 'Admin', true, 'Delete Users', 'Admin Access', 52),
('CHANGE_USER_PRIVILEGES', 'Viewer', false, 'Change User Privileges', 'Admin Access', 53),
('CHANGE_USER_PRIVILEGES', 'Viewer+', false, 'Change User Privileges', 'Admin Access', 53),
('CHANGE_USER_PRIVILEGES', 'Editor', false, 'Change User Privileges', 'Admin Access', 53),
('CHANGE_USER_PRIVILEGES', 'Editor+', false, 'Change User Privileges', 'Admin Access', 53),
('CHANGE_USER_PRIVILEGES', 'Admin', true, 'Change User Privileges', 'Admin Access', 53);
