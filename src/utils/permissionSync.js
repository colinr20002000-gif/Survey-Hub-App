/**
 * Permission Synchronization Utilities
 *
 * Provides helper functions for managing privilege permissions:
 * - Compare current permissions with defaults
 * - Reset permissions to factory defaults
 * - Get permission statistics by category
 */

import { supabase } from '../supabaseClient';

/**
 * Get differences between current permissions and defaults for a privilege level
 *
 * @param {string} privilegeLevel - The privilege level to compare (e.g., 'Viewer', 'Editor')
 * @returns {Promise<Array>} Array of permissions that differ from defaults
 *
 * @example
 * const differences = await getPermissionDifferences('Editor');
 * console.log(`Found ${differences.length} modified permissions`);
 */
export const getPermissionDifferences = async (privilegeLevel) => {
    try {
        // Fetch current permissions
        const { data: current, error: currentError } = await supabase
            .from('privilege_permissions')
            .select('*')
            .eq('privilege_level', privilegeLevel);

        if (currentError) throw currentError;

        // Fetch default permissions
        const { data: defaults, error: defaultsError } = await supabase
            .from('privilege_permission_defaults')
            .select('*')
            .eq('privilege_level', privilegeLevel);

        if (defaultsError) throw defaultsError;

        // Create a map of defaults for quick lookup
        const defaultsMap = new Map(
            defaults.map(d => [d.permission_key, d.is_granted])
        );

        // Find permissions that differ from defaults
        const differences = current
            .filter(perm => {
                const defaultValue = defaultsMap.get(perm.permission_key);
                return defaultValue !== undefined && defaultValue !== perm.is_granted;
            })
            .map(perm => ({
                permission_key: perm.permission_key,
                permission_label: perm.permission_label,
                permission_category: perm.permission_category,
                current_value: perm.is_granted,
                default_value: defaultsMap.get(perm.permission_key),
                display_order: perm.display_order
            }))
            .sort((a, b) => a.display_order - b.display_order);

        return differences;

    } catch (error) {
        console.error('Error getting permission differences:', error);
        throw error;
    }
};

/**
 * Reset all permissions for a privilege level to factory defaults
 *
 * @param {string} privilegeLevel - The privilege level to reset
 * @returns {Promise<{success: boolean, updated: number, message: string}>}
 *
 * @example
 * const result = await resetToDefaults('Viewer');
 * if (result.success) {
 *   alert(`Reset ${result.updated} permissions to defaults`);
 * }
 */
export const resetToDefaults = async (privilegeLevel) => {
    try {
        // Use the database function for atomic reset
        const { data, error } = await supabase.rpc('reset_permissions_to_defaults', {
            p_privilege_level: privilegeLevel
        });

        if (error) throw error;

        const result = data[0];

        return {
            success: result.success,
            updated: result.updated_count,
            message: result.message
        };

    } catch (error) {
        console.error('Error resetting to defaults:', error);
        return {
            success: false,
            updated: 0,
            message: `Error: ${error.message}`
        };
    }
};

/**
 * Get permission statistics by category for a privilege level
 *
 * @param {string} privilegeLevel - The privilege level to analyze
 * @returns {Promise<Object>} Statistics object with category breakdowns
 *
 * @example
 * const stats = await getPermissionStats('Editor');
 * // Returns: { "Projects": { total: 10, granted: 8 }, ... }
 */
export const getPermissionStats = async (privilegeLevel) => {
    try {
        const { data, error } = await supabase
            .from('privilege_permissions')
            .select('permission_category, is_granted')
            .eq('privilege_level', privilegeLevel);

        if (error) throw error;

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

    } catch (error) {
        console.error('Error getting permission stats:', error);
        throw error;
    }
};

/**
 * Get overall statistics for all privilege levels
 *
 * @returns {Promise<Object>} Overall statistics
 *
 * @example
 * const overall = await getOverallStats();
 * console.log(`Total permissions: ${overall.totalPermissions}`);
 */
export const getOverallStats = async () => {
    try {
        const { data, error } = await supabase
            .from('privilege_permissions')
            .select('privilege_level, permission_key');

        if (error) throw error;

        const privilegeLevels = new Set();
        const permissionKeys = new Set();

        data.forEach(perm => {
            privilegeLevels.add(perm.privilege_level);
            permissionKeys.add(perm.permission_key);
        });

        return {
            totalPermissions: permissionKeys.size,
            privilegeLevels: Array.from(privilegeLevels),
            privilegeLevelCount: privilegeLevels.size,
            totalRecords: data.length
        };

    } catch (error) {
        console.error('Error getting overall stats:', error);
        throw error;
    }
};

/**
 * Compare permissions between two privilege levels
 *
 * @param {string} level1 - First privilege level
 * @param {string} level2 - Second privilege level
 * @returns {Promise<Object>} Comparison results
 *
 * @example
 * const comparison = await comparePrivilegeLevels('Viewer', 'Editor');
 * console.log(`Differences: ${comparison.differences.length}`);
 */
export const comparePrivilegeLevels = async (level1, level2) => {
    try {
        // Fetch permissions for both levels
        const { data: perms1, error: error1 } = await supabase
            .from('privilege_permissions')
            .select('permission_key, is_granted')
            .eq('privilege_level', level1);

        if (error1) throw error1;

        const { data: perms2, error: error2 } = await supabase
            .from('privilege_permissions')
            .select('permission_key, is_granted')
            .eq('privilege_level', level2);

        if (error2) throw error2;

        // Create maps for comparison
        const map1 = new Map(perms1.map(p => [p.permission_key, p.is_granted]));
        const map2 = new Map(perms2.map(p => [p.permission_key, p.is_granted]));

        const differences = [];
        const onlyInLevel1 = [];
        const onlyInLevel2 = [];

        // Find permissions that differ
        map1.forEach((value1, key) => {
            if (map2.has(key)) {
                const value2 = map2.get(key);
                if (value1 !== value2) {
                    differences.push({
                        permission_key: key,
                        [level1]: value1,
                        [level2]: value2
                    });
                }
            } else {
                onlyInLevel1.push(key);
            }
        });

        // Find permissions only in level2
        map2.forEach((value, key) => {
            if (!map1.has(key)) {
                onlyInLevel2.push(key);
            }
        });

        return {
            differences,
            onlyInLevel1,
            onlyInLevel2,
            totalDifferences: differences.length,
            identical: differences.length === 0 &&
                       onlyInLevel1.length === 0 &&
                       onlyInLevel2.length === 0
        };

    } catch (error) {
        console.error('Error comparing privilege levels:', error);
        throw error;
    }
};

/**
 * Get audit trail for permission changes
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.privilegeLevel - Filter by privilege level
 * @param {number} filters.limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of audit records
 *
 * @example
 * const audit = await getAuditTrail({ privilegeLevel: 'Editor', limit: 20 });
 */
export const getAuditTrail = async (filters = {}) => {
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
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('Error getting audit trail:', error);
        throw error;
    }
};

/**
 * Save current permissions as defaults for a privilege level
 *
 * @param {string} privilegeLevel - The privilege level to save as default
 * @returns {Promise<{success: boolean, updated: number, message: string}>}
 *
 * @example
 * const result = await saveAsDefaults('Editor');
 * if (result.success) {
 *   alert(`Saved ${result.updated} permissions as defaults`);
 * }
 */
export const saveAsDefaults = async (privilegeLevel) => {
    try {
        // Fetch current permissions for this privilege level
        const { data: current, error: currentError } = await supabase
            .from('privilege_permissions')
            .select('*')
            .eq('privilege_level', privilegeLevel);

        if (currentError) throw currentError;

        // Delete existing defaults for this privilege level
        const { error: deleteError } = await supabase
            .from('privilege_permission_defaults')
            .delete()
            .eq('privilege_level', privilegeLevel);

        if (deleteError) throw deleteError;

        // Insert current permissions as new defaults
        const defaultsToInsert = current.map(perm => ({
            permission_key: perm.permission_key,
            privilege_level: perm.privilege_level,
            is_granted: perm.is_granted,
            permission_label: perm.permission_label,
            permission_category: perm.permission_category,
            display_order: perm.display_order
        }));

        const { error: insertError } = await supabase
            .from('privilege_permission_defaults')
            .insert(defaultsToInsert);

        if (insertError) throw insertError;

        return {
            success: true,
            updated: defaultsToInsert.length,
            message: `Successfully saved ${defaultsToInsert.length} permissions as defaults for ${privilegeLevel}`
        };

    } catch (error) {
        console.error('Error saving as defaults:', error);
        return {
            success: false,
            updated: 0,
            message: `Error: ${error.message}`
        };
    }
};
