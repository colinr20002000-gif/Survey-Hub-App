import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '../ui';
import { Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Filter } from 'lucide-react';

// Reusable MultiSelect Filter Component
const MultiSelectFilter = ({ options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const selectAll = () => onChange(options);
    const clearAll = () => onChange([]);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                    selectedValues.length > 0 ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-300 dark:border-gray-600'
                }`}
            >
                <span className="truncate">
                    {selectedValues.length === 0 
                        ? 'All' 
                        : selectedValues.length === options.length 
                            ? 'All' 
                            : `${selectedValues.length} selected`}
                </span>
                <Filter className="w-3 h-3 ml-1 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-48 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                        <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">Clear</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {options.map(option => (
                            <label key={option} className="flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded">
                                <input 
                                    type="checkbox" 
                                    checked={selectedValues.includes(option)}
                                    onChange={() => toggleOption(option)}
                                    className="w-3 h-3 mr-2 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{option === '' ? '(Blanks)' : option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AssetTable = ({ assets, onEdit, onDelete }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState({ key: 'asset_tag', direction: 'asc' }); 
    const [showFilters, setShowFilters] = useState(false); // New state for toggling filters
    const [filters, setFilters] = useState({
        asset_tag: [],
        new_asset_tag: [],
        category: [],
        description: [],
        serial_number: [],
        quantity: [],
        kit_group: [],
        assigned_to_text: [],
        last_checked: []
    });

    // Helper to extract unique options for a column
    const getOptions = (key) => {
        const values = assets.map(item => {
            let val = item[key];
            if (key === 'last_checked' && val) {
                val = new Date(val).toLocaleDateString();
            } else if (key === 'quantity') {
                val = String(val || 0);
            } else {
                val = String(val || '');
            }
            return val;
        });
        return [...new Set(values)].sort();
    };

    // Filter Logic
    const filteredAssets = useMemo(() => {
        return assets.filter(item => {
            return Object.keys(filters).every(key => {
                if (filters[key].length === 0) return true; // No filter applied for this column
                
                let itemVal = item[key];
                if (key === 'last_checked' && itemVal) {
                    itemVal = new Date(itemVal).toLocaleDateString();
                } else if (key === 'quantity') {
                    itemVal = String(itemVal || 0);
                } else {
                    itemVal = String(itemVal || '');
                }
                
                return filters[key].includes(itemVal);
            });
        });
    }, [assets, filters]);

    // Sort Logic
    const sortedAssets = useMemo(() => {
        const sorted = [...filteredAssets];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                
                if (sortConfig.key === 'last_checked') {
                    const dateA = a.last_checked ? new Date(a.last_checked).getTime() : 0;
                    const dateB = b.last_checked ? new Date(b.last_checked).getTime() : 0;
                    if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                if (sortConfig.key === 'quantity') {
                    const numA = a.quantity || 0;
                    const numB = b.quantity || 0;
                    if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredAssets, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
    const currentData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedAssets.slice(start, start + itemsPerPage);
    }, [sortedAssets, currentPage, itemsPerPage]);

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
            asset_tag: [],
            new_asset_tag: [],
            category: [],
            description: [],
            serial_number: [],
            quantity: [],
            kit_group: [],
            assigned_to_text: [],
            last_checked: []
        });
        setCurrentPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Asset Register</h3>
                <div className="flex gap-2">
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
                            <X className="w-4 h-4 mr-2" /> Clear All
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
                <div className="overflow-x-auto pb-32"> {/* Added padding-bottom to allow dropdowns to overflow */}
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('asset_tag')}>
                                    <div className="flex items-center">Asset Tag no. {getSortIcon('asset_tag')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('new_asset_tag')}>
                                    <div className="flex items-center">New Asset Tag {getSortIcon('new_asset_tag')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('category')}>
                                    <div className="flex items-center">Equipment Type {getSortIcon('category')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('description')}>
                                    <div className="flex items-center">Description {getSortIcon('description')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('serial_number')}>
                                    <div className="flex items-center">Serial No. {getSortIcon('serial_number')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('quantity')}>
                                    <div className="flex items-center">Quantity {getSortIcon('quantity')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('kit_group')}>
                                    <div className="flex items-center">Kit Group {getSortIcon('kit_group')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('assigned_to_text')}>
                                    <div className="flex items-center">Assigned To {getSortIcon('assigned_to_text')}</div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort('last_checked')}>
                                    <div className="flex items-center">Last Checked {getSortIcon('last_checked')}</div>
                                </th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                            {/* Filter Row */}
                            {showFilters && (
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('asset_tag')} selectedValues={filters.asset_tag} onChange={(vals) => handleFilterChange('asset_tag', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('new_asset_tag')} selectedValues={filters.new_asset_tag} onChange={(vals) => handleFilterChange('new_asset_tag', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('category')} selectedValues={filters.category} onChange={(vals) => handleFilterChange('category', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('description')} selectedValues={filters.description} onChange={(vals) => handleFilterChange('description', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('serial_number')} selectedValues={filters.serial_number} onChange={(vals) => handleFilterChange('serial_number', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('quantity')} selectedValues={filters.quantity} onChange={(vals) => handleFilterChange('quantity', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('kit_group')} selectedValues={filters.kit_group} onChange={(vals) => handleFilterChange('kit_group', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('assigned_to_text')} selectedValues={filters.assigned_to_text} onChange={(vals) => handleFilterChange('assigned_to_text', vals)} /></td>
                                    <td className="px-2 py-2"><MultiSelectFilter options={getOptions('last_checked')} selectedValues={filters.last_checked} onChange={(vals) => handleFilterChange('last_checked', vals)} /></td>
                                    <td className="px-2 py-2"></td>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {currentData.length > 0 ? (
                                currentData.map((item) => (
                                    <tr key={item.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.asset_tag || '-'}</td>
                                        <td className="px-6 py-4">{item.new_asset_tag || '-'}</td>
                                        <td className="px-6 py-4">{item.category || '-'}</td>
                                        <td className="px-6 py-4 truncate max-w-xs" title={item.description}>{item.description || '-'}</td>
                                        <td className="px-6 py-4">{item.serial_number || '-'}</td>
                                        <td className="px-6 py-4">{item.quantity || 1}</td>
                                        <td className="px-6 py-4">{item.kit_group || '-'}</td>
                                        <td className="px-6 py-4">{item.assigned_to_text || '-'}</td>
                                        <td className="px-6 py-4">{item.last_checked ? new Date(item.last_checked).toLocaleDateString() : '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => onEdit(item)} 
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(item)} 
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"> 
                                        No assets found.
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

export default AssetTable;