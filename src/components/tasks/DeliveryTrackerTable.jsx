import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button, Input, Select } from '../ui';
import { Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Archive, X, CheckCircle } from 'lucide-react';
import { DeliveryTaskItem } from '../tasks/TaskComponents';
import MultiSelectFilter from '../ui/MultiSelectFilter';

const DeliveryTrackerTable = ({ tasks, users, onToggle, onEdit, onDelete, onArchive, canComplete, canEdit, canDelete }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    
    // Initialize showFilters from localStorage
    const [showFilters, setShowFilters] = useState(() => {
        const saved = localStorage.getItem('deliveryTracker_showFilters');
        return saved ? JSON.parse(saved) : false;
    });

    // Initialize filters from localStorage
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('deliveryTracker_filters');
        return saved ? JSON.parse(saved) : {
            text: [],
            project: [],
            createdBy: [],
            assignedTo: [],
            status: [],
            createdAt: [],
            completedAt: []
        };
    });

    // Persist showFilters to localStorage
    useEffect(() => {
        localStorage.setItem('deliveryTracker_showFilters', JSON.stringify(showFilters));
    }, [showFilters]);

    // Persist filters to localStorage
    useEffect(() => {
        localStorage.setItem('deliveryTracker_filters', JSON.stringify(filters));
    }, [filters]);

    // Helper to get assigned user names string
    const getAssignedNames = (task) => {
        if (!task.assignedTo || !task.assignedTo.length) return '';
        return task.assignedTo
            .map(id => users.find(u => u.id === id)?.name || 'Unknown')
            .join(', ');
    };

    // Helper to get created by name
    const getCreatedByName = (userId) => {
        return users.find(u => u.id === userId)?.name || 'Unknown';
    };

    // Helper to get unique options for filters
    const getOptions = (key) => {
        const values = tasks.map(task => {
            let val = task[key];
            if (key === 'assignedTo') {
                val = getAssignedNames(task);
            } else if (key === 'createdBy') {
                val = getCreatedByName(task.createdBy);
            } else if (key === 'status') {
                val = task.completed ? 'Completed' : 'Pending';
            } else if (key === 'createdAt' || key === 'completedAt') {
                val = val ? new Date(val).toLocaleDateString() : '';
            } else {
                val = String(val || '');
            }
            return val;
        });
        
        if (key === 'assignedTo') {
            const allNames = new Set();
            tasks.forEach(task => {
                if (task.assignedTo) {
                    task.assignedTo.forEach(id => {
                        const name = users.find(u => u.id === id)?.name || 'Unknown';
                        allNames.add(name);
                    });
                }
            });
            return [...allNames].sort();
        }

        return [...new Set(values)].sort();
    };

    // Filter Logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            return Object.keys(filters).every(key => {
                if (filters[key].length === 0) return true;

                let taskVal = task[key];
                
                if (key === 'assignedTo') {
                    const assignedNames = task.assignedTo?.map(id => users.find(u => u.id === id)?.name || 'Unknown') || [];
                    return filters[key].some(filter => assignedNames.includes(filter));
                }
                
                if (key === 'createdBy') {
                    taskVal = getCreatedByName(task.createdBy);
                } else if (key === 'status') {
                    taskVal = task.completed ? 'Completed' : 'Pending';
                } else if (key === 'createdAt' || key === 'completedAt') {
                    taskVal = taskVal ? new Date(taskVal).toLocaleDateString() : '';
                } else {
                    taskVal = String(taskVal || '');
                }

                return filters[key].includes(taskVal);
            });
        });
    }, [tasks, filters, users]);

    // Sort Logic
    const sortedTasks = useMemo(() => {
        const sorted = [...filteredTasks];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'assignedTo') {
                    aVal = getAssignedNames(a);
                    bVal = getAssignedNames(b);
                } else if (sortConfig.key === 'createdBy') {
                    aVal = getCreatedByName(a.createdBy);
                    bVal = getCreatedByName(b.createdBy);
                } else if (sortConfig.key === 'status') {
                    aVal = a.completed ? 1 : 0;
                    bVal = b.completed ? 1 : 0;
                }

                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredTasks, sortConfig, users]);

    // Pagination
    const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
    const currentData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedTasks.slice(start, start + itemsPerPage);
    }, [sortedTasks, currentPage, itemsPerPage]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-orange-200" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-white" /> : <ArrowDown className="w-3 h-3 ml-1 text-white" />;
    };

    const handleFilterChange = (key, newValues) => {
        setFilters(prev => ({ ...prev, [key]: newValues }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            text: [],
            project: [],
            createdBy: [],
            assignedTo: [],
            status: [],
            createdAt: [],
            completedAt: []
        });
        setCurrentPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? 'bg-gray-100 dark:bg-gray-700' : ''}
                >
                    <Filter className="w-4 h-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                {hasActiveFilters && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                        <X className="w-4 h-4 mr-2" /> Clear All Filters
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
                {/* Reduced padding-bottom from pb-32 to pb-4 to remove large gap */}
                <div className="overflow-x-auto pb-4 min-h-[200px]">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="px-6 py-3 w-8"></th> 
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('text')}>
                                    <div className="flex items-center">Task Description {getSortIcon('text')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('project')}>
                                    <div className="flex items-center">Project {getSortIcon('project')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('assignedTo')}>
                                    <div className="flex items-center">Assigned To {getSortIcon('assignedTo')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('status')}>
                                    <div className="flex items-center">Status {getSortIcon('status')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('createdAt')}>
                                    <div className="flex items-center">Created {getSortIcon('createdAt')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('createdBy')}>
                                    <div className="flex items-center">By {getSortIcon('createdBy')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('completedAt')}>
                                    <div className="flex items-center">Completed {getSortIcon('completedAt')}</div>
                                </th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                            {showFilters && (
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700">
                                    <td className="px-2 py-2"></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('text')} selectedValues={filters.text} onChange={(vals) => handleFilterChange('text', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('project')} selectedValues={filters.project} onChange={(vals) => handleFilterChange('project', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('assignedTo')} selectedValues={filters.assignedTo} onChange={(vals) => handleFilterChange('assignedTo', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={['Pending', 'Completed']} selectedValues={filters.status} onChange={(vals) => handleFilterChange('status', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('createdAt')} selectedValues={filters.createdAt} onChange={(vals) => handleFilterChange('createdAt', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('createdBy')} selectedValues={filters.createdBy} onChange={(vals) => handleFilterChange('createdBy', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('completedAt')} selectedValues={filters.completedAt} onChange={(vals) => handleFilterChange('completedAt', vals)} /></td>
                                    <td className="px-2 py-2"></td>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {currentData.length > 0 ? (
                                currentData.map((task) => (
                                    <tr key={task.id} className={`bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${task.completed ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            {canComplete && (
                                                <input
                                                    type="checkbox"
                                                    checked={task.completed}
                                                    onChange={() => onToggle(task)}
                                                    className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 cursor-pointer"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white break-words max-w-xs">
                                            <span className={task.completed ? 'line-through text-gray-500' : ''}>{task.text}</span>
                                        </td>
                                        <td className="px-6 py-4">{task.project}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {task.assignedTo?.map(id => {
                                                    const user = users.find(u => u.id === id);
                                                    return user ? (
                                                        <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                            {user.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.completed ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {getCreatedByName(task.createdBy)}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <button onClick={() => onEdit(task)} className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canEdit && onArchive && (
                                                    <button onClick={() => onArchive(task)} className="p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300" title={task.archived ? "Unarchive" : "Archive"}>
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => onDelete(task.id)} className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No tasks found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryTrackerTable;