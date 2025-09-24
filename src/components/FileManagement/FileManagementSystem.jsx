import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Grid, List, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getFiles, getFolders } from '../../utils/fileManager';
import FileUploadComponent from '../FileUpload/FileUploadComponent';
import FolderManager from './FolderManager';
import FileSearchFilter from './FileSearchFilter';
import FileListView from './FileListView';

const FileManagementSystem = ({ category }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    tags: [],
    fileTypes: [],
    dateFrom: '',
    dateTo: ''
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { showErrorModal } = useToast();

  // Check if user can manage files (Admin or Super Admin)
  const canManage = user && ['Admin', 'Super Admin'].includes(user.privilege);

  const loadFolders = useCallback(async () => {
    const result = await getFolders(category);
    if (result.success) {
      setFolders(result.data);
    } else {
      showErrorModal('Error loading folders', result.error);
    }
  }, [category, showErrorModal]);

  const loadFiles = useCallback(async () => {
    const options = {
      folderPath: selectedFolderPath,
      search: searchFilters.search,
      tags: searchFilters.tags,
      limit: 100
    };

    const result = await getFiles(category, options);
    if (result.success) {
      let filteredFiles = result.data;

      // Client-side filtering for file types
      if (searchFilters.fileTypes && searchFilters.fileTypes.length > 0) {
        filteredFiles = filteredFiles.filter(file =>
          searchFilters.fileTypes.includes(file.file_type)
        );
      }

      // Client-side filtering for date range
      if (searchFilters.dateFrom || searchFilters.dateTo) {
        filteredFiles = filteredFiles.filter(file => {
          const fileDate = new Date(file.created_at);
          const fromDate = searchFilters.dateFrom ? new Date(searchFilters.dateFrom) : null;
          const toDate = searchFilters.dateTo ? new Date(searchFilters.dateTo + 'T23:59:59') : null;

          if (fromDate && fileDate < fromDate) return false;
          if (toDate && fileDate > toDate) return false;
          return true;
        });
      }

      setFiles(filteredFiles);
    } else {
      showErrorModal('Error loading files', result.error);
      setFiles([]);
    }
  }, [category, selectedFolderPath, searchFilters.search, searchFilters.tags, searchFilters.fileTypes, searchFilters.dateFrom, searchFilters.dateTo, showErrorModal]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        loadFolders(),
        loadFiles()
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, [category]);

  // Reload files when dependencies change
  useEffect(() => {
    if (!loading) { // Only reload if not initial loading
      loadFiles();
    }
  }, [selectedFolderPath, searchFilters.search, searchFilters.tags, searchFilters.fileTypes, searchFilters.dateFrom, searchFilters.dateTo]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadFolders(),
      loadFiles()
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUploadSuccess = (fileData) => {
    // Add the new file to the current view if it belongs here
    if (fileData.folder_path === selectedFolderPath) {
      setFiles(prev => [fileData, ...prev]);
    }
  };

  const handleFileUpdate = (updatedFile) => {
    setFiles(prev => prev.map(f =>
      f.id === updatedFile.id ? updatedFile : f
    ));
  };

  const handleFileDelete = (deletedFile) => {
    setFiles(prev => prev.filter(f => f.id !== deletedFile.id));
  };

  const handleFolderChange = (folderPath) => {
    setSelectedFolderPath(folderPath);
  };

  const handleFilterChange = useCallback((filters) => {
    setSearchFilters(filters);
  }, []);

  const handleSearch = useCallback((searchQuery) => {
    setSearchFilters(prev => ({ ...prev, search: searchQuery }));
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
    const fileTypes = [...new Set(files.map(f => f.file_type))];

    return {
      totalFiles: files.length,
      totalSize,
      fileTypes: fileTypes.length,
      currentFolder: selectedFolderPath || 'Root Folder'
    };
  }, [files, selectedFolderPath]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {category}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats.totalFiles} files • {formatBytes(stats.totalSize)} • {stats.currentFolder}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Upload button */}
          {canManage && (
            <FileUploadComponent
              category={category}
              folderPath={selectedFolderPath}
              folders={folders}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={(error) => showErrorModal('Upload failed', error)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Folder Manager */}
          <FolderManager
            category={category}
            selectedFolderPath={selectedFolderPath}
            onFolderChange={handleFolderChange}
            canManage={canManage}
          />

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Quick Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Files:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.totalFiles}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Size:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatBytes(stats.totalSize)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">File Types:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.fileTypes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Filters */}
          <FileSearchFilter
            category={category}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            initialFilters={searchFilters}
          />

          {/* File List */}
          <motion.div
            key={`${selectedFolderPath}-${JSON.stringify(searchFilters)}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FileListView
              files={files}
              loading={loading}
              onFileUpdate={handleFileUpdate}
              onFileDelete={handleFileDelete}
              canManage={canManage}
              viewMode={viewMode}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FileManagementSystem;