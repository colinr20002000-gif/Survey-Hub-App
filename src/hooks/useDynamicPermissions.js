import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom hook to manage dynamic privilege permissions from database
 * Replaces the hardcoded PERMISSIONS object with database-driven configuration
 * Now supports user-specific overrides that take precedence over privilege levels.
 */
export const useDynamicPermissions = () => {
    const [permissions, setPermissions] = useState(null);
    const [userOverrides, setUserOverrides] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch all global privilege permissions
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
        } catch (err) {
            console.error('Error fetching permissions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Fetch overrides for the current logged-in user
     */
    const fetchUserOverrides = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_permission_overrides')
                .select('permission_key, is_granted')
                .eq('user_id', user.id);

            if (error) {
                // If table doesn't exist yet, just log once and don't throw
                if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('not find')) {
                    console.warn('User permission overrides table not found. Skipping overrides.');
                    return;
                }
                throw error;
            }

            const overrideMap = {};
            data.forEach(override => {
                overrideMap[override.permission_key] = override.is_granted;
            });

            setUserOverrides(overrideMap);
        } catch (err) {
            console.error('Error fetching user overrides:', err);
        }
    }, []);

    /**
     * Check if a specific user has a permission (taking overrides into account)
     * @param {string} userPrivilege - The user's privilege level
     * @param {string} permission - The permission key to check
     * @returns {boolean}
     */
    const hasPermission = useCallback((userPrivilege, permission) => {
        // 1. Check user-specific override first (highest priority)
        if (userOverrides && userOverrides[permission] !== undefined) {
            return userOverrides[permission];
        }

        // 2. Fall back to global privilege level
        if (!permissions || !permissions[permission]) {
            return false;
        }
        return permissions[permission].includes(userPrivilege);
    }, [permissions, userOverrides]);

    /**
     * Update a privilege-level permission in the database
     */
    const updatePermission = useCallback(async (permissionKey, privilegeLevel, isGranted) => {
        try {
            const { error: updateError } = await supabase
                .from('privilege_permissions')
                .update({ is_granted: isGranted })
                .eq('permission_key', permissionKey)
                .eq('privilege_level', privilegeLevel);

            if (updateError) throw updateError;
            await fetchPermissions();
            return { success: true };
        } catch (err) {
            console.error('Error updating permission:', err);
            return { success: false, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Get all permissions for a specific privilege level (for UI display)
     */
    const getPermissionsForPrivilege = useCallback(async (privilegeLevel) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('privilege_permissions')
                .select('*')
                .eq('privilege_level', privilegeLevel)
                .order('display_order', { ascending: true });

            if (fetchError) throw fetchError;

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
     * Get overrides for a SPECIFIC user (for Admin UI)
     */
    const getUserOverrides = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_permission_overrides')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching user overrides:', err);
            return [];
        }
    }, []);

    /**
     * Update/Set an override for a specific user
     */
    const updateUserOverride = useCallback(async (userId, permissionKey, isGranted, reason = '') => {
        try {
            const { error } = await supabase
                .from('user_permission_overrides')
                .upsert({
                    user_id: userId,
                    permission_key: permissionKey,
                    is_granted: isGranted,
                    reason: reason,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,permission_key' });

            if (error) throw error;
            
            // If the updated user is the current user, refresh local overrides
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id === userId) {
                await fetchUserOverrides();
            }

            return { success: true };
        } catch (err) {
            console.error('Error updating user override:', err);
            return { success: false, error: err.message };
        }
    }, [fetchUserOverrides]);

    /**
     * Clear an override (returning the user to global privilege logic)
     */
    const clearUserOverride = useCallback(async (userId, permissionKey) => {
        try {
            const { error } = await supabase
                .from('user_permission_overrides')
                .delete()
                .eq('user_id', userId)
                .eq('permission_key', permissionKey);

            if (error) throw error;

            // Refresh current user if needed
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id === userId) {
                await fetchUserOverrides();
            }

            return { success: true };
        } catch (err) {
            console.error('Error clearing user override:', err);
            return { success: false, error: err.message };
        }
    }, [fetchUserOverrides]);

    /**
     * Bulk update multiple permissions at once
     */
    const bulkUpdatePermissions = useCallback(async (updates) => {
        try {
            const promises = updates.map(({ permissionKey, privilegeLevel, isGranted }) =>
                supabase
                    .from('privilege_permissions')
                    .update({ is_granted: isGranted })
                    .eq('permission_key', permissionKey)
                    .eq('privilege_level', privilegeLevel)
            );

            const results = await Promise.all(promises);
            const failed = results.filter(r => r.error);
            if (failed.length > 0) throw new Error(`${failed.length} updates failed`);

            await fetchPermissions();
            return { success: true };
        } catch (err) {
            console.error('Error bulk updating permissions:', err);
            return { success: false, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Bulk update all permissions in a specific category for a privilege level
     */
    const bulkUpdateCategory = useCallback(async (privilegeLevel, category, isGranted) => {
        try {
            const { data, error: updateError } = await supabase
                .from('privilege_permissions')
                .update({ is_granted: isGranted })
                .eq('privilege_level', privilegeLevel)
                .eq('permission_category', category)
                .select();

            if (updateError) throw updateError;
            await fetchPermissions();
            return { success: true, updated: data?.length || 0 };
        } catch (err) {
            console.error('Error bulk updating category:', err);
            return { success: false, error: err.message };
        }
    }, [fetchPermissions]);

    /**
     * Get audit trail for permission changes
     */
    const getAuditTrail = useCallback(async (filters = {}) => {
        try {
            let query = supabase
                .from('privilege_permission_audit')
                .select('*')
                .order('changed_at', { ascending: false });

            if (filters.privilegeLevel) query = query.eq('privilege_level', filters.privilegeLevel);
            query = query.limit(filters.limit || 50);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error getting audit trail:', err);
            return [];
        }
    }, []);

    // Fetch permissions on mount
    useEffect(() => {
        fetchPermissions();
        fetchUserOverrides();
    }, [fetchPermissions, fetchUserOverrides]);

    return {
        permissions,
        userOverrides,
        loading,
        error,
        hasPermission,
        updatePermission,
        bulkUpdatePermissions,
        getPermissionsForPrivilege,
        getUserOverrides,
        updateUserOverride,
        clearUserOverride,
        getAuditTrail,
        refreshPermissions: fetchPermissions
    };
};
