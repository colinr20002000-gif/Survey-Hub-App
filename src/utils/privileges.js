/**
 * Privilege System - Complete Access Control
 *
 * Privilege Levels:
 * 1. Viewer - Read-only access, no admin mode
 * 2. Viewer+ - Read + limited actions (complete tasks, assign equipment/vehicles, download files)
 * 3. Editor - Full access except admin mode
 * 4. Editor+ - Full access except admin mode (same as Editor)
 * 5. Admin - Full access including admin mode
 * 6. Super Admin - Full access including admin mode
 */

// Privilege level constants
export const PRIVILEGES = {
    VIEWER: 'Viewer',
    VIEWER_PLUS: 'Viewer+',
    EDITOR: 'Editor',
    EDITOR_PLUS: 'Editor+',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin'
};

// Privilege hierarchy (higher number = more permissions)
const PRIVILEGE_HIERARCHY = {
    [PRIVILEGES.VIEWER]: 1,
    [PRIVILEGES.VIEWER_PLUS]: 2,
    [PRIVILEGES.EDITOR]: 3,
    [PRIVILEGES.EDITOR_PLUS]: 3.5,
    [PRIVILEGES.ADMIN]: 4,
    [PRIVILEGES.SUPER_ADMIN]: 5
};

/**
 * Check if user has minimum privilege level
 */
export const hasMinimumPrivilege = (userPrivilege, requiredPrivilege) => {
    const userLevel = PRIVILEGE_HIERARCHY[userPrivilege] || 0;
    const requiredLevel = PRIVILEGE_HIERARCHY[requiredPrivilege] || 0;
    return userLevel >= requiredLevel;
};

/**
 * Permission definitions for each privilege level
 */
