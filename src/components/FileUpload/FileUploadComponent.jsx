import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  File,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Tag
} from 'lucide-react';
import { uploadFile, validateFile, ALLOWED_FILE_TYPES, formatFileSize } from '../../utils/fileManager';

const FileUploadComponent = ({
  category,
  folderPath = '',
  folders = [],
  onUploadSuccess,
  onUploadError,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Debug: Log when folderPath prop changes
  useEffect(() => {
    console.log('📂 FileUploadComponent: folderPath prop changed to:', folderPath, 'folders count:', folders.length);
  }, [folderPath, folders]);

  // Handle file processing - defined FIRST so other callbacks can reference it
  const handleFiles = useCallback((newFiles) => {
    console.log('📁 Upload: Current folderPath prop:', folderPath);
    console.log('📁 Upload: Available folders:', folders);

    const processedFiles = newFiles.map(file => {
      const validation = validateFile(file);
      const fileData = {
        file,
        id: Math.random().toString(36).substring(7),
        displayName: file.name,
        description: '',
        tags: [],
        selectedFolderPath: folderPath,
        validation,
        status: 'pending' // pending, uploading, success, error
      };

      console.log('📁 Upload: Processed file with selectedFolderPath:', fileData.selectedFolderPath);
      return fileData;
    });

    setFiles(prev => [...prev, ...processedFiles]);
    setIsModalOpen(true);
  }, [folderPath, folders]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  }, [handleFiles]);

  const updateFile = useCallback((fileId, updates) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, ...updates } : f
    ));
  }, []);

  const removeFile = useCallback((fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const addTag = useCallback((fileId, tag) => {
    if (!tag.trim()) return;
    updateFile(fileId, {
      tags: files.find(f => f.id === fileId)?.tags.includes(tag.trim())
        ? files.find(f => f.id === fileId).tags
        : [...(files.find(f => f.id === fileId)?.tags || []), tag.trim()]
    });
  }, [files, updateFile]);

  const removeTag = useCallback((fileId, tagToRemove) => {
    updateFile(fileId, {
      tags: files.find(f => f.id === fileId)?.tags.filter(tag => tag !== tagToRemove) || []
    });
  }, [files, updateFile]);

  const uploadFiles = async () => {
    const validFiles = files.filter(f => f.validation.isValid);
    if (validFiles.length === 0) return;

    setUploading(true);
    let errorCount = 0;

    for (const fileData of validFiles) {
      try {
        updateFile(fileData.id, { status: 'uploading' });

        const result = await uploadFile(fileData.file, {
          category,
          folderPath: fileData.selectedFolderPath,
          displayName: fileData.displayName,
          description: fileData.description,
          tags: fileData.tags
        });

        if (result.success) {
          updateFile(fileData.id, { status: 'success' });
          if (onUploadSuccess) {
            onUploadSuccess(result.data);
          }
        } else {
          updateFile(fileData.id, { status: 'error', error: result.error });
          errorCount++;
          if (onUploadError) {
            onUploadError(result.error);
          }
        }
      } catch (error) {
        updateFile(fileData.id, { status: 'error', error: error.message });
        errorCount++;
        if (onUploadError) {
          onUploadError(error.message);
        }
      }
    }

    setUploading(false);

    // Close modal after a delay if all uploads were successful
    if (errorCount === 0) {
      setTimeout(() => {
        setIsModalOpen(false);
        setFiles([]);
      }, 2000);
    }
  };

  const closeModal = () => {
    if (!uploading) {
      setIsModalOpen(false);
      setFiles([]);
    }
  };

  return (
    <>
      {/* Upload Trigger Button */}
      <button
        onClick={() => {
          console.log('📂 FileUploadComponent: Upload button clicked, current folderPath:', folderPath);
          setIsModalOpen(true);
        }}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors ${className}`}
      >
        <Upload className="h-4 w-4" />
        Upload Files
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Upload Files to {category}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Default location: {folderPath || 'Root folder'}
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Drag and Drop Area */}
              <div className="p-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
                  }`}
                  onDrag={handleDrag}
                  onDragStart={handleDrag}
                  onDragEnd={handleDrag}
                  onDragOver={handleDrag}
                  onDragEnter={handleDragIn}
                  onDragLeave={handleDragOut}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    All file types supported (max 50MB per file)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    disabled={uploading}
                  >
                    Browse Files
                  </button>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="px-6 pb-6 max-h-96 overflow-y-auto">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Files to Upload ({files.length})
                  </h3>

                  <div className="space-y-4">
                    {files.map((fileData) => (
                      <FileUploadItem
                        key={fileData.id}
                        fileData={fileData}
                        folders={folders}
                        onUpdate={(updates) => updateFile(fileData.id, updates)}
                        onRemove={() => removeFile(fileData.id)}
                        onAddTag={(tag) => addTag(fileData.id, tag)}
                        onRemoveTag={(tag) => removeTag(fileData.id, tag)}
                        uploading={uploading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              {files.length > 0 && (
                <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {files.filter(f => f.validation.isValid).length} of {files.length} files ready to upload
                  </div>
                  <div className="flex gap-3">
                    {!uploading && (
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={uploadFiles}
                      disabled={uploading || files.filter(f => f.validation.isValid).length === 0}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Files
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Individual file upload item component
const FileUploadItem = ({
  fileData,
  folders,
  onUpdate,
  onRemove,
  onAddTag,
  onRemoveTag,
  uploading
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      onAddTag(tagInput.trim());
      setTagInput('');
    }
  };

  const getStatusIcon = () => {
    switch (fileData.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${
      !fileData.validation.isValid
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        : fileData.status === 'success'
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
        : 'border-gray-200 dark:border-gray-600'
    }`}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}

        <div className="flex-1 min-w-0">
          {/* File info */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {fileData.file.name}
            </span>
            <span className="text-sm text-gray-500">
              ({formatFileSize(fileData.file.size)})
            </span>
          </div>

          {/* Validation error */}
          {!fileData.validation.isValid && (
            <div className="text-red-600 text-sm mb-2">
              {fileData.validation.error}
            </div>
          )}

          {/* Upload error */}
          {fileData.status === 'error' && fileData.error && (
            <div className="text-red-600 text-sm mb-2">
              Upload failed: {fileData.error}
            </div>
          )}

          {/* Success message */}
          {fileData.status === 'success' && (
            <div className="text-green-600 text-sm mb-2">
              Upload completed successfully!
            </div>
          )}

          {/* Form fields - only show if file is valid and not uploaded yet */}
          {fileData.validation.isValid && ['pending', 'error'].includes(fileData.status) && (
            <div className="space-y-3">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fileData.displayName}
                  onChange={(e) => onUpdate({ displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="Enter display name"
                  disabled={uploading}
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder
                </label>
                <select
                  value={fileData.selectedFolderPath}
                  onChange={(e) => onUpdate({ selectedFolderPath: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={uploading}
                >
                  <option value="">Root folder</option>
                  {/* Show current folder first if it's not in the folders list */}
                  {fileData.selectedFolderPath && !folders.find(f => f.full_path === fileData.selectedFolderPath) && (
                    <option value={fileData.selectedFolderPath}>
                      {fileData.selectedFolderPath} (current)
                    </option>
                  )}
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.full_path}>
                      {folder.full_path}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={fileData.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="Enter file description"
                  rows="2"
                  disabled={uploading}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {fileData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        onClick={() => onRemoveTag(tag)}
                        className="hover:text-orange-600"
                        disabled={uploading}
                      >
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
                    onKeyPress={handleTagKeyPress}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Add tags (press Enter)"
                    disabled={uploading}
                  />
                  <button
                    onClick={() => {
                      if (tagInput.trim()) {
                        onAddTag(tagInput.trim());
                        setTagInput('');
                      }
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg text-sm"
                    disabled={uploading || !tagInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remove button */}
        {!uploading && ['pending', 'error'].includes(fileData.status) && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploadComponent;