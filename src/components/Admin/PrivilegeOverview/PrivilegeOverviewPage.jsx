import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Edit, Save, X, RotateCcw, History, AlertTriangle, Star, User, Users } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useDynamicPermissions } from '../../../hooks/useDynamicPermissions';
import {
    getPermissionDifferences,
    resetToDefaults,
    saveAsDefaults
} from '../../../utils/permissionSync';
import SearchFilter from './SearchFilter';
import PermissionCard from './PermissionCard';
import PermissionStats from './PermissionStats';
import AuditTrailModal from './AuditTrailModal';
import ConfirmationModal from '../../ConfirmationModal';
import { Combobox } from '../../ui';

const PRIVILEGE_LEVELS = ['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];

const CATEGORY_DISPLAY_ORDER = [
    'View Access',
    'Settings',
    'Admin',
    'Projects',
    'Announcements',
    'Timesheets',
    'Resource - Resource Calendar',
    'Resource - To Do List',
    'Resource - Close Calls',
    'Resource - Media',
    'Equipment - Calendar',
    'Equipment - Assignments',
    'Equipment - Register',
    'Equipment - Check & Adjust',
    'Vehicles - Vehicle Tracker',
    'Vehicles - Vehicle Summary',
    'Vehicles - Vehicle Inspection',
    'Vehicles - Mileage Log',
    'Delivery - To Do List',
    'Training Centre - Document Hub',
    'Contact Details - On-Call Contacts',
    'Contact Details - Subcontractors',
    'Contact Details - Useful Contacts',
    'Analytics - Project Logs',
    'Analytics - AFV',
    'Leaderboard'
];

/**
 * PrivilegeOverviewPage - Main privilege permission management interface
 */
const PrivilegeOverviewPage = () => {
    const {
        getPermissionsForPrivilege,
        bulkUpdatePermissions,
        bulkUpdateCategory,
        refreshPermissions,
        getUserOverrides,
        updateUserOverride,
        clearUserOverride
    } = useDynamicPermissions();

    // Tab and edit state
    const [activeTab, setActiveTab] = useState('Viewer'); // 'Viewer', ..., 'User Overrides'
    const [isEditing, setIsEditing] = useState(false);

    // User Overrides state
    const [allUsers, setAllStaff] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userOverrides, setUserOverrides] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Permissions data
    const [permissions, setPermissions] = useState({});
    const [originalPermissions, setOriginalPermissions] = useState({});
    const [modifiedPermissions, setModifiedPermissions] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showModifiedOnly, setShowModifiedOnly] = useState(false);

    // Modal state
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showSaveAsDefaultConfirm, setShowSaveAsDefaultConfirm] = useState(false);

    // Load users if on User Overrides tab
    useEffect(() => {
        if (activeTab === 'User Overrides') {
            fetchStaff();
        }
    }, [activeTab]);

    const fetchStaff = async () => {
        setLoadingUsers(true);
        try {
            // Fetch staff with safety checks for deleted_at column
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, name, privilege')
                .is('deleted_at', null);
                
            const { data: dummies, error: dummyError } = await supabase
                .from('dummy_users')
                .select('id, name, privilege')
                .is('deleted_at', null);
            
            if (userError) throw userError;
            if (dummyError) throw dummyError;

            const staff = [
                ...(users || []).map(u => ({ 
                    id: u.id, 
                    name: u.name || 'Unknown', 
                    privilege: u.privilege || 'Viewer',
                    is_dummy: false 
                })),
                ...(dummies || []).map(d => ({ 
                    id: d.id, 
                    name: `${d.name || 'Unknown'} (Dummy)`, 
                    privilege: d.privilege || 'Viewer',
                    is_dummy: true 
                }))
            ];
            
            staff.sort((a, b) => a.name.localeCompare(b.name));
            setAllStaff(staff);
        } catch (err) {
            console.error('Error fetching staff for overrides:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Load permissions for active tab
    useEffect(() => {
        if (activeTab === 'User Overrides') {
            if (selectedUserId) {
                loadUserOverrides();
            } else {
                setPermissions({});
                setOriginalPermissions({});
                setLoading(false);
            }
        } else {
            loadPermissions();
        }
    }, [activeTab, selectedUserId]);

    const loadUserOverrides = async () => {
        setLoading(true);
        try {
            const targetUser = allUsers.find(u => u.id === selectedUserId);
            if (!targetUser) return;

            // 1. Get base permissions for their role
            const basePerms = await getPermissionsForPrivilege(targetUser.privilege);
            
            // 2. Get their actual overrides
            const overrides = await getUserOverrides(selectedUserId);
            setUserOverrides(overrides || []);

            // 3. Merge them into the UI structure
            const merged = { ...basePerms };
            const modifiedKeys = new Set();

            Object.keys(merged).forEach(cat => {
                merged[cat] = merged[cat].map(p => {
                    const override = (overrides || []).find(o => o.permission_key === p.permission);
                    if (override) {
                        modifiedKeys.add(p.permission);
                        return { ...p, has: override.is_granted, is_override: true };
                    }
                    return { ...p, is_override: false };
                });
            });

            setPermissions(merged);
            setOriginalPermissions(JSON.parse(JSON.stringify(merged)));
            setModifiedPermissions(modifiedKeys);
        } catch (error) {
            console.error('Error loading user overrides:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const perms = await getPermissionsForPrivilege(activeTab);
            setPermissions(perms);
            setOriginalPermissions(JSON.parse(JSON.stringify(perms)));

            // Load modified permissions
            const diffs = await getPermissionDifferences(activeTab);
            const modifiedKeys = new Set(diffs.map(d => d.permission_key));
            setModifiedPermissions(modifiedKeys);
        } catch (error) {
            console.error('Error loading permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
    }, [permissions, originalPermissions]);

    // Get all categories (preserving order from database)
    const categories = useMemo(() => {
        return Object.keys(permissions);
    }, [permissions]);

    // Filter permissions based on search and filters (preserving category order)
    const filteredPermissions = useMemo(() => {
        let filtered = { ...permissions };
        const categoryKeys = Object.keys(permissions); // Preserve original order

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = categoryKeys.reduce((acc, category) => {
                if (!filtered[category]) return acc;
                const matchingPerms = filtered[category].filter(perm =>
                    perm.label.toLowerCase().includes(search) ||
                    perm.permission.toLowerCase().includes(search)
                );
                if (matchingPerms.length > 0) {
                    acc[category] = matchingPerms;
                }
                return acc;
            }, {});
        }

        // Filter by category
        if (categoryFilter) {
            filtered = { [categoryFilter]: filtered[categoryFilter] || [] };
        }

        // Filter by modified only
        if (showModifiedOnly) {
            const currentKeys = Object.keys(filtered);
            filtered = currentKeys.reduce((acc, category) => {
                const modifiedPerms = filtered[category].filter(perm =>
                    modifiedPermissions.has(perm.permission)
                );
                if (modifiedPerms.length > 0) {
                    acc[category] = modifiedPerms;
                }
                return acc;
            }, {});
        }

        return filtered;
    }, [permissions, searchTerm, categoryFilter, showModifiedOnly, modifiedPermissions]);

    // Calculate statistics
    const stats = useMemo(() => {
        const allPermissions = Object.values(permissions).flat();
        const totalPermissions = allPermissions.length;
        const grantedCount = allPermissions.filter(p => p.has).length;
        const modifiedCount = modifiedPermissions.size;

        return {
            totalPermissions,
            grantedCount,
            modifiedCount
        };
    }, [permissions, modifiedPermissions]);

    // Toggle individual permission
    const handleTogglePermission = useCallback((permissionKey, newValue) => {
        setPermissions(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(category => {
                updated[category] = updated[category].map(perm =>
                    perm.permission === permissionKey
                        ? { ...perm, has: newValue, is_override: true }
                        : perm
                );
            });
            return updated;
        });
    }, []);

    // Bulk toggle category
    const handleBulkToggleCategory = useCallback(async (category, isGranted) => {
        if (!window.confirm(`${isGranted ? 'Enable' : 'Disable'} all permissions in "${category}"?`)) {
            return;
        }

        try {
            const result = await bulkUpdateCategory(activeTab, category, isGranted);
            if (result.success) {
                await loadPermissions();
                alert(`Successfully ${isGranted ? 'enabled' : 'disabled'} ${result.updated} permissions`);
            }
        } catch (error) {
            console.error('Error bulk toggling category:', error);
            alert('Failed to update permissions');
        }
    }, [activeTab, bulkUpdateCategory, loadPermissions]);

    // Save changes
    const handleSave = async () => {
        try {
            if (activeTab === 'User Overrides') {
                // Collect changes for specific user
                const updates = [];
                const clears = [];

                Object.keys(permissions).forEach(cat => {
                    permissions[cat].forEach(perm => {
                        const original = originalPermissions[cat]?.find(p => p.permission === perm.permission);
                        if (original && original.has !== perm.has) {
                            updates.push({ key: perm.permission, val: perm.has });
                        }
                    });
                });

                if (updates.length === 0) {
                    alert('No changes to save');
                    return;
                }

                // Apply updates
                for (const up of updates) {
                    await updateUserOverride(selectedUserId, up.key, up.val, 'Admin override');
                }

                setIsEditing(false);
                await loadUserOverrides();
                alert(`Successfully updated ${updates.length} user overrides`);
                return;
            }

            // Global role updates
            const updates = [];
            Object.keys(permissions).forEach(category => {
                permissions[category].forEach(perm => {
                    const original = originalPermissions[category]?.find(
                        p => p.permission === perm.permission
                    );
                    if (original && original.has !== perm.has) {
                        updates.push({
                            permissionKey: perm.permission,
                            privilegeLevel: activeTab,
                            isGranted: perm.has
                        });
                    }
                });
            });

            if (updates.length === 0) {
                alert('No changes to save');
                return;
            }

            const result = await bulkUpdatePermissions(updates);
            if (result.success) {
                setIsEditing(false);
                await loadPermissions();
                alert(`Successfully updated ${updates.length} permissions`);
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('Failed to save permissions');
        }
    };

    // Clear specific override
    const handleClearOverride = async (permissionKey) => {
        if (!selectedUserId) return;
        try {
            const res = await clearUserOverride(selectedUserId, permissionKey);
            if (res.success) {
                await loadUserOverrides();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Cancel editing
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            setShowCancelConfirm(true);
        } else {
            setIsEditing(false);
        }
    };

    const confirmCancel = () => {
        setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
        setIsEditing(false);
        setShowCancelConfirm(false);
    };

    // Reset to defaults
    const handleResetToDefaults = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = async () => {
        try {
            if (activeTab === 'User Overrides') {
                // Clear all overrides for this user
                const { error } = await supabase.from('user_permission_overrides').delete().eq('user_id', selectedUserId);
                if (error) throw error;
                await loadUserOverrides();
                setShowResetConfirm(false);
                alert('Cleared all overrides for this user');
                return;
            }

            const result = await resetToDefaults(activeTab);
            if (result.success) {
                await loadPermissions();
                setShowResetConfirm(false);
                alert(`Successfully reset ${result.updated} permissions to defaults`);
            } else {
                alert(`Failed to reset: ${result.message}`);
            }
        } catch (error) {
            console.error('Error resetting to defaults:', error);
            alert('Failed to reset permissions');
        }
    };

    // Save as defaults
    const handleSaveAsDefaults = () => {
        setShowSaveAsDefaultConfirm(true);
    };

    const confirmSaveAsDefaults = async () => {
        try {
            const result = await saveAsDefaults(activeTab);
            if (result.success) {
                await loadPermissions();
                setShowSaveAsDefaultConfirm(false);
                alert(`Successfully saved ${result.updated} permissions as defaults for ${activeTab}`);
            } else {
                alert(`Failed to save as defaults: ${result.message}`);
            }
        } catch (error) {
            console.error('Error saving as defaults:', error);
            alert('Failed to save permissions as defaults');
        }
    };

    // Handle tab change
    const handleTabChange = (newTab) => {
        if (hasUnsavedChanges) {
            if (!window.confirm('You have unsaved changes. Switching tabs will discard them. Continue?')) {
                return;
            }
        }
        setActiveTab(newTab);
        setIsEditing(false);
        setSearchTerm('');
        setCategoryFilter('');
        setShowModifiedOnly(false);
    };

    const targetUser = useMemo(() => allUsers.find(u => u.id === selectedUserId), [allUsers, selectedUserId]);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    Privilege Overview
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {activeTab === 'User Overrides' ? 'Manage specific exceptions for an individual user' : 'Manage permissions for each privilege level'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Audit Trail Button */}
                            <button
                                onClick={() => setShowAuditModal(true)}
                                className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Audit Trail
                            </button>

                            {/* Reset to Defaults Button */}
                            {!isEditing && stats.modifiedCount > 0 && (
                                <button
                                    onClick={handleResetToDefaults}
                                    className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {activeTab === 'User Overrides' ? 'Clear All Overrides' : 'Reset to Defaults'}
                                </button>
                            )}

                            {/* Save as Default Button */}
                            {!isEditing && activeTab !== 'User Overrides' && (
                                <button
                                    onClick={handleSaveAsDefaults}
                                    className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/50 flex items-center gap-2"
                                    title="Save current settings as the default for this privilege level"
                                >
                                    <Star className="w-4 h-4" />
                                    Save as Default
                                </button>
                            )}

                            {/* Edit/Save/Cancel Buttons */}
                            {(activeTab !== 'User Overrides' || selectedUserId) && (
                                !isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Permissions
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={!hasUnsavedChanges}
                                            className={`
                                                px-4 py-2 rounded-md flex items-center gap-2
                                                ${hasUnsavedChanges
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </button>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div className="flex overflow-x-auto">
                        {PRIVILEGE_LEVELS.map((level) => (
                            <button
                                key={level}
                                onClick={() => handleTabChange(level)}
                                className={`
                                    px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                                    ${activeTab === level
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                    }
                                `}
                            >
                                {level}
                            </button>
                        ))}
                        <button
                            onClick={() => handleTabChange('User Overrides')}
                            className={`
                                px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2
                                ${activeTab === 'User Overrides'
                                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                }
                            `}
                        >
                            <Users size={16} />
                            User Overrides
                        </button>
                    </div>
                </div>

                {/* User Selector (Only for User Overrides tab) */}
                {activeTab === 'User Overrides' && (
                    <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-2">Select User to Manage</label>
                                <Combobox 
                                    name="user-override-select"
                                    options={allUsers.map(u => u.name)}
                                    value={targetUser?.name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const found = allUsers.find(u => u.name === val);
                                        if (found) {
                                            setSelectedUserId(found.id);
                                            setIsEditing(false);
                                        }
                                    }}
                                    placeholder={loadingUsers ? "Loading staff..." : "Search by name..."}
                                />
                            </div>
                            {targetUser && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg border border-purple-100 dark:border-purple-800 flex items-center gap-3">
                                    <User size={20} className="text-purple-600" />
                                    <div>
                                        <p className="text-xs text-purple-500 uppercase font-black">Current Privilege</p>
                                        <p className="text-sm font-bold text-purple-900 dark:text-purple-100">{targetUser.privilege}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!selectedUserId && !loadingUsers && (
                            <div className="mt-6 p-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">Please select a user to manage their specific permission overrides.</p>
                            </div>
                        )}
                    </div>
                )}

                {(activeTab !== 'User Overrides' || selectedUserId) && (
                    <>
                        {/* Statistics */}
                        <PermissionStats
                            stats={{}}
                            totalPermissions={stats.totalPermissions}
                            grantedCount={stats.grantedCount}
                            modifiedCount={stats.modifiedCount}
                        />

                        {/* Search and Filter */}
                        <SearchFilter
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            categoryFilter={categoryFilter}
                            onCategoryChange={setCategoryFilter}
                            categories={categories}
                            showModifiedOnly={showModifiedOnly}
                            onShowModifiedToggle={() => setShowModifiedOnly(!showModifiedOnly)}
                            modifiedCount={stats.modifiedCount}
                        />

                        {/* Permissions Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(filteredPermissions).length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">
                                            No permissions match your filters
                                        </p>
                                    </div>
                                ) : (
                                    CATEGORY_DISPLAY_ORDER
                                        .filter(categoryName => filteredPermissions[categoryName]) // Only show categories that have permissions
                                        .map((category) => (
                                            <PermissionCard
                                                key={category}
                                                category={category}
                                                permissions={filteredPermissions[category]}
                                                modifiedPermissions={modifiedPermissions}
                                                isEditing={isEditing}
                                                onTogglePermission={handleTogglePermission}
                                                onBulkToggle={activeTab === 'User Overrides' ? null : handleBulkToggleCategory}
                                                isUserOverrideMode={activeTab === 'User Overrides'}
                                                onClearOverride={handleClearOverride}
                                            />
                                        ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <AuditTrailModal
                isOpen={showAuditModal}
                onClose={() => setShowAuditModal(false)}
                privilegeLevel={activeTab}
            />

            {showResetConfirm && (
                <ConfirmationModal
                    isOpen={showResetConfirm}
                    onClose={() => setShowResetConfirm(false)}
                    onConfirm={confirmReset}
                    title={activeTab === 'User Overrides' ? 'Clear User Overrides' : 'Reset to Defaults'}
                    message={activeTab === 'User Overrides' 
                        ? `Are you sure you want to clear ALL overrides for ${targetUser?.name}? They will revert to the default permissions for the ${targetUser?.privilege} role.`
                        : `Are you sure you want to reset all ${activeTab} permissions to factory defaults? This will undo all custom changes for this privilege level.`}
                    confirmText={activeTab === 'User Overrides' ? 'Clear All' : 'Reset'}
                    type="warning"
                />
            )}

            {showCancelConfirm && (
                <ConfirmationModal
                    isOpen={showCancelConfirm}
                    onClose={() => setShowCancelConfirm(false)}
                    onConfirm={confirmCancel}
                    title="Discard Changes"
                    message="You have unsaved changes. Are you sure you want to discard them?"
                    confirmText="Discard"
                    type="warning"
                />
            )}

            {showSaveAsDefaultConfirm && (
                <ConfirmationModal
                    isOpen={showSaveAsDefaultConfirm}
                    onClose={() => setShowSaveAsDefaultConfirm(false)}
                    onConfirm={confirmSaveAsDefaults}
                    title="Save as Default"
                    message={`Are you sure you want to save the current ${activeTab} permissions as the default settings? This will overwrite the existing defaults for this privilege level. When you use "Reset to Defaults", it will restore to these settings.`}
                    confirmText="Save as Default"
                    type="info"
                />
            )}
        </div>
    );
};

export default PrivilegeOverviewPage;
