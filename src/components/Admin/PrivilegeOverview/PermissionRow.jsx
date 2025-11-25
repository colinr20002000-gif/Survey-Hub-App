import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

/**
 * PermissionRow - Displays a single permission with toggle control
 *
 * @param {Object} props
 * @param {string} props.permissionKey - Unique permission key
 * @param {string} props.label - Human-readable permission label
 * @param {boolean} props.isGranted - Whether permission is currently granted
 * @param {boolean} props.isModified - Whether permission differs from default
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Function} props.onToggle - Callback when permission is toggled
 */
const PermissionRow = ({
    permissionKey,
    label,
    isGranted,
    isModified = false,
    isEditing = false,
    onToggle
}) => {
    const handleToggle = () => {
        if (isEditing && onToggle) {
            onToggle(permissionKey, !isGranted);
        }
    };

    return (
        <div
            className={`
                flex items-center justify-between px-4 py-3
                border-b border-gray-200 dark:border-gray-700
                hover:bg-gray-50 dark:hover:bg-gray-800/50
                transition-colors
                ${isEditing ? 'cursor-pointer' : ''}
            `}
            onClick={handleToggle}
        >
            {/* Permission Label */}
            <div className="flex items-center gap-3 flex-1">
                {/* Modified Indicator */}
                {isModified && (
                    <AlertCircle
                        className="w-4 h-4 text-orange-500 dark:text-orange-400"
                        title="Modified from default"
                    />
                )}

                <span className="text-sm text-gray-900 dark:text-gray-100">
                    {label}
                </span>
            </div>

            {/* Status Toggle/Indicator */}
            <div className="flex items-center gap-2">
                {isEditing ? (
                    // Toggle Switch (Edit Mode)
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full
                            transition-colors focus:outline-none focus:ring-2
                            focus:ring-offset-2
                            ${isGranted
                                ? 'bg-green-600 focus:ring-green-500'
                                : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                            }
                        `}
                        aria-label={`Toggle ${label}`}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white
                                transition-transform
                                ${isGranted ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                ) : (
                    // Status Indicator (View Mode)
                    <div className="flex items-center gap-1">
                        {isGranted ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="w-5 h-5" />
                                <span className="text-xs font-medium">Granted</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                                <X className="w-5 h-5" />
                                <span className="text-xs font-medium">Denied</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PermissionRow;
