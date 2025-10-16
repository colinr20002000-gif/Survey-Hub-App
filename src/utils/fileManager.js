import { supabase } from '../supabaseClient';

// File size limits and allowed types
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/x-compressed': 'ZIP',
  'application/x-7z-compressed': '7Z',
  'application/x-rar-compressed': 'RAR',
  'application/vnd.rar': 'RAR'
};

// Categories for file organization
export const FILE_CATEGORIES = ['Standards & Specs', 'Procedures & Guides', 'Templates', 'AI Chatbot Documents'];

// Test function to check if document_folders table exists
export const testFoldersTable = async () => {
  try {
    console.log('🔧 Testing document_folders table...');
    const { data, error } = await supabase
      .from('document_folders')
      .select('count(*)', { count: 'exact', head: true });

    console.log('🔧 Table test result:', { data, error });
    return { success: !error, error };
  } catch (err) {
    console.error('🔧 Table test failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Validates a file before upload
 * @param {File} file - File object to validate
 * @returns {Object} - Validation result with isValid boolean and error message
 */
export const validateFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
    };
  }

  // All file types are allowed
  console.log(`File validated: ${file.name}, mime type: ${file.type}`);

  return { isValid: true, error: null };
};

/**
 * Generates a unique file path for storage
 * @param {string} category - File category
 * @param {string} folderPath - Folder path within category
 * @param {string} fileName - Original file name
 * @returns {string} - Unique storage path
 */
export const generateStoragePath = (category, folderPath, fileName) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = folderPath ? `${category}/${folderPath}` : category;
  return `${basePath}/${timestamp}_${randomId}_${sanitizedFileName}`;
};

/**
 * Uploads a file to Supabase Storage
 * @param {File} file - File to upload
 * @param {Object} metadata - File metadata (category, folderPath, displayName, description, tags)
 * @returns {Object} - Upload result
 */
