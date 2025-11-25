import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, CheckCircle, XCircle } from 'lucide-react';
import PermissionRow from './PermissionRow';

/**
 * PermissionCard - Displays a category of permissions with bulk actions
 *
 * @param {Object} props
 * @param {string} props.category - Permission category name
 * @param {Array} props.permissions - Array of permission objects
 * @param {Object} props.modifiedPermissions - Set of modified permission keys
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Function} props.onTogglePermission - Callback when individual permission toggled
 * @param {Function} props.onBulkToggle - Callback for bulk category toggle
 */
const PermissionCard = ({
    category,
    permissions = [],
    modifiedPermissions = new Set(),
    isEditing = false,
    onTogglePermission,
    onBulkToggle
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate statistics
    const totalPermissions = permissions.length;
    const grantedCount = permissions.filter(p => p.has).length;
    const deniedCount = totalPermissions - grantedCount;
    const modifiedCount = permissions.filter(p =>
        modifiedPermissions.has(p.permission)
    ).length;

    const allGranted = grantedCount === totalPermissions;
    const noneGranted = grantedCount === 0;

    const handleBulkToggle = (grant) => {
        if (isEditing && onBulkToggle) {
            onBulkToggle(category, grant);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
            {/* Card Header */}
            <div
                className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    {/* Category Name & Expand Icon */}
                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}

                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {category}
                        </h3>

                        {/* Modified Badge */}
                        {modifiedCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                                {modifiedCount} modified
                            </span>
                        )}
                    </div>

                    {/* Statistics & Bulk Actions */}
                    <div className="flex items-center gap-4">
                        {/* Permission Count Badge */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="w-4 h-4" />
                                <span className="font-medium">{grantedCount}</span>
                            </span>
                            <span className="text-gray-400">/</span>
                            <span className="flex items-center gap-1 text-gray-500">
                                <X className="w-4 h-4" />
                                <span className="font-medium">{deniedCount}</span>
                            </span>
                        </div>

                        {/* Bulk Action Buttons (Edit Mode Only) */}
                        {isEditing && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => handleBulkToggle(true)}
                                    disabled={allGranted}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded
                                        flex items-center gap-1
                                        transition-colors
                                        ${allGranted
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        }
                                    `}
                                    title="Enable all in category"
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    Enable All
                                </button>

                                <button
                                    onClick={() => handleBulkToggle(false)}
                                    disabled={noneGranted}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded
                                        flex items-center gap-1
                                        transition-colors
                                        ${noneGranted
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                        }
                                    `}
                                    title="Disable all in category"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Disable All
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Card Content - Permissions List */}
            {isExpanded && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {permissions.length > 0 ? (
                        permissions.map((perm) => (
                            <PermissionRow
                                key={perm.permission}
                                permissionKey={perm.permission}
                                label={perm.label}
                                isGranted={perm.has}
                                isModified={modifiedPermissions.has(perm.permission)}
                                isEditing={isEditing}
                                onToggle={onTogglePermission}
                            />
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No permissions in this category
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PermissionCard;
