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
  AlertTriangle
} from 'lucide-react';
import {
  downloadFile,
  deleteFile,
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
  canManage = false,
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
    const result = await deleteFile(file.id, file.storage_path);
    if (result.success) {
      showSuccessModal('File deleted successfully');
      setDeleteConfirmation(null);
      if (onFileDelete) {
        onFileDelete(file);
      }
    } else {
      showErrorModal('Delete failed', result.error);
    }
  };

  const handleBulkDelete = async () => {
    const filesToDelete = files.filter(f => selectedFiles.has(f.id));
    const result = await bulkDeleteFiles(filesToDelete);
    if (result.success) {
      showSuccessModal(`${result.deletedCount} files deleted successfully`);
      setSelectedFiles(new Set());
      setBulkDeleteConfirmation(false);
      if (onFileDelete) {
        filesToDelete.forEach(f => onFileDelete(f));
      }
    } else {
      showErrorModal('Bulk delete failed', result.error);
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
    return fileType.startsWith('image/') || fileType === 'application/pdf';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (file) => {
    return file.uploaded_by_user?.raw_user_meta_data?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading files...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No files found</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {canManage ? 'Upload some files to get started.' : 'No files have been uploaded yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with bulk actions */}
      {canManage && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllFiles}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              {selectedFiles.size === files.length && files.length > 0 ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : `${files.length} files`}
            </span>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkDeleteConfirmation(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* File list */}
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
            canManage={canManage}
            getFileIcon={getFileIcon}
            formatDate={formatDate}
            getUserName={getUserName}
          />
        ))}
      </div>

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
  canManage,
  getFileIcon,
  formatDate,
  getUserName
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Checkbox */}
      {canManage && (
        <button
          onClick={onSelect}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          {selected ? (
            <CheckSquare className="h-5 w-5 text-orange-500" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
      )}

      {/* File icon */}
      <div className="text-gray-600 dark:text-gray-400">
        {getFileIcon(file.file_type)}
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

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {getUserName(file)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(file.created_at)}
          </span>
          <span>{formatFileSize(file.file_size)}</span>
        </div>

        {file.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {file.description}
          </p>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 text-xs rounded-full"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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

    if (file.file_type.startsWith('image/') || file.file_type === 'application/pdf') {
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
              {file.file_type.startsWith('image/') ? (
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