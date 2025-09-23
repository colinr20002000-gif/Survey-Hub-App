import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Upload, Trash2, FileText, Loader2, AlertCircle } from 'lucide-react';

const AdminDocumentManager = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage.from('policy-documents').list();
    if (error) console.error('Error fetching files:', error);
    else setFiles(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setUploadError(`File too large. Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.md')) {
      setUploadError('Invalid file type. Please upload PDF, TXT, or MD files only.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Use a unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;

      // For large files, we'll use the resumable upload approach
      const { data, error } = await supabase.storage
        .from('policy-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite, create new file
        });

      if (error) {
        console.error('Upload error:', error);
        setUploadError(`Upload failed: ${error.message}`);
      } else {
        setUploadProgress(100);
        alert('File uploaded successfully! It will be processed in the background.');
        fetchFiles();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleDelete = async (fileName) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;
    const { error } = await supabase.functions.invoke('delete-document', { body: { fileName } });
    if (error) alert(`Delete failed: ${error.message}`);
    else alert(`${fileName} deleted successfully.`);
    fetchFiles();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Document Management</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="flex items-center justify-center w-full px-4 py-6 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
          <span className="text-sm font-medium">
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Click to upload a document'}
          </span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.txt,.md" />
        </label>
        {isUploading && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
        {uploadError && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">Upload Error</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">{uploadError}</p>
              <button onClick={() => setUploadError(null)} className="text-xs text-red-500 hover:text-red-700 mt-1 underline">
                Dismiss
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">Supports PDF, TXT, and MD files (max 50MB). Images within PDFs will be analyzed.</p>
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Uploaded Documents</h2>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p>Loading documents...</p>
            </div>
          ) : files.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText size={18} />
                    <div>
                      <span className="block text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(file.name)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminDocumentManager;