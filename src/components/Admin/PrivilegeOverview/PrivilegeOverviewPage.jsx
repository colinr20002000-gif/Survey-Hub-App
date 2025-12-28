import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Edit, Save, X, RotateCcw, History, AlertTriangle, Star } from 'lucide-react';
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

const PRIVILEGE_LEVELS = ['Viewer', 'Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin'];

const CATEGORY_DISPLAY_ORDER = [
    'View Access',
    'Settings',
    'Admin',
    'Projects',
    'Announcements',
    'Resource - Resource Calendar',
    'Resource - To Do List',
    'Resource - Close Calls',
    'Resource - Media',
    'Equipment - Calendar',
    'Equipment - Assignments',
    'Equipment - Register',
    'Equipment - Check & Adjust',
    'Vehicles - Vehicle Management',
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
        refreshPermissions
    } = useDynamicPermissions();

    // Tab and edit state
    const [activeTab, setActiveTab] = useState('Viewer');
    const [isEditing, setIsEditing] = useState(false);

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

    // Load permissions for active tab
    useEffect(() => {
        loadPermissions();
    }, [activeTab]);

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
                        ? { ...perm, has: newValue }
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
            // Collect all changes
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

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    Privilege Overview
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Manage permissions for each privilege level
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                                    Reset to Defaults
                                </button>
                            )}

                            {/* Save as Default Button */}
                            {!isEditing && (
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
                            {!isEditing ? (
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
                    </div>
                </div>

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
                                        onBulkToggle={handleBulkToggleCategory}
                                    />
                                ))
                        )}
                    </div>
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
                    title="Reset to Defaults"
                    message={`Are you sure you want to reset all ${activeTab} permissions to factory defaults? This will undo all custom changes for this privilege level.`}
                    confirmText="Reset"
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
