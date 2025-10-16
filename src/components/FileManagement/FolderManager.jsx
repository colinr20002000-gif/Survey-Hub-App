import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { createFolder, deleteFolder, getFolders } from '../../utils/fileManager';
import { useToast } from '../../contexts/ToastContext';

const FolderManager = ({ category, onFolderChange, selectedFolderPath = '', canManage = false }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderParent, setNewFolderParent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const { showSuccessModal, showErrorModal } = useToast();

  useEffect(() => {
    loadFolders();
  }, [category]);

  const loadFolders = async () => {
    setLoading(true);
    const result = await getFolders(category);
    if (result.success) {
      setFolders(result.data);
      // Auto-expand folders that contain the selected path
      if (selectedFolderPath) {
        const pathParts = selectedFolderPath.split('/');
        const newExpanded = new Set();
        let currentPath = '';
        pathParts.forEach(part => {
          if (currentPath) {
            newExpanded.add(currentPath);
          }
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          newExpanded.add(currentPath);
        });
        setExpandedFolders(newExpanded);
      }
    } else {
      showErrorModal('Error loading folders', result.error);
    }
    setLoading(false);
  };

  // Build hierarchical folder structure
  const buildFolderTree = (folders) => {
    const folderMap = new Map();
    const rootFolders = [];

    // Create folder objects
    folders.forEach(folder => {
      folderMap.set(folder.full_path, {
        ...folder,
        children: []
      });
    });

    // Build hierarchy
    folders.forEach(folder => {
      const folderObj = folderMap.get(folder.full_path);
      if (folder.parent_path) {
        const parent = folderMap.get(folder.parent_path);
        if (parent) {
          parent.children.push(folderObj);
        } else {
          rootFolders.push(folderObj);
        }
      } else {
        rootFolders.push(folderObj);
      }
    });

    return rootFolders;
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const selectFolder = (folderPath) => {
    if (onFolderChange) {
      onFolderChange(folderPath);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const result = await createFolder(newFolderName, newFolderParent, category);
    if (result.success) {
      showSuccessModal('Folder created successfully');
      setNewFolderName('');
      setNewFolderParent('');
      setShowNewFolderInput(false);
      loadFolders();
    } else {
      showErrorModal('Error creating folder', result.error);
    }
  };

  const handleDeleteFolder = async (folder) => {
    const result = await deleteFolder(folder.id, folder.full_path);
    if (result.success) {
      showSuccessModal('Folder deleted successfully');
      setDeleteConfirmation(null);
      loadFolders();
    } else {
      showErrorModal('Error deleting folder', result.error);
      setDeleteConfirmation(null);
    }
  };

  const startNewFolder = (parentPath = '') => {
    setNewFolderParent(parentPath);
    setShowNewFolderInput(true);
    setNewFolderName('');
  };

  const cancelNewFolder = () => {
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderParent('');
  };

  const folderTree = buildFolderTree(folders);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Folders
        </h3>
        {canManage && (
          <button
            onClick={() => startNewFolder()}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-gray-500">Loading folders...</div>
      ) : (
        <div className="space-y-1">
          {/* Root option */}
          <div
            onClick={() => selectFolder('')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedFolderPath === ''
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>Root Folder</span>
          </div>

          {/* Folder tree */}
          {folderTree.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              expandedFolders={expandedFolders}
              selectedFolderPath={selectedFolderPath}
              onToggle={toggleFolder}
              onSelect={selectFolder}
              onDelete={canManage ? (folder) => setDeleteConfirmation(folder) : null}
              onCreateSubfolder={canManage ? startNewFolder : null}
            />
          ))}

          {/* New folder input */}
          {showNewFolderInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent Folder
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {newFolderParent || 'Root Folder'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Enter folder name"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelNewFolder}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-3 py-1 text-sm text-green-600 hover:text-green-800 disabled:text-gray-400"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Folder
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the folder "{deleteConfirmation.name}"?
                This will also delete all files and subfolders within it. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteFolder(deleteConfirmation)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual folder item component
const FolderItem = ({
  folder,
  level,
  expandedFolders,
  selectedFolderPath,
  onToggle,
  onSelect,
  onDelete,
  onCreateSubfolder
}) => {
  const hasChildren = folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.full_path);
  const isSelected = selectedFolderPath === folder.full_path;
  const paddingLeft = level * 20 + 12;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 pl-3 pr-2 rounded-lg cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(folder.full_path);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Folder icon and name */}
        <div
          onClick={() => onSelect(folder.full_path)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <Folder className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{folder.name}</span>
        </div>

        {/* Action buttons - Always visible on mobile (md:opacity-0), visible on hover for desktop */}
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onCreateSubfolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder(folder.full_path);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Create subfolder"
            >
              <FolderPlus className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-red-600"
              title="Delete folder"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {folder.children.map(childFolder => (
              <FolderItem
                key={childFolder.id}
                folder={childFolder}
                level={level + 1}
                expandedFolders={expandedFolders}
                selectedFolderPath={selectedFolderPath}
                onToggle={onToggle}
                onSelect={onSelect}
                onDelete={onDelete}
                onCreateSubfolder={onCreateSubfolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FolderManager;