import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  Trash2,
  Edit3,
  Eye,
  MoreVertical,
  FileText,
  Image,
  Archive,
  FileSpreadsheet,
  Presentation,
  Tag,
  Calendar,
  User,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  Folder
} from 'lucide-react';
import {
  downloadFile,
  deleteFile,
  deleteFolder,
  bulkDeleteFiles,
  updateFileMetadata,
  formatFileSize,
  getFileTypeIcon,
  getFilePreviewUrl
} from '../../utils/fileManager';
import { useToast } from '../../contexts/ToastContext';

const FileListView = ({
  files,
  loading,
  onFileUpdate,
  onFileDelete,
  onCreateFolder,
  onFolderClick,
  canManage = false,
  viewMode = 'list',
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [editingFile, setEditingFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
  const { showSuccessModal, showErrorModal } = useToast();

  const handleFileDownload = async (file) => {
    const result = await downloadFile(file.storage_path, file.display_name);
    if (!result.success) {
      showErrorModal('Download failed', result.error);
    }
  };

  const handleFileDelete = async (file) => {
    let result;

    if (file.isFolder) {
      // Handle folder deletion
      result = await deleteFolder(file.id, file.full_path);
      if (result.success) {
        showSuccessModal('Folder deleted successfully');
      }
    } else {
      // Handle file deletion
      result = await deleteFile(file.id, file.storage_path);
      if (result.success) {
        showSuccessModal('File deleted successfully');
      }
    }

    if (result.success) {
      setDeleteConfirmation(null);
      if (onFileDelete) {
        onFileDelete(file);
      }
    } else {
      showErrorModal('Delete failed', result.error);
    }
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = files.filter(f => selectedFiles.has(f.id));
    const filesToDelete = itemsToDelete.filter(f => !f.isFolder);
    const foldersToDelete = itemsToDelete.filter(f => f.isFolder);

    let allSuccessful = true;
    let totalDeleted = 0;
    let errors = [];

    // Delete files first
    if (filesToDelete.length > 0) {
      const fileResult = await bulkDeleteFiles(filesToDelete);
      if (fileResult.success) {
        totalDeleted += fileResult.deletedCount;
      } else {
        allSuccessful = false;
        errors.push(`File deletion: ${fileResult.error}`);
      }
    }

    // Delete folders one by one
    for (const folder of foldersToDelete) {
      const folderResult = await deleteFolder(folder.id, folder.full_path);
      if (folderResult.success) {
        totalDeleted += 1;
      } else {
        allSuccessful = false;
        errors.push(`Folder "${folder.display_name}": ${folderResult.error}`);
      }
    }

    if (allSuccessful) {
      const message = totalDeleted === 1 ? 'item deleted successfully' : `${totalDeleted} items deleted successfully`;
      showSuccessModal(message);
      setSelectedFiles(new Set());
      setBulkDeleteConfirmation(false);
      if (onFileDelete) {
        itemsToDelete.forEach(f => onFileDelete(f));
      }
    } else {
      const errorMessage = errors.length > 0 ? errors.join(', ') : 'Some items could not be deleted';
      showErrorModal('Bulk delete partially failed', errorMessage);
      // Still clear selection and refresh for any successful deletions
      setSelectedFiles(new Set());
      setBulkDeleteConfirmation(false);
      if (onFileDelete && totalDeleted > 0) {
        itemsToDelete.forEach(f => onFileDelete(f));
      }
    }
  };

  const handleFileEdit = async (file, updates) => {
    const result = await updateFileMetadata(file.id, updates);
    if (result.success) {
      showSuccessModal('File updated successfully');
      setEditingFile(null);
      if (onFileUpdate) {
        onFileUpdate({ ...file, ...updates });
      }
    } else {
      showErrorModal('Update failed', result.error);
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const getFileIcon = (fileType) => {
    const iconName = getFileTypeIcon(fileType);
    const iconMap = {
      'file-text': FileText,
      'file-spreadsheet': FileSpreadsheet,
      'presentation': Presentation,
      'image': Image,
      'archive': Archive,
      'file': FileText
    };
    const Icon = iconMap[iconName] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  const canPreview = (fileType) => {
    return fileType && (fileType.startsWith('image/') || fileType === 'application/pdf');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (file) => {
    return file.uploaded_by_user?.raw_user_meta_data?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="relative mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-orange-500 absolute top-0 left-0"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading files...</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Please wait while we fetch your files</p>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center py-16 px-6">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No files found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {canManage
              ? 'Get started by uploading your first file using the upload button in the toolbar above, or create folders to organize your content.'
              : 'No files have been uploaded to this section yet. Check back later for updates.'}
          </p>
          {canManage && (
            <div className="flex justify-center">
              <button
                onClick={onCreateFolder}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
                </svg>
                Create Folder
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with bulk actions */}
      {canManage && selectedFiles.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedFiles.size} item{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkDeleteConfirmation(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* File list */}
      {viewMode === 'list' ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {files.map((file) => (
            <FileListItem
              key={file.id}
              file={file}
              selected={selectedFiles.has(file.id)}
              onSelect={() => toggleFileSelection(file.id)}
              onDownload={() => handleFileDownload(file)}
              onEdit={canManage ? () => setEditingFile(file) : null}
              onDelete={canManage ? () => setDeleteConfirmation(file) : null}
              onPreview={canPreview(file.file_type) ? () => setPreviewFile(file) : null}
              onFolderClick={onFolderClick}
              canManage={canManage}
              getFileIcon={getFileIcon}
              formatDate={formatDate}
              getUserName={getUserName}
              viewMode="list"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
          {files.map((file) => (
            <FileCardItem
              key={file.id}
              file={file}
              selected={selectedFiles.has(file.id)}
              onSelect={() => toggleFileSelection(file.id)}
              onDownload={() => handleFileDownload(file)}
              onEdit={canManage ? () => setEditingFile(file) : null}
              onDelete={canManage ? () => setDeleteConfirmation(file) : null}
              onPreview={canPreview(file.file_type) ? () => setPreviewFile(file) : null}
              onFolderClick={onFolderClick}
              canManage={canManage}
              getFileIcon={getFileIcon}
              formatDate={formatDate}
              getUserName={getUserName}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingFile && (
          <FileEditModal
            file={editingFile}
            onSave={(updates) => handleFileEdit(editingFile, updates)}
            onClose={() => setEditingFile(null)}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onDownload={() => handleFileDownload(previewFile)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmation && (
          <ConfirmationModal
            title="Delete File"
            message={`Are you sure you want to delete "${deleteConfirmation.display_name}"? This action cannot be undone.`}
            confirmLabel="Delete"
            confirmVariant="danger"
            onConfirm={() => handleFileDelete(deleteConfirmation)}
            onCancel={() => setDeleteConfirmation(null)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <AnimatePresence>
        {bulkDeleteConfirmation && (
          <ConfirmationModal
            title="Delete Files"
            message={`Are you sure you want to delete ${selectedFiles.size} selected files? This action cannot be undone.`}
            confirmLabel="Delete All"
            confirmVariant="danger"
            onConfirm={handleBulkDelete}
            onCancel={() => setBulkDeleteConfirmation(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual file list item
const FileListItem = ({
  file,
  selected,
  onSelect,
  onDownload,
  onEdit,
  onDelete,
  onPreview,
  onFolderClick,
  canManage,
  getFileIcon,
  formatDate,
  getUserName,
  viewMode = 'list'
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (file.isFolder && onFolderClick) {
      onFolderClick(file.full_path);
    } else if (onPreview) {
      onPreview();
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 group ${
        selected ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''
      } ${file.isFolder ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Checkbox */}
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex-shrink-0 p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {selected ? (
            <CheckSquare className="h-5 w-5 text-orange-500" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
      )}

      {/* File icon */}
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
        {file.file_type && file.file_type.startsWith('image/') ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
            <img
              src={getFilePreviewUrl(file.storage_path)}
              alt={file.display_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-400" style={{ display: 'none' }}>
              {file.isFolder ? <Folder className="w-8 h-8" /> : getFileIcon(file.file_type)}
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400">
            {file.isFolder ? <Folder className="w-6 h-6 text-blue-500" /> : getFileIcon(file.file_type)}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {file.display_name}
          </h4>
          {onPreview && (
            <button
              onClick={onPreview}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5 min-w-0">
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{getUserName(file)}</span>
          </span>
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(file.created_at)}
          </span>
          <span className="flex-shrink-0 font-medium text-gray-600 dark:text-gray-300">
            {file.isFolder ? 'Folder' : formatFileSize(file.file_size)}
          </span>
        </div>

        {file.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {file.description}
          </p>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {file.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-md border border-blue-200 dark:border-blue-800"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                +{file.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
              onBlur={() => setShowActions(false)}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onDownload();
                    setShowActions(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>

                {onPreview && (
                  <button
                    onClick={() => {
                      onPreview();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Individual file card item for grid view
const FileCardItem = ({
  file,
  selected,
  onSelect,
  onDownload,
  onEdit,
  onDelete,
  onPreview,
  onFolderClick,
  canManage,
  getFileIcon,
  formatDate,
  getUserName
}) => {
  const [showActions, setShowActions] = useState(false);

  const getFileTypeColor = (fileType) => {
    if (fileType.startsWith('image/')) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    if (fileType.includes('pdf')) return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
    if (fileType.includes('word') || fileType.includes('document')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 hover:shadow-sm group cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={file.isFolder ? () => onFolderClick && onFolderClick(file.full_path) : onPreview}
    >
      {/* Selection checkbox */}
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {selected ? (
            <CheckSquare className="h-4 w-4 text-blue-500" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
      )}

      {/* Actions menu */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>

        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30"
            >
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                    setShowActions(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>

                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3">
        {/* File icon/preview */}
        <div className="flex items-center justify-center h-16 mb-3">
          {file.file_type && file.file_type.startsWith('image/') ? (
            <div className="w-full h-full rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img
                src={getFilePreviewUrl(file.storage_path)}
                alt={file.display_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full flex items-center justify-center" style={{ display: 'none' }}>
                {file.isFolder ? <Folder className="w-12 h-12 text-blue-500" /> : getFileIcon(file.file_type)}
              </div>
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">
              {file.isFolder ? <Folder className="w-12 h-12 text-blue-500" /> : getFileIcon(file.file_type)}
            </div>
          )}
        </div>

        {/* File name */}
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.display_name}>
            {file.display_name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {file.isFolder ? 'Folder' : formatFileSize(file.file_size)}
          </p>
        </div>
      </div>
    </div>
  );
};

// File edit modal
const FileEditModal = ({ file, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState(file.display_name);
  const [description, setDescription] = useState(file.description || '');
  const [tags, setTags] = useState(file.tags || []);
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    onSave({
      display_name: displayName,
      description,
      tags
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Edit File
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// File preview modal
const FilePreviewModal = ({ file, onClose, onDownload }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      const url = await getFilePreviewUrl(file.storage_path);
      setPreviewUrl(url);
      setLoading(false);
    };

    if (file.file_type && (file.file_type.startsWith('image/') || file.file_type === 'application/pdf')) {
      loadPreview();
    } else {
      setLoading(false);
    }
  }, [file]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {file.display_name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : previewUrl ? (
            <div className="text-center">
              {file.file_type && file.file_type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={file.display_name}
                  className="max-w-full max-h-80 mx-auto rounded-lg"
                />
              ) : file.file_type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-80 border-0 rounded-lg"
                  title={file.display_name}
                />
              ) : (
                <div className="text-gray-500 dark:text-gray-400 py-12">
                  Preview not available for this file type
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 py-12 text-center">
              Unable to load preview
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Confirmation modal
const ConfirmationModal = ({ title, message, confirmLabel, confirmVariant, onConfirm, onCancel }) => (
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
          {title}
        </h3>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 text-white rounded-lg transition-colors ${
            confirmVariant === 'danger'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default FileListView;