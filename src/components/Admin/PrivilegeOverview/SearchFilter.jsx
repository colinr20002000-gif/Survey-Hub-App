import React from 'react';
import { Search, Filter, AlertCircle } from 'lucide-react';

/**
 * SearchFilter - Search and filter controls for permissions
 *
 * @param {Object} props
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.onSearchChange - Callback when search term changes
 * @param {string} props.categoryFilter - Selected category filter
 * @param {Function} props.onCategoryChange - Callback when category filter changes
 * @param {Array} props.categories - Available categories
 * @param {boolean} props.showModifiedOnly - Whether to show only modified permissions
 * @param {Function} props.onShowModifiedToggle - Callback when modified filter toggles
 * @param {number} props.modifiedCount - Count of modified permissions
 */
const SearchFilter = ({
    searchTerm = '',
    onSearchChange,
    categoryFilter = '',
    onCategoryChange,
    categories = [],
    showModifiedOnly = false,
    onShowModifiedToggle,
    modifiedCount = 0
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search permissions..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="
                                w-full pl-10 pr-4 py-2
                                border border-gray-300 dark:border-gray-600
                                rounded-md
                                bg-white dark:bg-gray-900
                                text-gray-900 dark:text-gray-100
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-blue-500
                                text-sm
                            "
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="w-full sm:w-64">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => onCategoryChange(e.target.value)}
                            className="
                                w-full pl-10 pr-4 py-2
                                border border-gray-300 dark:border-gray-600
                                rounded-md
                                bg-white dark:bg-gray-900
                                text-gray-900 dark:text-gray-100
                                focus:outline-none focus:ring-2 focus:ring-blue-500
                                text-sm
                                appearance-none
                            "
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Show Modified Only Toggle */}
                <div className="flex items-center">
                    <button
                        onClick={onShowModifiedToggle}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                            transition-colors
                            ${showModifiedOnly
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                        `}
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span className="whitespace-nowrap">
                            Modified Only
                            {modifiedCount > 0 && (
                                <span className="ml-1">({modifiedCount})</span>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || categoryFilter || showModifiedOnly) && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>

                    {searchTerm && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                            Search: "{searchTerm}"
                            <button
                                onClick={() => onSearchChange('')}
                                className="hover:text-blue-900 dark:hover:text-blue-200"
                            >
                                ×
                            </button>
                        </span>
                    )}

                    {categoryFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">
                            Category: {categoryFilter}
                            <button
                                onClick={() => onCategoryChange('')}
                                className="hover:text-purple-900 dark:hover:text-purple-200"
                            >
                                ×
                            </button>
                        </span>
                    )}

                    {showModifiedOnly && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs">
                            Modified only
                            <button
                                onClick={onShowModifiedToggle}
                                className="hover:text-orange-900 dark:hover:text-orange-200"
                            >
                                ×
                            </button>
                        </span>
                    )}

                    <button
                        onClick={() => {
                            onSearchChange('');
                            onCategoryChange('');
                            if (showModifiedOnly) onShowModifiedToggle();
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchFilter;
