import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Tag, Calendar, FileType } from 'lucide-react';
import { getAllTags, ALLOWED_FILE_TYPES } from '../../utils/fileManager';
import { motion, AnimatePresence } from 'framer-motion';

const FileSearchFilter = ({
  category,
  onSearch,
  onFilterChange,
  initialFilters = {},
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [selectedTags, setSelectedTags] = useState(initialFilters.tags || []);
  const [selectedFileTypes, setSelectedFileTypes] = useState(initialFilters.fileTypes || []);
  const [dateRange, setDateRange] = useState({
    from: initialFilters.dateFrom || '',
    to: initialFilters.dateTo || ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadAvailableTags();
  }, [category]);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  useEffect(() => {
    // Notify parent of filter changes
    if (onFilterChange) {
      onFilterChange({
        search: searchQuery,
        tags: selectedTags,
        fileTypes: selectedFileTypes,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });
    }
  }, [selectedTags, selectedFileTypes, dateRange, searchQuery, onFilterChange]);

  const loadAvailableTags = async () => {
    const tags = await getAllTags(category);
    setAvailableTags(tags);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleFileTypeToggle = (fileType) => {
    setSelectedFileTypes(prev =>
      prev.includes(fileType)
        ? prev.filter(t => t !== fileType)
        : [...prev, fileType]
    );
  };

  const addCustomTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedFileTypes([]);
    setDateRange({ from: '', to: '' });
    setTagInput('');
  };

  const hasActiveFilters = selectedTags.length > 0 ||
                          selectedFileTypes.length > 0 ||
                          dateRange.from ||
                          dateRange.to ||
                          searchQuery;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Filter Controls */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {[selectedTags.length, selectedFileTypes.length, dateRange.from ? 1 : 0, dateRange.to ? 1 : 0].reduce((a, b) => a + b, 0)}
            </span>
          </button>

          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      {/* Quick Filter Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full"
            >
              <Tag className="h-3 w-3" />
              {tag}
              <button
                onClick={() => handleTagToggle(tag)}
                className="hover:text-orange-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4"
          >
            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Filter by Tags
              </label>
              <div className="space-y-2">
                {/* Available Tags */}
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-500'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag filter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={addCustomTag}
                    disabled={!tagInput.trim() || selectedTags.includes(tagInput.trim())}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* File Types Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileType className="inline h-4 w-4 mr-1" />
                Filter by File Type
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Object.entries(ALLOWED_FILE_TYPES).map(([mimeType, displayName]) => (
                  <button
                    key={mimeType}
                    onClick={() => handleFileTypeToggle(mimeType)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      selectedFileTypes.includes(mimeType)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-500'
                    }`}
                  >
                    {displayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Filter by Upload Date
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                  Active Filters:
                </div>
                <div className="space-y-1 text-xs text-orange-700 dark:text-orange-400">
                  {searchQuery && (
                    <div>Search: "{searchQuery}"</div>
                  )}
                  {selectedTags.length > 0 && (
                    <div>Tags: {selectedTags.join(', ')}</div>
                  )}
                  {selectedFileTypes.length > 0 && (
                    <div>File Types: {selectedFileTypes.map(t => ALLOWED_FILE_TYPES[t]).join(', ')}</div>
                  )}
                  {dateRange.from && (
                    <div>From: {new Date(dateRange.from).toLocaleDateString()}</div>
                  )}
                  {dateRange.to && (
                    <div>To: {new Date(dateRange.to).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileSearchFilter;