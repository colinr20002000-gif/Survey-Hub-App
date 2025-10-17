import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Grid, List, Settings, ChevronRight, Home, FolderPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getFiles, getAllFiles, getFolders, createFolder, testFoldersTable } from '../../utils/fileManager';
import FileUploadComponent from '../FileUpload/FileUploadComponent';
import FolderManager from './FolderManager';
import FileSearchFilter from './FileSearchFilter';
import FileListView from './FileListView';

const FileManagementSystem = ({
  category,
  onCategoryChange = null,
  isRestoringCategoryFromHistory = false
}) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize selectedFolderPath from localStorage for this category
  const getStoredFolderPath = () => {
    try {
      const stored = localStorage.getItem(`documentHub_folderPath_${category}`);
      return stored || '';
    } catch {
      return '';
    }
  };

  const [selectedFolderPath, setSelectedFolderPath] = useState(getStoredFolderPath());
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    tags: [],
    fileTypes: [],
    dateFrom: '',
    dateTo: ''
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [refreshing, setRefreshing] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previousCategory, setPreviousCategory] = useState(null); // Start as null to trigger initial path restoration
  const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

  const { user } = useAuth();
  const { showErrorModal, showSuccessModal } = useToast();

  // Persist folder path to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`documentHub_folderPath_${category}`, selectedFolderPath);
    } catch (error) {
      console.error('Failed to save folder path to localStorage:', error);
    }
  }, [selectedFolderPath, category]);

  // Push folder navigation to browser history
  useEffect(() => {
    // Don't push to history if we're currently restoring from history, on initial load, or if parent is restoring category
    if (isRestoringFromHistory || previousCategory === null || isRestoringCategoryFromHistory) {
      return;
    }

    // Create history state
    const state = {
      category,
      folderPath: selectedFolderPath,
      timestamp: Date.now()
    };

    // Check if this is a genuine navigation (not a duplicate)
    const currentState = window.history.state;
    if (currentState?.folderPath !== selectedFolderPath || currentState?.category !== category) {
      // Push the new state to browser history
      window.history.pushState(state, '', window.location.pathname + window.location.search);
      console.log('📜 Pushed to history:', state);
    }
  }, [selectedFolderPath, category, isRestoringFromHistory, previousCategory, isRestoringCategoryFromHistory]);

  // Handle browser back/forward buttons for folder navigation
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('⬅️ FileManagementSystem: Browser back/forward detected:', event.state);

      if (event.state && event.state.folderPath !== undefined) {
        setIsRestoringFromHistory(true);

        // Check if category changed - if so, let parent handle it
        if (event.state.category !== category && onCategoryChange) {
          console.log('📂 Category changed in history, parent will handle:', event.state.category);
          // Parent's popstate handler will handle the category change
        } else if (event.state.category === category) {
          // Same category, just update folder path
          console.log('📂 Restoring folder path from history:', event.state.folderPath);
          setSelectedFolderPath(event.state.folderPath);
        }

        // Reset the flag after a short delay to allow state updates
        setTimeout(() => setIsRestoringFromHistory(false), 100);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Push initial state on mount
    if (previousCategory === null) {
      const initialState = {
        category,
        folderPath: selectedFolderPath,
        timestamp: Date.now()
      };
      window.history.replaceState(initialState, '', window.location.pathname + window.location.search);
      console.log('📜 Initialized history with:', initialState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [category, selectedFolderPath, previousCategory, onCategoryChange]);

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
    console.log('📂 loadFiles called with search:', searchFilters.search);

    let filesResult;
    let foldersResult;

    // When searching, search across ALL categories
    if (searchFilters.search) {
      const options = {
        search: searchFilters.search,
        tags: searchFilters.tags,
        limit: 100
      };
      console.log('📂 Using global search across all categories');
      [filesResult, foldersResult] = await Promise.all([
        getAllFiles(options),
        getFolders(category)
      ]);
    } else {
      // When not searching, get files for current category and folder
      const options = {
        folderPath: selectedFolderPath,
        tags: searchFilters.tags,
        limit: 100
      };
      console.log('📂 Using category-specific search for:', category);
      [filesResult, foldersResult] = await Promise.all([
        getFiles(category, options),
        getFolders(category)
      ]);
    }

    if (filesResult.success && foldersResult.success) {
      let filteredFiles = filesResult.data;

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

      // Filter folders that belong to the current directory
      // When searching, don't show folders - only show matching files
      const currentFolders = searchFilters.search ? [] : foldersResult.data.filter(folder => {
        if (selectedFolderPath === '') {
          // Root level: show folders with no parent
          return !folder.parent_path;
        } else {
          // Sub level: show folders whose parent matches current path
          return folder.parent_path === selectedFolderPath;
        }
      });

      // Sort folders and files alphabetically
      const sortedFolders = currentFolders
        .map(folder => ({
          ...folder,
          isFolder: true,
          id: `folder-${folder.id}`,
          display_name: folder.name,
          created_at: folder.created_at,
          full_path: folder.full_path
        }))
        .sort((a, b) => a.display_name.localeCompare(b.display_name));

      const sortedFiles = filteredFiles
        .sort((a, b) => (a.display_name || a.file_name || '').localeCompare(b.display_name || b.file_name || ''));

      // Combine sorted folders and files, with folders first
      const combinedItems = [...sortedFolders, ...sortedFiles];

      setFiles(combinedItems);
      setFolders(foldersResult.data);
    } else {
      showErrorModal('Error loading files', filesResult.error || foldersResult.error);
      setFiles([]);
    }
  }, [category, selectedFolderPath, searchFilters.search, searchFilters.tags, searchFilters.fileTypes, searchFilters.dateFrom, searchFilters.dateTo, showErrorModal]);

  // Reload data when category changes (but preserve folder path if staying in same category)
  useEffect(() => {
    const loadCategoryData = async () => {
      setLoading(true);

      // Get the folder path to use
      let pathToUse = selectedFolderPath;

      // If category changed, restore the stored path for the new category
      if (category !== previousCategory) {
        const storedPath = getStoredFolderPath();
        pathToUse = storedPath;
        setSelectedFolderPath(storedPath);
        setPreviousCategory(category);
      }

      let filesResult;
      let foldersResult;

      // When searching, search across ALL categories
      if (searchFilters.search) {
        const options = {
          search: searchFilters.search,
          tags: searchFilters.tags,
          limit: 100
        };
        [filesResult, foldersResult] = await Promise.all([
          getAllFiles(options),
          getFolders(category)
        ]);
      } else {
        // When not searching, get files for current category using the current/stored folder path
        const options = {
          folderPath: pathToUse,
          tags: searchFilters.tags,
          limit: 100
        };
        [filesResult, foldersResult] = await Promise.all([
          getFiles(category, options),
          getFolders(category)
        ]);
      }

      if (filesResult.success && foldersResult.success) {
        let filteredFiles = filesResult.data;

        // Client-side filtering
        if (searchFilters.fileTypes && searchFilters.fileTypes.length > 0) {
          filteredFiles = filteredFiles.filter(file =>
            searchFilters.fileTypes.includes(file.file_type)
          );
        }

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

        // Filter folders based on current path
        // When searching, don't show folders - only show matching files
        const currentFolders = searchFilters.search ? [] : foldersResult.data.filter(folder => {
          if (pathToUse === '') {
            // Root level: show folders with no parent
            return !folder.parent_path;
          } else {
            // Sub level: show folders whose parent matches current path
            return folder.parent_path === pathToUse;
          }
        });

        // Sort folders and files alphabetically
        const sortedFolders = currentFolders
          .map(folder => ({
            ...folder,
            isFolder: true,
            id: `folder-${folder.id}`,
            display_name: folder.name,
            created_at: folder.created_at,
            full_path: folder.full_path
          }))
          .sort((a, b) => a.display_name.localeCompare(b.display_name));

        const sortedFiles = filteredFiles
          .sort((a, b) => (a.display_name || a.file_name || '').localeCompare(b.display_name || b.file_name || ''));

        // Combine sorted folders and files, with folders first
        const combinedItems = [...sortedFolders, ...sortedFiles];

        setFiles(combinedItems);
        setFolders(foldersResult.data);
      } else {
        showErrorModal('Error loading files', filesResult.error || foldersResult.error);
        setFiles([]);
      }

      setLoading(false);
    };
    loadCategoryData();
  }, [category, searchFilters, showErrorModal]);

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

  const handleFileDelete = async (deletedFile) => {
    console.log('🗑️ UI: File delete called for:', deletedFile);
    if (deletedFile.isFolder) {
      console.log('🗑️ UI: Folder detected, reloading all data...');
      // For folder deletion, reload all data to ensure consistency
      await Promise.all([loadFolders(), loadFiles()]);
      console.log('🗑️ UI: Data reloaded after folder deletion');
    } else {
      console.log('🗑️ UI: Regular file detected, updating local state');
      // For file deletion, just update local state
      setFiles(prev => prev.filter(f => f.id !== deletedFile.id));
    }
  };

  const handleFolderChange = (folderPath) => {
    setSelectedFolderPath(folderPath);
  };

  const handleFolderClick = (folderPath) => {
    console.log('📂 FileManagementSystem: Folder clicked, setting selectedFolderPath to:', folderPath);
    setSelectedFolderPath(folderPath);
  };

  const handleBackButton = () => {
    if (!selectedFolderPath) return;

    // Get parent folder path
    const pathParts = selectedFolderPath.split('/');
    pathParts.pop(); // Remove last folder
    const parentPath = pathParts.join('/');

    console.log('⬅️ Navigating back from:', selectedFolderPath, 'to:', parentPath);
    setSelectedFolderPath(parentPath);
  };

  const handleFilterChange = useCallback((filters) => {
    setSearchFilters(filters);
  }, []);

  const handleSearch = useCallback((searchQuery) => {
    setSearchFilters(prev => ({ ...prev, search: searchQuery }));
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const result = await createFolder(newFolderName, selectedFolderPath, category);
    if (result.success) {
      showSuccessModal('Folder created successfully');
      setNewFolderName('');
      setShowNewFolderInput(false);
      // Reload both folders and files to show the new folder
      await Promise.all([loadFolders(), loadFiles()]);
    } else {
      showErrorModal('Error creating folder', result.error);
    }
  };

  const startNewFolder = () => {
    setShowNewFolderInput(true);
    setNewFolderName('');
  };

  const cancelNewFolder = () => {
    setShowNewFolderInput(false);
    setNewFolderName('');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const actualFiles = files.filter(f => !f.isFolder);
    const folders = files.filter(f => f.isFolder);

    const totalSize = actualFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
    const fileTypes = [...new Set(actualFiles.map(f => f.file_type).filter(type => type))];

    return {
      totalFiles: files.length,
      actualFileCount: actualFiles.length,
      folderCount: folders.length,
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
      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {category}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stats.totalFiles} {stats.totalFiles === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {selectedFolderPath && (
        <div className="flex items-center gap-2 py-3 text-sm text-gray-600 dark:text-gray-400">
          <button
            onClick={() => setSelectedFolderPath('')}
            className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          {selectedFolderPath.split('/').map((folder, index, array) => {
            const path = array.slice(0, index + 1).join('/');
            const isLast = index === array.length - 1;

            return (
              <React.Fragment key={path}>
                <ChevronRight className="h-4 w-4" />
                {isLast ? (
                  <span className="text-gray-900 dark:text-white font-medium">{folder}</span>
                ) : (
                  <button
                    onClick={() => setSelectedFolderPath(path)}
                    className="hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {folder}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {/* Back button - only show when inside a folder */}
          {selectedFolderPath && (
            <button
              onClick={handleBackButton}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Create Folder button */}
          {canManage && (
            <button
              onClick={startNewFolder}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Create Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          )}

          {/* Upload button */}
          {canManage && (
            <>
              {/* Debug: Log current selectedFolderPath */}
              {console.log('📂 FileManagementSystem: Rendering FileUploadComponent with folderPath:', selectedFolderPath, 'folders count:', folders.length)}
              <FileUploadComponent
                category={category}
                folderPath={selectedFolderPath}
                folders={folders}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={(error) => showErrorModal('Upload failed', error)}
              />
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <FileSearchFilter
        category={category}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        initialFilters={searchFilters}
      />

      {/* Search Results Indicator */}
      {searchFilters.search && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            🔍 Searching across <strong>all categories</strong> for: <strong>"{searchFilters.search}"</strong>
            {files.length > 0 ? (
              <span className="ml-2">({files.length} {files.length === 1 ? 'result' : 'results'} found)</span>
            ) : (
              <span className="ml-2">(No results found)</span>
            )}
          </div>
        </div>
      )}

      {/* New Folder Input */}
      <AnimatePresence>
        {showNewFolderInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Create New Folder
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Location: {selectedFolderPath || 'Root Folder'}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="Enter folder name"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={cancelNewFolder}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          onCreateFolder={startNewFolder}
          onFolderClick={handleFolderClick}
          canManage={canManage}
          viewMode={viewMode}
          isSearching={!!searchFilters.search}
        />
      </motion.div>
    </div>
  );
};

export default FileManagementSystem;