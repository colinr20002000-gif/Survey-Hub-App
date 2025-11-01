import React, { useState, useEffect, useMemo, useRef } from 'react';
import { History, Search, Filter, X, Download, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuditTrail } from '../contexts/AuditTrailContext';
import { getAvatarText } from '../utils/avatarColors';
import { Button, Select, Input, Pagination } from '../components/ui';
import { useDebouncedValue } from '../utils/debounce';

// Mock users (to be replaced with actual user data from context)
const mockUsers = {
  '1': { id: 1, username: 'Colin.Rogers', name: 'Colin Rogers', avatar: 'CR' },
  '2': { id: 2, username: 'Ben.Carter', name: 'Ben Carter', avatar: 'BC' },
  '3': { id: 3, username: 'Chloe.Davis', name: 'Chloe Davis', avatar: 'CD' },
  '4': { id: 4, username: 'David.Evans', name: 'David Evans', avatar: 'DE' },
  '5': { id: 5, username: 'Frank.Green', name: 'Frank Green', avatar: 'FG' },
};

const AuditTrailPage = () => {
    const { auditLogs, loading, error } = useAuditTrail();
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionFilter, setActionFilter] = useState([]);
    const [userFilter, setUserFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [severityFilter, setSeverityFilter] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const filterRef = useRef(null);

    useEffect(() => {
        setLogs(auditLogs);
    }, [auditLogs]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Enhanced action icons and colors
    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return { icon: '🔐', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
            case 'LOGOUT': return { icon: '🚪', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' };
            case 'CREATE': return { icon: '➕', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
            case 'UPDATE': return { icon: '✏️', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
            case 'DELETE': return { icon: '🗑️', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
            case 'VIEW': return { icon: '👁️', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
            case 'SYSTEM_EVENT': return { icon: '⚙️', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
            case 'ERROR': return { icon: '❌', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
            case 'WARNING': return { icon: '⚠️', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
            default: return { icon: '📝', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' };
        }
    };

    const getSeverity = (action, details) => {
        if (action === 'DELETE' || action === 'ERROR') return 'HIGH';
        if (action === 'UPDATE' || action === 'WARNING') return 'MEDIUM';
        return 'LOW';
    };

    const filteredLogs = useMemo(() => logs.filter(log => {
        const userName = log.user || 'SYSTEM';
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];

        const matchesSearch = (userName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            (log.entity && log.entity.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (log.entityId && log.entityId.toString().includes(debouncedSearchTerm)));

        const matchesAction = actionFilter.length === 0 || actionFilter.includes(log.action);
        const matchesUser = userFilter === '' || log.user === userFilter;
        const matchesEntity = entityFilter === '' || log.entity === entityFilter;
        const matchesDate = (!dateRange.start || logDate >= dateRange.start) &&
                           (!dateRange.end || logDate <= dateRange.end);
        const matchesSeverity = severityFilter === '' || getSeverity(log.action, log.details) === severityFilter;

        return matchesSearch && matchesAction && matchesUser && matchesEntity && matchesDate && matchesSeverity;
    }), [logs, debouncedSearchTerm, actionFilter, userFilter, entityFilter, dateRange, severityFilter]);

    const sortedLogs = useMemo(() => {
        let sortableItems = [...filteredLogs];
        sortableItems.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Special handling for timestamp sorting
            if (sortConfig.key === 'timestamp') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredLogs, sortConfig]);

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (!sortedLogs || sortedLogs.length === 0 || !itemsPerPage || itemsPerPage <= 0) return 0;
        return Math.ceil(sortedLogs.length / itemsPerPage);
    }, [sortedLogs, itemsPerPage]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const toggleRowExpansion = (logId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedRows(newExpanded);
    };

    const handleExport = (format) => {
        const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Severity', 'Details'];
        const rows = sortedLogs.map(log => {
            const userName = log.user || 'SYSTEM';
            return [
                formatTimestamp(log.timestamp),
                userName,
                log.action,
                log.entity || '',
                log.entityId || '',
                getSeverity(log.action, log.details),
                JSON.stringify(log.details)
            ];
        });

        if (format === 'CSV') {
            const csvContent = [headers, ...rows].map(row =>
                row.map(cell => `"${cell}"`).join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-trail-${dateRange.start}-to-${dateRange.end}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        // Add other export formats as needed
    };

    const handleClearAll = async () => {
        const confirmed = window.confirm(
            '⚠️ WARNING: Clear All Audit Logs?\n\n' +
            'This will permanently delete ALL audit log entries from the database.\n\n' +
            'This action cannot be undone!\n\n' +
            'Are you sure you want to proceed?'
        );

        if (!confirmed) return;

        // Double confirmation for safety
        const doubleConfirm = window.confirm(
            '🚨 FINAL CONFIRMATION\n\n' +
            `You are about to delete ${logs.length} audit log entries.\n\n` +
            'Type YES in the next prompt to confirm.'
        );

        if (!doubleConfirm) return;

        const finalConfirm = window.prompt('Type YES to confirm deletion:');
        if (finalConfirm !== 'YES') {
            alert('❌ Deletion cancelled. You must type YES exactly to confirm.');
            return;
        }

        try {
            const { error } = await supabase
                .from('audit_logs')
                .delete()
                .not('id', 'is', null); // Delete all rows where id is not null (i.e., all rows)

            if (error) throw error;

            alert('✅ All audit log entries have been cleared successfully.');
            setLogs([]);
        } catch (error) {
            console.error('Error clearing audit logs:', error);
            alert('❌ Error clearing audit logs: ' + error.message);
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Europe/London'
        });
    };

    const formatRelativeTime = (timestamp) => {
        const now = new Date();
        const logTime = new Date(timestamp);
        const diffInMs = now - logTime;
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return formatTimestamp(timestamp);
    };

    const uniqueActions = [...new Set(logs.map(log => log.action))];
    const uniqueEntities = [...new Set(logs.map(log => log.entity))].filter(Boolean);
    const uniqueUsers = [...new Set(logs.map(log => log.user))].filter(Boolean).sort();

    // Summary statistics
    const stats = {
        total: filteredLogs.length,
        high: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'HIGH').length,
        medium: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'MEDIUM').length,
        low: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'LOW').length,
        today: filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp).toDateString();
            const today = new Date().toDateString();
            return logDate === today;
        }).length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading audit logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                    <div className="flex items-center">
                        <span className="mr-2">❌</span>
                        <span>Error loading audit logs: {error}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Audit Trail</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">System activity monitoring and security logs</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-red-600">{stats.high}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">High</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-yellow-600">{stats.medium}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Medium</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-green-600">{stats.low}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Low</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-blue-600">{stats.today}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
                    </div>
                </div>
            </div>

            {/* Enhanced Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* User Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Users</option>
                            {uniqueUsers.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                        <select
                            value={actionFilter[0] || ''}
                            onChange={(e) => setActionFilter(e.target.value ? [e.target.value] : [])}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
                        <select
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Entities</option>
                            {uniqueEntities.map(entity => (
                                <option key={entity} value={entity}>{entity}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actions</label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setActionFilter([]);
                                        setUserFilter('');
                                        setEntityFilter('');
                                        setSeverityFilter('');
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Clear
                                </Button>
                                <div className="relative group">
                                    <Button variant="outline" className="flex-1">
                                        <Download size={16} className="mr-1"/>Export
                                    </Button>
                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                                        <button onClick={() => handleExport('CSV')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">CSV</button>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={handleClearAll}
                                variant="outline"
                                className="w-full bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                                <Trash2 size={16} className="mr-1"/>Clear All
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Audit Log Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('timestamp')}>
                                    Timestamp {getSortIndicator('timestamp')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('user')}>
                                    User {getSortIndicator('user')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('action')}>
                                    Action {getSortIndicator('action')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('entity')}>
                                    Entity {getSortIndicator('entity')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Severity
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedLogs.map(log => {
                                const userName = log.user || 'SYSTEM';
                                const actionData = getActionIcon(log.action);
                                const severity = getSeverity(log.action, log.details);
                                const isExpanded = expandedRows.has(log.id);

                                return (
                                    <React.Fragment key={log.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-600/20 cursor-pointer" onClick={() => toggleRowExpansion(log.id)}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white font-mono">
                                                    {formatRelativeTime(log.timestamp)}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center font-bold text-white text-xs mr-3">
                                                        {getAvatarText({ name: userName })}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {userName}
                                                        </div>
                                                        {log.details?.ip_address && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                {log.details.ip_address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionData.color}`}>
                                                    <span className="mr-1">{actionData.icon}</span>
                                                    {log.action}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {log.entity || 'N/A'}
                                                    {log.entityId && (
                                                        <span className="ml-1 text-gray-500 dark:text-gray-400">#{log.entityId}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    severity === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                    severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                    {severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                                        {Object.keys(log.details || {}).length > 0 ?
                                                            `${Object.keys(log.details).length} properties` :
                                                            'No details'
                                                        }
                                                    </div>
                                                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">Event Details:</h4>
                                                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-gray-800 dark:text-gray-200">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                totalItems={sortedLogs.length}
            />
        </div>
    );
};


export default AuditTrailPage;