export const PERMISSIONS = {
    // View permissions (all privileges have these)
    VIEW_PROJECTS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_EQUIPMENT: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_VEHICLES: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_RESOURCE_CALENDAR: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_TASKS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_DOCUMENT_HUB: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_ANALYTICS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_ANNOUNCEMENTS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    VIEW_EQUIPMENT_CALENDAR: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Filter and sort (all privileges)
    USE_FILTERS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    USE_SORT: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Settings access (all privileges can change password and theme)
    CHANGE_PASSWORD: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    TOGGLE_THEME: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Feedback (all privileges can submit feedback)
    SUBMIT_FEEDBACK: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Viewer+ and above permissions
    COMPLETE_PROJECT_TASKS: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ASSIGN_EQUIPMENT: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    TRANSFER_EQUIPMENT: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    RETURN_EQUIPMENT: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ADD_EQUIPMENT_COMMENTS: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ASSIGN_VEHICLES: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    RETURN_VEHICLES: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ADD_VEHICLE_COMMENTS: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DOWNLOAD_DOCUMENT_HUB_FILES: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DOWNLOAD_PROJECT_FILES: [PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Editor and above permissions
    CREATE_PROJECTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_PROJECTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_PROJECTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ARCHIVE_PROJECTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    CREATE_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ASSIGN_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    CREATE_PROJECT_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_PROJECT_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_PROJECT_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ASSIGN_PROJECT_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    CREATE_DELIVERY_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_DELIVERY_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_DELIVERY_TASKS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    ADD_EQUIPMENT: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_EQUIPMENT: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_EQUIPMENT: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    ADD_VEHICLES: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_VEHICLES: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_VEHICLES: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    ALLOCATE_RESOURCES: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_RESOURCE_ALLOCATIONS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_RESOURCE_ALLOCATIONS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SET_AVAILABILITY_STATUS: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    UPLOAD_DOCUMENTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_DOCUMENTS: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    UPLOAD_PROJECT_FILES: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Admin mode access (Admin and Super Admin only)
    ACCESS_ADMIN_MODE: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Admin pages (Admin and Super Admin only)
    ACCESS_FEEDBACK: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ACCESS_USER_ADMIN: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ACCESS_DOCUMENT_MANAGEMENT: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ACCESS_DROPDOWN_MENU: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ACCESS_AUDIT_TRAIL: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    ACCESS_CALENDAR_COLOURS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // User management (Admin and Super Admin only)
    CREATE_USERS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_USERS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_USERS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    CHANGE_USER_PRIVILEGES: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Announcements management (Admin and Super Admin only)
    CREATE_ANNOUNCEMENTS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    EDIT_ANNOUNCEMENTS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    DELETE_ANNOUNCEMENTS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Button Visibility permissions (control specific UI buttons)
    SHOW_CHECK_DISCREPANCIES_BUTTON: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_ARCHIVED_PROJECT_TASKS_TOGGLE: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_ARCHIVED_DELIVERY_TASKS_TOGGLE: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_EQUIPMENT_AUDIT_TRAIL: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_VEHICLE_AUDIT_TRAIL: [PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_ARCHIVED_PROJECTS_TOGGLE: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_ARCHIVED_EQUIPMENT_TOGGLE: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
    SHOW_ARCHIVED_VEHICLES_TOGGLE: [PRIVILEGES.VIEWER, PRIVILEGES.VIEWER_PLUS, PRIVILEGES.EDITOR, PRIVILEGES.EDITOR_PLUS, PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],

    // Super Admin exclusive (if needed in future)
    MANAGE_SYSTEM_SETTINGS: [PRIVILEGES.SUPER_ADMIN],
};

/**
 * Check if user has specific permission
 * @param {string} userPrivilege - User's privilege level
 * @param {string} permission - Permission to check (from PERMISSIONS)
 * @param {Object} [dynamicPermissions] - Optional dynamic permissions object from database (overrides hardcoded PERMISSIONS)
 * @returns {boolean}
 */
export const hasPermission = (userPrivilege, permission, dynamicPermissions = null) => {
    // Use dynamic permissions if provided, otherwise fall back to hardcoded
    const permissionsSource = dynamicPermissions || PERMISSIONS;
    const allowedPrivileges = permissionsSource[permission];
    if (!allowedPrivileges) {
        console.warn(`Permission "${permission}" not found in permissions source`);
        return false;
    }
    return allowedPrivileges.includes(userPrivilege);
};

/**
 * Get all permissions for a privilege level
 * @param {string} privilege - Privilege level
 * @returns {string[]} - Array of permission names
 */
export const getPrivilegePermissions = (privilege) => {
    return Object.keys(PERMISSIONS).filter(permission =>
        PERMISSIONS[permission].includes(privilege)
    );
};

/**
 * Check if user can access admin mode
 * @param {string} userPrivilege - User's privilege level
 * @returns {boolean}
 */
export const canAccessAdminMode = (userPrivilege) => {
    return hasPermission(userPrivilege, 'ACCESS_ADMIN_MODE');
};

/**
 * Get user-friendly permission description
 */
export const PERMISSION_DESCRIPTIONS = {
    [PRIVILEGES.VIEWER]: {
        title: 'Viewer',
        description: 'Read-only access. Can view all pages, use filters and sorting. Can set availability status and submit feedback.',
        capabilities: [
            '✓ View all pages (Projects, Equipment, Vehicles, Tasks, etc.)',
            '✓ Use all filters and sorting features',
            '✓ Set availability status in resource calendar',
            '✓ Submit bug reports and feature requests',
            '✓ Change own password',
            '✓ Toggle light/dark mode',
            '✗ Cannot modify any data',
            '✗ No admin mode access'
        ]
    },
    [PRIVILEGES.VIEWER_PLUS]: {
        title: 'Viewer+',
        description: 'View access plus limited actions. Can complete tasks, assign/return equipment & vehicles, download files, set availability.',
        capabilities: [
            '✓ All Viewer permissions',
            '✓ Complete project tasks',
            '✓ Assign/transfer/return equipment',
            '✓ Add comments to equipment',
            '✓ Assign/return vehicles',
            '✓ Add comments to vehicles',
            '✓ Set availability status in resource calendar',
            '✓ Download files from Document Hub',
            '✓ Download files from Projects',
            '✗ Cannot create/edit/delete items',
            '✗ No admin mode access'
        ]
    },
    [PRIVILEGES.EDITOR]: {
        title: 'Editor',
        description: 'Full access to all features except admin mode. Can create, edit, and delete all items.',
        capabilities: [
            '✓ All Viewer+ permissions',
            '✓ Create/edit/delete projects',
            '✓ Create/edit/delete tasks',
            '✓ Add/edit/delete equipment',
            '✓ Add/edit/delete vehicles',
            '✓ Allocate/edit/delete resource allocations',
            '✓ Upload/delete documents',
            '✗ No admin mode access',
            '✗ Cannot manage users',
            '✗ Cannot access feedback, user admin, document management, dropdown menu, or audit trail'
        ]
    },
    [PRIVILEGES.EDITOR_PLUS]: {
        title: 'Editor+',
        description: 'Full access to all features except admin mode. Same permissions as Editor.',
        capabilities: [
            '✓ All Viewer+ permissions',
            '✓ Create/edit/delete projects',
            '✓ Create/edit/delete tasks',
            '✓ Add/edit/delete equipment',
            '✓ Add/edit/delete vehicles',
            '✓ Allocate/edit/delete resource allocations',
            '✓ Upload/delete documents',
            '✗ No admin mode access',
            '✗ Cannot manage users',
            '✗ Cannot access feedback, user admin, document management, dropdown menu, or audit trail'
        ]
    },
    [PRIVILEGES.ADMIN]: {
        title: 'Admin',
        description: 'Full system access including admin mode. Can manage users and access all admin pages.',
        capabilities: [
            '✓ All Editor permissions',
            '✓ Access admin mode',
            '✓ Manage users (create/edit/delete)',
            '✓ Access feedback',
            '✓ Access user admin',
            '✓ Access document management',
            '✓ Access dropdown menu',
            '✓ Access audit trail',
            '✓ Change user privileges'
        ]
    },
    [PRIVILEGES.SUPER_ADMIN]: {
        title: 'Super Admin',
        description: 'Complete system access with all administrative privileges.',
        capabilities: [
            '✓ All Admin permissions',
            '✓ Manage system settings',
            '✓ Full unrestricted access'
        ]
    }
};

/**
 * Validate privilege level
 * @param {string} privilege - Privilege to validate
 * @returns {boolean}
 */
export const isValidPrivilege = (privilege) => {
    return Object.values(PRIVILEGES).includes(privilege);
};

/**
 * Get default privilege (for new users)
 */
export const DEFAULT_PRIVILEGE = PRIVILEGES.VIEWER;