export const uploadFile = async (file, metadata) => {
  try {
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const { category, folderPath = '', displayName, description = '', tags = [] } = metadata;

    if (!FILE_CATEGORIES.includes(category)) {
      throw new Error('Invalid file category');
    }

    // Generate unique storage path
    const storagePath = generateStoragePath(category, folderPath, file.name);

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get authenticated user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Save file metadata to database
    const { data: metadataData, error: metadataError } = await supabase
      .from('document_files')
      .insert({
        storage_path: storagePath,
        original_name: file.name,
        display_name: displayName || file.name,
        description,
        category,
        tags,
        folder_path: folderPath,
        file_type: file.type,
        file_size: file.size,
        created_by: user.id
      })
      .select()
      .single();

    if (metadataError) {
      // If metadata insert fails, clean up uploaded file
      await supabase.storage.from('documents').remove([storagePath]);
      throw metadataError;
    }

    return {
      success: true,
      data: {
        id: metadataData.id,
        storagePath,
        ...metadataData
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Downloads a file from storage
 * @param {string} storagePath - Path in storage bucket
 * @param {string} fileName - File name for download
 * @returns {Object} - Download result
 */
export const downloadFile = async (storagePath, fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (error) {
      throw error;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Opens a file in the default system viewer (new tab/window)
 * @param {string} storagePath - Path in storage bucket
 * @returns {Object} - Open result
 */
export const openFileInDefaultViewer = async (storagePath) => {
  try {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (!data?.signedUrl) {
      throw new Error('Failed to generate file URL');
    }

    // Open in new tab - browser/OS will handle with default app
    window.open(data.signedUrl, '_blank');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Deletes a file and its metadata
 * @param {string} fileId - File ID in database
 * @param {string} storagePath - Path in storage bucket
 * @returns {Object} - Delete result
 */
export const deleteFile = async (fileId, storagePath) => {
  try {
    // Clean file ID by removing any "folder-" prefix
    const actualId = fileId.startsWith('folder-') ? fileId.replace('folder-', '') : fileId;

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([storagePath]);

    if (storageError) {
      throw storageError;
    }

    // Delete metadata from database using cleaned ID
    const { error: dbError } = await supabase
      .from('document_files')
      .delete()
      .eq('id', actualId);

    if (dbError) {
      throw dbError;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Deletes multiple files
 * @param {Array} files - Array of file objects with id and storage_path
 * @returns {Object} - Bulk delete result
 */
export const bulkDeleteFiles = async (files) => {
  try {
    console.log('📁 Starting bulk file deletion:', files?.length || 0, 'files');

    const storagePaths = files.map(f => f.storage_path).filter(path => path !== null && path !== undefined);
    // Clean file IDs by removing any "folder-" prefix
    const fileIds = files.map(f => {
      const id = f.id;
      const cleanId = id.startsWith('folder-') ? id.replace('folder-', '') : id;
      if (id !== cleanId) {
        console.log('📁 Cleaned file ID:', { original: id, cleaned: cleanId });
      }
      return cleanId;
    });

    console.log('📁 Storage paths to delete:', storagePaths);
    console.log('📁 File IDs to delete:', fileIds);

    // Delete from storage (only if there are valid storage paths)
    if (storagePaths.length > 0) {
      console.log('📁 Deleting from storage...');
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(storagePaths);

      if (storageError) {
        console.error('📁 Storage deletion error:', storageError);
        throw storageError;
      }
      console.log('📁 Storage deletion successful');
    } else {
      console.log('📁 No storage files to delete (files may not have storage paths)');
    }

    // Delete metadata from database using cleaned IDs
    console.log('📁 Deleting from database...');
    const { error: dbError } = await supabase
      .from('document_files')
      .delete()
      .in('id', fileIds);

    if (dbError) {
      console.error('📁 Database deletion error:', dbError);
      throw dbError;
    }

    console.log('📁 Bulk file deletion completed successfully');
    return {
      success: true,
      deletedCount: files.length
    };
  } catch (error) {
    console.error('📁 Bulk file deletion failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets files across all categories (for global search)
 * @param {Object} options - Query options (search, tags, limit, offset)
 * @returns {Object} - Query result
 */
export const getAllFiles = async (options = {}) => {
  try {
    const { search, tags, limit = 100, offset = 0 } = options;

    console.log('🔍 getAllFiles called with:', { search, tags, limit, offset });

    let query = supabase
      .from('document_files')
      .select('*')
      .order('created_at', { ascending: false });

    // Search in name, description, and original name
    if (search) {
      console.log('🔍 Applying global search filter for:', search);
      query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%,original_name.ilike.%${search}%`);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      console.log('🔍 Applying tag filter for:', tags);
      query = query.overlaps('tags', tags);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('🔍 Error fetching all files:', error);
      throw error;
    }

    console.log('🔍 Found', data?.length || 0, 'files across all categories');
    if (search && data) {
      console.log('🔍 Global search results:', data.map(f => ({
        category: f.category,
        folder_path: f.folder_path,
        display_name: f.display_name,
        original_name: f.original_name
      })));
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('🔍 getAllFiles failed:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Gets files for a specific category
 * @param {string} category - File category
 * @param {Object} options - Query options (folderPath, search, tags, limit, offset)
 * @returns {Object} - Query result
 */
export const getFiles = async (category, options = {}) => {
  try {
    const { folderPath, search, tags, limit = 50, offset = 0 } = options;

    console.log('🔍 getFiles called with:', { category, folderPath, search, tags, limit, offset });

    let query = supabase
      .from('document_files')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    // Filter by folder path
    if (folderPath !== undefined) {
      query = query.eq('folder_path', folderPath);
    }

    // Search in name, description, and original name
    if (search) {
      console.log('🔍 Applying search filter for:', search);
      // Search across display_name, description, and original_name
      query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%,original_name.ilike.%${search}%`);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      console.log('🔍 Applying tag filter for:', tags);
      query = query.overlaps('tags', tags);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('🔍 Error fetching files:', error);
      throw error;
    }

    console.log('🔍 Found', data?.length || 0, 'files');
    if (search && data) {
      console.log('🔍 Search results:', data.map(f => ({
        display_name: f.display_name,
        original_name: f.original_name,
        description: f.description
      })));
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('🔍 getFiles failed:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Gets folder structure for a category
 * @param {string} category - File category
 * @returns {Object} - Folder structure result
 */
export const getFolders = async (category) => {
  try {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('category', category)
      .order('full_path');

    if (error) {
      // If table doesn't exist, return empty array instead of failing
      if (error.message && error.message.includes('relation "document_folders" does not exist')) {
        return {
          success: true,
          data: []
        };
      }
      throw error;
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Creates a new folder
 * @param {string} name - Folder name
 * @param {string} parentPath - Parent folder path
 * @param {string} category - File category
 * @returns {Object} - Create folder result
 */
export const createFolder = async (name, parentPath, category) => {
  try {
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9\s-_]/g, '');
    if (!sanitizedName) {
      throw new Error('Invalid folder name');
    }

    const fullPath = parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName;

    const { data, error } = await supabase
      .from('document_folders')
      .insert({
        name: sanitizedName,
        parent_path: parentPath,
        full_path: fullPath,
        category
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, provide helpful error message
      if (error.message && error.message.includes('relation "document_folders" does not exist')) {
        throw new Error('Database table "document_folders" does not exist. Please run the SQL script in database/create-folders-table.sql');
      }
      throw error;
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Deletes a folder and all its contents
 * @param {string} folderId - Folder ID
 * @param {string} folderPath - Full folder path
 * @returns {Object} - Delete result
 */
export const deleteFolder = async (folderId, folderPath) => {
  try {
    console.log('🗑️ Starting folder deletion:', { folderId, folderPath });

    // Extract the actual UUID from the folder ID (remove "folder-" prefix if present)
    const actualId = folderId.startsWith('folder-') ? folderId.replace('folder-', '') : folderId;
    console.log('🗑️ Cleaned folder ID:', { originalId: folderId, actualId });

    // First, get all files in this folder and subfolders
    console.log('🗑️ Fetching files in folder...');
    const { data: files, error: filesError } = await supabase
      .from('document_files')
      .select('id, storage_path')
      .like('folder_path', `${folderPath}%`)
      .not('storage_path', 'is', null);

    if (filesError) {
      console.error('🗑️ Error fetching files:', filesError);
      throw filesError;
    }

    console.log('🗑️ Found files to delete:', files?.length || 0);
    if (files && files.length > 0) {
      console.log('🗑️ File details:', files.map(f => ({ id: f.id, storage_path: f.storage_path })));
    }

    // Delete all files if any
    if (files && files.length > 0) {
      console.log('🗑️ Deleting files...');
      const deleteResult = await bulkDeleteFiles(files);
      if (!deleteResult.success) {
        console.error('🗑️ File deletion failed:', deleteResult.error);
        throw new Error(deleteResult.error);
      }
      console.log('🗑️ Files deleted successfully');
    }

    // Delete subfolders
    console.log('🗑️ Deleting subfolders...');
    const { error: subfoldersError } = await supabase
      .from('document_folders')
      .delete()
      .like('full_path', `${folderPath}/%`);

    if (subfoldersError) {
      console.error('🗑️ Error deleting subfolders:', subfoldersError);
      throw subfoldersError;
    }
    console.log('🗑️ Subfolders deleted successfully');

    // Delete the folder itself using the cleaned UUID
    console.log('🗑️ Deleting main folder...');
    const { error: folderError } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', actualId);

    if (folderError) {
      console.error('🗑️ Error deleting main folder:', folderError);
      throw folderError;
    }

    console.log('🗑️ Folder deletion completed successfully');
    return { success: true };
  } catch (error) {
    console.error('🗑️ Folder deletion failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates file metadata
 * @param {string} fileId - File ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Update result
 */
export const updateFileMetadata = async (fileId, updates) => {
  try {
    // Clean file ID by removing any "folder-" prefix
    const actualId = fileId.startsWith('folder-') ? fileId.replace('folder-', '') : fileId;

    const { data, error } = await supabase
      .from('document_files')
      .update(updates)
      .eq('id', actualId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets file preview URL (for supported file types)
 * @param {string} storagePath - Path in storage bucket
 * @returns {string|null} - Preview URL or null if not supported
 */
export const getFilePreviewUrl = async (storagePath) => {
  try {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    return data?.signedUrl || null;
  } catch {
    return null;
  }
};

/**
 * Gets all unique tags across all files
 * @param {string} category - File category
 * @returns {Array} - Array of unique tags
 */
export const getAllTags = async (category) => {
  try {
    const { data, error } = await supabase
      .from('document_files')
      .select('tags')
      .eq('category', category)
      .not('tags', 'is', null);

    if (error) {
      throw error;
    }

    const allTags = data?.reduce((acc, file) => {
      if (file.tags && Array.isArray(file.tags)) {
        acc.push(...file.tags);
      }
      return acc;
    }, []) || [];

    return [...new Set(allTags)].sort();
  } catch {
    return [];
  }
};

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets file type icon based on mime type
 * @param {string} mimeType - File mime type
 * @returns {string} - Icon name for display
 */
export const getFileTypeIcon = (mimeType) => {
  const iconMap = {
    'application/pdf': 'file-text',
    'application/msword': 'file-text',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-text',
    'application/vnd.ms-excel': 'file-spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-spreadsheet',
    'application/vnd.ms-powerpoint': 'presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
    'text/plain': 'file-text',
    'text/csv': 'file-spreadsheet',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'application/zip': 'archive',
    'application/x-zip-compressed': 'archive',
    'application/x-compressed': 'archive',
    'application/x-7z-compressed': 'archive',
    'application/x-rar-compressed': 'archive',
    'application/vnd.rar': 'archive'
  };

  return iconMap[mimeType] || 'file';
};