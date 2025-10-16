# File Management System Setup

This document provides setup instructions for the comprehensive file management system implemented in your React application.

## Overview

The file management system provides:
- **File Upload**: Drag-and-drop interface with metadata and tagging
- **Folder Management**: Hierarchical folder structure with Admin controls
- **Search & Filter**: Powerful search by name, description, tags, file type, and date
- **File Preview**: Preview for images and PDFs
- **Bulk Actions**: Multi-select and bulk delete for Admin users
- **Access Control**: Admin/Super Admin can upload/delete, all users can download

## Database Setup

1. **Run the SQL setup script** in your Supabase project:
   ```sql
   -- Execute the contents of database/file-management-setup.sql
   ```

2. **Verify the setup**:
   - Check that the `documents` bucket was created in Storage
   - Verify tables: `document_files` and `document_folders`
   - Confirm RLS policies are active

## Required Environment Variables

Make sure these are set in your `.env` file or deployment environment:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key  # Optional, for admin operations
```

## File Structure

The system consists of these main components:

### Core Files
- `src/utils/fileManager.js` - Core file management utilities
- `src/components/FileManagement/FileManagementSystem.jsx` - Main container component
- `src/components/FileUpload/FileUploadComponent.jsx` - Drag-and-drop upload interface
- `src/components/FileManagement/FolderManager.jsx` - Folder hierarchy management
- `src/components/FileManagement/FileSearchFilter.jsx` - Search and filtering
- `src/components/FileManagement/FileListView.jsx` - File listing and preview

### Database Schema
- `document_files` table - File metadata and organization
- `document_folders` table - Folder structure
- `documents` bucket - File storage in Supabase Storage

## Features by User Role

### All Authenticated Users
- View and download all files
- Search and filter files
- Browse folder structure
- Preview images and PDFs

### Admin & Super Admin Users
- Upload files with drag-and-drop
- Create, rename, and delete folders
- Edit file metadata and tags
- Delete individual or multiple files
- Bulk file operations

## File Upload Specifications

### Supported File Types
- **Documents**: PDF, DOC, DOCX, TXT
- **Spreadsheets**: XLS, XLSX, CSV
- **Presentations**: PPT, PPTX
- **Images**: JPG, PNG, GIF, WEBP
- **Archives**: ZIP, RAR

### File Size Limit
- Maximum file size: 50MB per file
- Configurable in `src/utils/fileManager.js`

### Upload Process
1. Files are validated for type and size
2. Unique storage paths are generated
3. Files are uploaded to Supabase Storage
4. Metadata is saved to database
5. Success/failure notifications are shown

## Folder Organization

### Default Structure
```
Standards & Specs/
├── Standards/
│   ├── 2024/
│   └── 2025/
└── ...

Procedures/
├── Safety/
├── Quality/
└── ...

Templates/
├── Reports/
├── Forms/
└── ...
```

### Folder Operations
- Create nested folder structures
- Move files between folders during upload
- Delete folders (removes all contents)
- Rename folders (Admin only)

## Search and Filtering

### Search Capabilities
- **Text Search**: File names and descriptions
- **Tag Filtering**: Multiple tag selection
- **File Type**: Filter by MIME type
- **Date Range**: Upload date filtering
- **Folder Scope**: Search within specific folders

### Advanced Features
- Real-time search with debouncing
- Persistent filter states
- Clear all filters option
- Visual filter indicators

## API Functions

### Core Operations
```javascript
// Upload a file
uploadFile(file, metadata)

// Download a file
downloadFile(storagePath, fileName)

// Delete files
deleteFile(fileId, storagePath)
bulkDeleteFiles(files)

// Get files with filters
getFiles(category, options)

// Folder management
createFolder(name, parentPath, category)
deleteFolder(folderId, folderPath)
getFolders(category)

// Metadata operations
updateFileMetadata(fileId, updates)
getAllTags(category)
```

### File Validation
```javascript
validateFile(file) // Returns {isValid, error}
```

## Error Handling

### Upload Errors
- File size validation
- File type validation
- Storage upload failures
- Database metadata failures

### Download Errors
- File not found
- Permission denied
- Network failures

### UI Error Display
- Toast notifications for all operations
- Inline validation messages
- Confirmation dialogs for destructive actions

## Performance Considerations

### File Loading
- Pagination support (50 files per load)
- Lazy loading of file previews
- Debounced search queries

### Storage Optimization
- File deduplication by timestamp + random ID
- Signed URLs for secure access
- Automatic cleanup on metadata failures

## Security Features

### Row Level Security (RLS)
- Admin-only upload/delete policies
- Authenticated user download policies
- Folder management restrictions

### File Validation
- MIME type verification
- File size limits
- Path sanitization

### Access Control
- Role-based permissions
- Secure file URLs with expiration
- Protected admin operations

## Troubleshooting

### Common Issues

1. **Files not uploading**
   - Check file size limits
   - Verify file types are allowed
   - Ensure user has Admin privileges

2. **Previews not working**
   - Check storage bucket permissions
   - Verify file URLs are generated correctly
   - Ensure browser supports file type

3. **Search not working**
   - Check database indexes
   - Verify RLS policies allow read access
   - Test with simpler search terms

4. **Folders not showing**
   - Check folder creation permissions
   - Verify category matches exactly
   - Test database connection

### Debug Steps
1. Check browser console for errors
2. Verify Supabase connection
3. Test database queries directly
4. Check storage bucket setup
5. Verify RLS policies

## Testing the System

### Manual Testing Checklist

#### As Admin User:
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Create folders
- [ ] Move files between folders
- [ ] Add tags and descriptions
- [ ] Search and filter files
- [ ] Delete individual files
- [ ] Bulk delete multiple files
- [ ] Preview images and PDFs

#### As Regular User:
- [ ] Browse files and folders
- [ ] Download files
- [ ] Search and filter
- [ ] Preview files
- [ ] Verify no upload/delete options show

#### System Tests:
- [ ] File size limit enforcement
- [ ] File type restrictions
- [ ] Error handling and notifications
- [ ] Responsive design on mobile
- [ ] Dark mode compatibility

## Production Deployment Notes

### Supabase Configuration
1. Set up production database with proper backups
2. Configure storage bucket with appropriate retention
3. Review and audit RLS policies
4. Set up monitoring for storage usage

### Performance Optimization
1. Consider CDN for file downloads
2. Implement file compression for large uploads
3. Add file preview caching
4. Monitor database performance

### Maintenance
1. Regular cleanup of orphaned files
2. Monitor storage usage and costs
3. Backup file metadata regularly
4. Update file type restrictions as needed

## Support

For issues or questions about the file management system:
1. Check the browser console for errors
2. Review the troubleshooting section above
3. Test with the manual testing checklist
4. Check Supabase dashboard for storage/database issues