import React from 'react';
import { Check, X, AlertCircle, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react';

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
 * @param {boolean} props.isUserOverrideMode - Whether in user override mode
 * @param {boolean} props.isOverride - Whether this is an active user override
 * @param {Function} props.onClearOverride - Callback to clear user override
 */
const PermissionRow = ({
    permissionKey,
    label,
    isGranted,
    isModified = false,
    isEditing = false,
    onToggle,
    isUserOverrideMode = false,
    isOverride = false,
    onClearOverride
}) => {
    const handleToggle = (newValue) => {
        if (isEditing && onToggle) {
            onToggle(permissionKey, newValue);
        }
    };

    return (
        <div
            className={`
                flex items-center justify-between px-4 py-3
                border-b border-gray-200 dark:border-gray-700
                transition-colors
                ${isEditing && !isUserOverrideMode ? 'cursor-pointer' : ''}
                ${isOverride ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}
            `}
            onClick={() => !isUserOverrideMode && handleToggle(!isGranted)}
        >
            {/* Permission Label */}
            <div className="flex items-center gap-3 flex-1">
                {/* Modified Indicator (Role Mode) or Override Indicator (User Mode) */}
                {isUserOverrideMode ? (
                    isOverride ? (
                        <RotateCcw
                            className="w-4 h-4 text-purple-500 cursor-pointer hover:text-red-500 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClearOverride) onClearOverride();
                            }}
                            title="Click to Clear Individual Override"
                        />
                    ) : (
                        <div className="w-4 h-4" /> // Spacer
                    )
                ) : (
                    isModified && (
                        <AlertCircle
                            className="w-4 h-4 text-orange-500 dark:text-orange-400"
                            title="Modified from default"
                        />
                    )
                )}

                <div>
                    <span className={`text-sm ${isOverride ? 'font-bold text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        {label}
                    </span>
                    {isOverride && (
                        <span className="ml-2 text-[10px] uppercase font-black text-purple-500 tracking-widest">Override</span>
                    )}
                </div>
            </div>

            {/* Status Toggle/Indicator */}
            <div className="flex items-center gap-2">
                {isUserOverrideMode ? (
                    // Triple Choice for User Overrides: Allow / Deny / (Inherited)
                    isEditing ? (
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggle(true); }}
                                className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    isOverride && isGranted
                                        ? 'bg-green-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-green-600'
                                }`}
                            >
                                <ShieldCheck size={12} />
                                Force Allow
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggle(false); }}
                                className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    isOverride && !isGranted
                                        ? 'bg-red-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-red-600'
                                }`}
                            >
                                <ShieldAlert size={12} />
                                Force Deny
                            </button>
                            {isOverride && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (onClearOverride) onClearOverride(); }}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Reset to Default"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isOverride ? (
                                isGranted ? (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase">Forced Allow</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800">
                                        <ShieldAlert className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase">Forced Deny</span>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 italic">
                                    {isGranted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    <span className="text-[10px] uppercase font-bold">Inherited ({isGranted ? 'Yes' : 'No'})</span>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    // Regular Role Toggle
                    isEditing ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(!isGranted);
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
                    )
                )}
            </div>
        </div>
    );
};

export default PermissionRow;
