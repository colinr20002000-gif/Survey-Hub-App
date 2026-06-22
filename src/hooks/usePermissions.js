import { useMemo, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PermissionContext } from '../contexts/PermissionContext';
import {
    hasPermission,
    canAccessAdminMode,
    PRIVILEGES,
    PERMISSIONS,
    hasMinimumPrivilege
} from '../utils/privileges';

/**
 * Custom hook for checking user permissions
 *
 * Usage:
 * const { can, canAccessAdmin, isViewer, isEditor, isAdmin } = usePermissions();
 *
 * if (can('CREATE_PROJECTS')) {
 *   // Show create button
 * }
 */
export const usePermissions = () => {
    const { user } = useAuth();
    const userPrivilege = user?.privilege || PRIVILEGES.VIEWER;

    // Get dynamic permissions and user-specific overrides from context
    const permissionContext = useContext(PermissionContext);
    
    // Safety check for context
    const dynamicPermissions = permissionContext?.permissions || null;
    const userOverrides = permissionContext?.userOverrides || {};

    // Memoize permission checks
    const permissions = useMemo(() => {
        /**
         * Check if user has a specific permission
         * @param {string} permission - Permission name from PERMISSIONS
         * @returns {boolean}
         */
        const can = (permission) => {
            return hasPermission(userPrivilege, permission, dynamicPermissions, userOverrides);
        };

        /**
         * Check if user can access admin mode
         * @returns {boolean}
         */
        const canAccessAdmin = () => {
            return canAccessAdminMode(userPrivilege);
        };

        /**
         * Check if user has at least the specified privilege level
         * @param {string} requiredPrivilege - Minimum required privilege
         * @returns {boolean}
         */
        const hasMinPrivilege = (requiredPrivilege) => {
            return hasMinimumPrivilege(userPrivilege, requiredPrivilege);
        };

        // Privilege level checks
        const isViewer = userPrivilege === PRIVILEGES.VIEWER;
        const isViewerPlus = userPrivilege === PRIVILEGES.VIEWER_PLUS;
        const isEditor = userPrivilege === PRIVILEGES.EDITOR;
        const isEditorPlus = userPrivilege === PRIVILEGES.EDITOR_PLUS;
        const isAdmin = userPrivilege === PRIVILEGES.ADMIN;
        const isSuperAdmin = userPrivilege === PRIVILEGES.SUPER_ADMIN;

        // Combined checks
        const isAdminOrAbove = isAdmin || isSuperAdmin;
        const isEditorOrAbove = isEditor || isEditorPlus || isAdmin || isSuperAdmin;
        const isViewerPlusOrAbove = isViewerPlus || isEditor || isEditorPlus || isAdmin || isSuperAdmin;

        // Specific permission groups
        const canModifyData = can('CREATE_PROJECTS'); // Editor or above
        const canManageUsers = can('CREATE_USERS'); // Admin or above
        const canViewOnly = isViewer; // Only viewer

        return {
            // Core functions
            can,
            canAccessAdmin,
            hasMinPrivilege,

            // Privilege checks
            userPrivilege,
            isViewer,
            isViewerPlus,
            isEditor,
            isEditorPlus,
            isAdmin,
            isSuperAdmin,

            // Combined checks
            isAdminOrAbove,
            isEditorOrAbove,
            isViewerPlusOrAbove,

            // Specific checks
            canModifyData,
            canManageUsers,
            canViewOnly,

            // Common permissions (for convenience)
            canCreateProjects: can('CREATE_PROJECTS'),
            canEditProjects: can('EDIT_PROJECTS'),
            canDeleteProjects: can('DELETE_PROJECTS'),
            canEditSiteInformation: can('EDIT_SITE_INFORMATION'),

            canViewTimesheets: can('VIEW_TIMESHEETS'),
            canViewWeeklyEntry: can('VIEW_WEEKLY_ENTRY'),
            canViewTeamOverview: can('VIEW_TEAM_OVERVIEW'),
            canViewApprovals: can('VIEW_APPROVALS'),
            canViewAllApprovals: can('VIEW_ALL_APPROVALS'),
            canManageTeamTimesheets: can('MANAGE_TEAM_TIMESHEETS'),
            canViewTimesheetTasks: can('VIEW_TIMESHEET_TASKS'),
            canManageTimesheetTasks: can('MANAGE_TIMESHEET_TASKS'),

            canCompleteTasks: can('COMPLETE_PROJECT_TASKS'),
            canCreateTasks: can('CREATE_TASKS'),
            canAssignTasks: can('ASSIGN_TASKS'),

            canAssignEquipment: can('ASSIGN_EQUIPMENT'),
            canReturnEquipment: can('RETURN_EQUIPMENT'),
            canAddEquipment: can('ADD_EQUIPMENT'),
            canAddEquipmentComments: can('ADD_EQUIPMENT_COMMENTS'),
            canDeleteEquipmentComments: can('DELETE_EQUIPMENT_COMMENTS'),

            canAssignVehicles: can('ASSIGN_VEHICLES'),
            canReturnVehicles: can('RETURN_VEHICLES'),
            canAddVehicles: can('ADD_VEHICLES'),
            canViewVehicleSummary: can('VIEW_VEHICLE_SUMMARY'),
            canAddVehicleComments: can('ADD_VEHICLE_COMMENTS'),
            canDeleteVehicleComments: can('DELETE_VEHICLE_COMMENTS'),

            canAllocateResources: can('ALLOCATE_RESOURCES'),
            canShareCalendar: can('SHARE_RESOURCE_CALENDAR'),
            canSetAvailabilityStatus: can('SET_AVAILABILITY_STATUS'),
            canEditAvailabilityStatus24H: can('EDIT_AVAILABILITY_STATUS_24H'),
            canEditAnyAvailabilityStatus: can('EDIT_ANY_AVAILABILITY_STATUS'),

            canDownloadFiles: can('DOWNLOAD_PROJECT_FILES'),
            canUploadDocuments: can('UPLOAD_DOCUMENTS'),
            canDeleteDocuments: can('DELETE_DOCUMENTS'),

            canAccessUserAdmin: can('ACCESS_USER_ADMIN'),
            canAccessFeedback: can('ACCESS_FEEDBACK'),
            canAccessAuditTrail: can('ACCESS_AUDIT_TRAIL'),
            canAccessDropdownMenu: can('ACCESS_DROPDOWN_MENU'),
            canAccessDocumentManagement: can('ACCESS_DOCUMENT_MANAGEMENT'),
            canAccessCalendarColours: can('ACCESS_CALENDAR_COLOURS'),

            canSubmitFeedback: can('SUBMIT_FEEDBACK'),

            canAddSubcontractors: can('ADD_SUBCONTRACTORS'),
            canEditSubcontractors: can('EDIT_SUBCONTRACTORS'),
            canDeleteSubcontractors: can('DELETE_SUBCONTRACTORS'),

            canAddUsefulContacts: can('ADD_USEFUL_CONTACTS'),
            canEditUsefulContacts: can('EDIT_USEFUL_CONTACTS'),
            canDeleteUsefulContacts: can('DELETE_USEFUL_CONTACTS'),

            canImportAssets: can('IMPORT_ASSETS_CSV'),
            canDeleteAllAssets: can('DELETE_ALL_ASSETS'),
        };
    }, [userPrivilege, dynamicPermissions, userOverrides]);

    return permissions;
};

export default usePermissions;
