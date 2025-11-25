import React from 'react';
import { Check, X, AlertCircle, Shield } from 'lucide-react';

/**
 * PermissionStats - Display summary statistics for permissions
 *
 * @param {Object} props
 * @param {Object} props.stats - Statistics by category
 * @param {number} props.totalPermissions - Total number of permissions
 * @param {number} props.grantedCount - Number of granted permissions
 * @param {number} props.modifiedCount - Number of modified permissions
 */
const PermissionStats = ({
    stats = {},
    totalPermissions = 0,
    grantedCount = 0,
    modifiedCount = 0
}) => {
    const deniedCount = totalPermissions - grantedCount;
    const grantedPercentage = totalPermissions > 0
        ? Math.round((grantedCount / totalPermissions) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Permissions */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {totalPermissions}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Permissions
                        </p>
                    </div>
                </div>
            </div>

            {/* Granted Permissions */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {grantedCount}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Granted ({grantedPercentage}%)
                        </p>
                    </div>
                </div>
            </div>

            {/* Denied Permissions */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {deniedCount}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Denied ({100 - grantedPercentage}%)
                        </p>
                    </div>
                </div>
            </div>

            {/* Modified Permissions */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {modifiedCount}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Modified
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermissionStats;
