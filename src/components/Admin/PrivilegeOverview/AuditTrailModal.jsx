import React, { useState, useEffect } from 'react';
import { X, History, Check, XIcon, Calendar, User } from 'lucide-react';
import { useDynamicPermissions } from '../../../hooks/useDynamicPermissions';

/**
 * AuditTrailModal - Display audit history of permission changes
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {string} props.privilegeLevel - Optional filter by privilege level
 */
const AuditTrailModal = ({
    isOpen,
    onClose,
    privilegeLevel = null
}) => {
    const { getAuditTrail } = useDynamicPermissions();
    const [auditRecords, setAuditRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(privilegeLevel || '');

    useEffect(() => {
        if (isOpen) {
            fetchAuditTrail();
        }
    }, [isOpen, selectedLevel]);

    const fetchAuditTrail = async () => {
        setLoading(true);
        try {
            const filters = {
                limit: 100
            };

            if (selectedLevel) {
                filters.privilegeLevel = selectedLevel;
            }

            const records = await getAuditTrail(filters);
            setAuditRecords(records);
        } catch (error) {
            console.error('Error fetching audit trail:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Permission Audit Trail
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                            Filter by privilege level:
                        </label>
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                        >
                            <option value="">All Levels</option>
                            <option value="Viewer">Viewer</option>
                            <option value="Viewer+">Viewer+</option>
                            <option value="Editor">Editor</option>
                            <option value="Editor+">Editor+</option>
                            <option value="Admin">Admin</option>
                            <option value="Super Admin">Super Admin</option>
                        </select>

                        <button
                            onClick={fetchAuditTrail}
                            className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : auditRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No audit records found</p>
                            {selectedLevel && (
                                <p className="text-sm mt-1">Try changing the filter</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {auditRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                                >
                                    <div className="flex items-start justify-between">
                                        {/* Change Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">
                                                    {record.privilege_level}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {record.permission_key}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm">
                                                {/* Old Value */}
                                                <div className="flex items-center gap-1">
                                                    {record.old_value ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XIcon className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {record.old_value ? 'Granted' : 'Denied'}
                                                    </span>
                                                </div>

                                                <span className="text-gray-400">→</span>

                                                {/* New Value */}
                                                <div className="flex items-center gap-1">
                                                    {record.new_value ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XIcon className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                                                        {record.new_value ? 'Granted' : 'Denied'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metadata */}
                                        <div className="text-right text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                            <div className="flex items-center gap-1 justify-end">
                                                <User className="w-3 h-3" />
                                                <span>{record.changed_by_email}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(record.changed_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {auditRecords.length} recent changes
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditTrailModal;
