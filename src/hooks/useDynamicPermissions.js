import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom hook to manage dynamic privilege permissions from database
 * Replaces the hardcoded PERMISSIONS object with database-driven configuration
 */
export const useDynamicPermissions = () => {
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch all permissions from the database
     */
    const fetchPermissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('privilege_permissions')
                .select('*')
                .order('display_order', { ascending: true });

            if (fetchError) throw fetchError;

            // Transform the flat array into the nested structure
            // {permission_key: [privilege_level1, privilege_level2, ...]}
            const permissionMap = {};

            data.forEach(perm => {
                if (!permissionMap[perm.permission_key]) {
                    permissionMap[perm.permission_key] = [];
                }

                if (perm.is_granted) {
                    permissionMap[perm.permission_key].push(perm.privilege_level);
                }
            });

            setPermissions(permissionMap);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching permissions:', err);
            setError(err.message);
            setLoading(false);
        }
    }, []);

    /**
     * Check if a privilege level has a specific permission
     * @param {string} userPrivilege - The user's privilege level
     * @param {string} permission - The permission key to check
     * @returns {boolean}
     */
    const hasPermission = useCallback((userPrivilege, permission) => {
        if (!permissions || !permissions[permission]) {
            return false;
        }
        return permissions[permission].includes(userPrivilege);
    }, [permissions]);

    /**
     * Update a permission in the database
     * @param {string} permissionKey - The permission key
     * @param {string} privilegeLevel - The privilege level
     * @param {boolean} isGranted - Whether to grant or revoke the permission
     */
    const updatePermission = useCallback(async (permissionKey, privilegeLevel, isGranted) => {
        try {
            const { error: updateError } = await supabase
                .from('privilege_permissions')
                .update({ is_granted: isGranted })
                .eq('permission_key', permissionKey)
                .eq('privilege_level', privilegeLevel);

            if (updateError) throw updateError;

            // Refresh permissions after update
            await fetchPermissions();

            return { success: true };
        } catch (err) {
            console.error('Error updating permission:', err);
            return { success: false, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Get all permissions for a specific privilege level
     * @param {string} privilegeLevel - The privilege level
     * @returns {Object} - Permissions grouped by category
     */
    const getPermissionsForPrivilege = useCallback(async (privilegeLevel) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('privilege_permissions')
                .select('*')
                .eq('privilege_level', privilegeLevel)
                .order('display_order', { ascending: true });

            if (fetchError) throw fetchError;

            // Group by category
            const groupedPermissions = {};
            data.forEach(perm => {
                if (!groupedPermissions[perm.permission_category]) {
                    groupedPermissions[perm.permission_category] = [];
                }
                groupedPermissions[perm.permission_category].push({
                    permission: perm.permission_key,
                    label: perm.permission_label,
                    has: perm.is_granted
                });
            });

            return groupedPermissions;
        } catch (err) {
            console.error('Error fetching permissions for privilege:', err);
            return {};
        }
    }, []);

    /**
     * Bulk update multiple permissions at once
     * @param {Array} updates - Array of {permissionKey, privilegeLevel, isGranted}
     */
    const bulkUpdatePermissions = useCallback(async (updates) => {
        try {
            // Perform all updates
            const promises = updates.map(({ permissionKey, privilegeLevel, isGranted }) =>
                supabase
                    .from('privilege_permissions')
                    .update({ is_granted: isGranted })
                    .eq('permission_key', permissionKey)
                    .eq('privilege_level', privilegeLevel)
            );

            const results = await Promise.all(promises);

            // Check if any failed
            const failed = results.filter(r => r.error);
            if (failed.length > 0) {
                throw new Error(`${failed.length} updates failed`);
            }

            // Refresh permissions after bulk update
            await fetchPermissions();

            return { success: true };
        } catch (err) {
            console.error('Error bulk updating permissions:', err);
            return { success: false, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Get permission statistics by category for a privilege level
     * @param {string} privilegeLevel - The privilege level to analyze
     * @returns {Promise<Object>} Statistics object with category breakdowns
     */
    const getPermissionStats = useCallback(async (privilegeLevel) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('privilege_permissions')
                .select('permission_category, is_granted')
                .eq('privilege_level', privilegeLevel);

            if (fetchError) throw fetchError;

            const stats = {};

            data.forEach(perm => {
                if (!stats[perm.permission_category]) {
                    stats[perm.permission_category] = {
                        total: 0,
                        granted: 0,
                        denied: 0
                    };
                }

                stats[perm.permission_category].total++;

                if (perm.is_granted) {
                    stats[perm.permission_category].granted++;
                } else {
                    stats[perm.permission_category].denied++;
                }
            });

            return stats;

        } catch (err) {
            console.error('Error getting permission stats:', err);
            return {};
        }
    }, []);

    /**
     * Bulk update entire category - enable or disable all permissions in a category
     * @param {string} privilegeLevel - The privilege level
     * @param {string} category - The permission category
     * @param {boolean} isGranted - Whether to grant or revoke all permissions
     * @returns {Promise<{success: boolean, updated: number}>}
     */
    const bulkUpdateCategory = useCallback(async (privilegeLevel, category, isGranted) => {
        try {
            // Get all permissions in the category
            const { data: permissions, error: fetchError } = await supabase
                .from('privilege_permissions')
                .select('permission_key')
                .eq('privilege_level', privilegeLevel)
                .eq('permission_category', category);

            if (fetchError) throw fetchError;

            // Update all permissions in parallel
            const updates = permissions.map(perm =>
                supabase
                    .from('privilege_permissions')
                    .update({ is_granted: isGranted })
                    .eq('permission_key', perm.permission_key)
                    .eq('privilege_level', privilegeLevel)
            );

            const results = await Promise.all(updates);

            // Check if any failed
            const failed = results.filter(r => r.error);
            if (failed.length > 0) {
                throw new Error(`${failed.length} updates failed`);
            }

            // Refresh permissions after update
            await fetchPermissions();

            return { success: true, updated: permissions.length };

        } catch (err) {
            console.error('Error bulk updating category:', err);
            return { success: false, updated: 0, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Get audit trail for permission changes
     * @param {Object} filters - Filter options
     * @param {string} filters.privilegeLevel - Filter by privilege level
     * @param {number} filters.limit - Maximum number of records to return (default: 50)
     * @returns {Promise<Array>} Array of audit records
     */
    const getAuditTrail = useCallback(async (filters = {}) => {
        try {
            let query = supabase
                .from('privilege_permission_audit')
                .select('*')
                .order('changed_at', { ascending: false });

            if (filters.privilegeLevel) {
                query = query.eq('privilege_level', filters.privilegeLevel);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            } else {
                query = query.limit(50); // Default limit
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            return data || [];

        } catch (err) {
            console.error('Error getting audit trail:', err);
            return [];
        }
    }, []);

    // Fetch permissions on mount
    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    return {
        permissions,
        loading,
        error,
        hasPermission,
        updatePermission,
        bulkUpdatePermissions,
        getPermissionsForPrivilege,
        getPermissionStats,
        bulkUpdateCategory,
        getAuditTrail,
        refreshPermissions: fetchPermissions
    };
};
