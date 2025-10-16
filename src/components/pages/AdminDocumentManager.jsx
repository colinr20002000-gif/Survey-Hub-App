import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Upload, Trash2, FileText, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';

const AdminDocumentManager = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [useFallbackUpload, setUseFallbackUpload] = useState(false);
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  const [useDbStorage, setUseDbStorage] = useState(true); // Default to database storage

  const fetchFiles = async () => {
    console.log('📂 fetchFiles called, useDbStorage:', useDbStorage);
    setIsLoading(true);
    try {
      if (useDbStorage) {
        // Fetch from database
        console.log('📊 Fetching from policy_documents_db...');
        const { data, error } = await supabase
          .from('policy_documents_db')
          .select('id, file_name, content_type, file_size, uploaded_at')
          .order('uploaded_at', { ascending: false });

        console.log('📊 Database query result:', { data, error, count: data?.length });

        if (error) {
          console.error('❌ Error fetching files from database:', error);
          setFiles([]);
        } else {
          // Transform to match storage format
          const transformedFiles = (data || []).map(file => ({
            id: file.id,
            name: file.file_name,
            metadata: { size: file.file_size },
            content_type: file.content_type,
            uploaded_at: file.uploaded_at
          }));
          console.log('✅ Transformed files:', transformedFiles);
          setFiles(transformedFiles);
        }
      } else {
        // Fetch from storage (legacy)
        console.log('💾 Fetching from storage...');
        const { data, error } = await supabase.storage.from('policy-documents').list();
        console.log('💾 Storage query result:', { data, error, count: data?.length });
        if (error) console.error('Error fetching files:', error);
        else setFiles(data || []);
      }
    } catch (error) {
      console.error('❌ Fetch files error:', error);
      setFiles([]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [useDbStorage]);

  // Helper function to split file into chunks
  const uploadFileInChunks = async (file, fileName) => {
    const CHUNK_SIZE = 16 * 1024; // 16KB chunks (ultra-minimal)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkFileName = `${fileName}.part${chunkIndex.toString().padStart(3, '0')}`;

      try {
        const { error } = await supabase.storage
          .from('policy-documents')
          .upload(chunkFileName, chunk, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Update progress
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 90); // Reserve 10% for processing
        setUploadProgress(progress);

      } catch (error) {
        // Clean up any uploaded chunks
        for (let i = 0; i <= chunkIndex; i++) {
          const cleanupFileName = `${fileName}.part${i.toString().padStart(3, '0')}`;
          await supabase.storage.from('policy-documents').remove([cleanupFileName]);
        }
        throw error;
      }
    }

    // Create a manifest file to indicate all chunks are uploaded
    const manifest = {
      originalFileName: file.name,
      totalChunks,
      fileSize: file.size,
      chunkSize: CHUNK_SIZE,
      uploadedAt: new Date().toISOString()
    };

    const { error: manifestError } = await supabase.storage
      .from('policy-documents')
      .upload(`${fileName}.manifest`, new Blob([JSON.stringify(manifest)], { type: 'application/json' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (manifestError) throw manifestError;
    setUploadProgress(100);
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Ultra conservative file size limit
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setUploadError(`File too large. Maximum size is 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please compress your PDF using online tools like SmallPDF or ILovePDF.`);
      return;
    }

    console.log(`📄 File selected: ${file.name}, Size: ${(file.size / 1024).toFixed(1)}KB, Type: ${file.type}`);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Use a unique filename to avoid conflicts
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Clean filename
      const fileName = `${timestamp}_${cleanFileName}`;

      // Use database storage to avoid memory issues
      if (useDbStorage) {
        console.log('📊 Using database storage method');
        setUploadProgress(50);

        try {
          // Convert file to base64
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64Data = reader.result.split(',')[1]; // Remove data:... prefix
              console.log(`📤 Storing in database: ${fileName}, Base64 length: ${base64Data.length}`);

              const { data, error } = await supabase.functions.invoke('store-in-db', {
                body: {
                  fileName,
                  fileData: base64Data,
                  contentType: file.type,
                  fileSize: file.size
                }
              });

              console.log('📥 Database storage response:', { data, error });

              // Check for errors in both error field and data.error
              if (error || data?.error) {
                const errorMsg = error?.message || data?.error || 'Unknown error';
                console.error('❌ Database storage error:', errorMsg);
                setUploadError(`Database upload failed: ${errorMsg}`);
              } else {
                setUploadProgress(100);
                console.log('✅ Upload successful, refreshing file list...');
                await fetchFiles();
                alert('File uploaded successfully to database! It will be processed in the background.');
              }
            } catch (error) {
              console.error('❌ Database upload failed:', error);
              setUploadError(`Database upload failed: ${error.message}`);
            }
          };
          reader.onerror = () => setUploadError('Failed to read file');
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('File reading error:', error);
          setUploadError(`File reading failed: ${error.message}`);
        }
      } else {
        // Legacy storage methods (for fallback)
        console.log('💾 Using legacy storage methods');
        try {
          if (useFallbackUpload) {
            console.log('🆘 Using fallback Edge Function upload');
            setUploadProgress(50);
            await uploadViaFunction(file, fileName);
            setUploadProgress(100);
            alert('File uploaded successfully using fallback method!');
          } else {
            console.log('🔄 Using chunked upload');
            await uploadFileInChunks(file, fileName);
            alert('File uploaded successfully using chunked upload!');
          }
          fetchFiles();
        } catch (error) {
          console.error('Legacy upload failed:', error);
          setUploadError(`Legacy upload failed: ${error.message}`);
        }
      }

      fetchFiles();
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

    try {
      if (useDbStorage) {
        // Delete from database
        const { error } = await supabase
          .from('policy_documents_db')
          .delete()
          .eq('file_name', fileName);

        if (error) {
          alert(`Delete failed: ${error.message}`);
        } else {
          alert(`${fileName} deleted successfully.`);
        }
      } else {
        // Delete from storage (legacy)
        const { error } = await supabase.functions.invoke('delete-document', { body: { fileName } });
        if (error) alert(`Delete failed: ${error.message}`);
        else alert(`${fileName} deleted successfully.`);
      }
      fetchFiles();
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const handleReassemble = async (baseFileName) => {
    if (!confirm(`Reassemble chunks for ${baseFileName}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('reassemble-chunks', {
        body: { fileName: baseFileName }
      });

      if (error) {
        alert(`Reassembly failed: ${error.message}`);
      } else {
        alert(`${data.originalName} reassembled successfully!`);
        fetchFiles();
      }
    } catch (error) {
      alert(`Reassembly failed: ${error.message}`);
    }
  };

  const checkStorage = async () => {
    setIsCheckingStorage(true);
    try {
      // First check if bucket exists locally
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('🪣 Available buckets:', buckets);
      console.log('🚨 Bucket error:', bucketError);

      if (bucketError) {
        alert(`Local bucket check failed: ${bucketError.message}`);
        return;
      }

      const policyBucket = buckets?.find(b => b.name === 'policy-documents');
      if (!policyBucket) {
        alert(`policy-documents bucket not found! Available: ${buckets?.map(b => b.name).join(', ')}`);
        return;
      }

      // Test Edge Function
      const { data, error } = await supabase.functions.invoke('check-storage');
      if (error) {
        console.error('Edge Function error:', error);
        alert(`Edge Function check failed: ${error.message}`);
      } else {
        console.log('✅ Edge Function response:', data);
        alert(`Storage check passed! ${data.message}`);
      }
    } catch (error) {
      console.error('Storage check error:', error);
      alert(`Storage check failed: ${error.message}`);
    } finally {
      setIsCheckingStorage(false);
    }
  };

  const createBucket = async () => {
    setIsCreatingBucket(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bucket');
      if (error) {
        console.error('Bucket creation error:', error);
        alert(`Bucket creation failed: ${error.message}`);
      } else {
        console.log('✅ Bucket creation response:', data);
        alert(`Success! ${data.message}`);
        fetchFiles(); // Refresh file list
      }
    } catch (error) {
      console.error('Bucket creation error:', error);
      alert(`Bucket creation failed: ${error.message}`);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  // Fallback upload using Edge Function
  const uploadViaFunction = async (file, fileName) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1]; // Remove data:... prefix
          console.log(`📤 Sending to Edge Function: ${fileName}, Base64 length: ${base64Data.length}`);

          const { data, error } = await supabase.functions.invoke('upload-via-function', {
            body: {
              fileName,
              fileData: base64Data,
              contentType: file.type
            }
          });

          console.log('📥 Edge Function response:', { data, error });
          if (error) {
            console.error('❌ Edge Function error details:', error);
            throw error;
          }
          resolve(data);
        } catch (error) {
          console.error('❌ Upload via function failed:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setUseDbStorage(!useDbStorage)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
              useDbStorage
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
            }`}
          >
            {useDbStorage ? '📊 DB Storage' : '💾 Legacy Storage'}
          </button>
          <button
            onClick={createBucket}
            disabled={isCreatingBucket}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-purple-300"
          >
            {isCreatingBucket ? <Loader2 className="w-4 h-4 animate-spin" /> : '🪣'}
            {isCreatingBucket ? 'Creating...' : 'Create Bucket'}
          </button>
          <button
            onClick={checkStorage}
            disabled={isCheckingStorage}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isCheckingStorage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            {isCheckingStorage ? 'Checking...' : 'Test Storage'}
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="flex items-center justify-center w-full px-4 py-6 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
          <span className="text-sm font-medium">
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Click to upload a document'}
          </span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
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
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">Supports all file types (max 2MB). Database storage recommended for reliability.</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {useDbStorage
              ? '📊 Database storage: Files stored directly in PostgreSQL (recommended)'
              : '💾 Legacy storage: Uses Supabase storage with chunked upload (may have memory issues)'
            }
          </p>
          {useDbStorage && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✅ Database storage active - bypasses memory limitations.
            </p>
          )}
          <p className="text-xs text-amber-600 dark:text-amber-400">
            💡 <strong>Large PDF?</strong> Compress it first using <a href="https://smallpdf.com/compress-pdf" target="_blank" rel="noopener" className="underline hover:text-amber-800">SmallPDF</a> or <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener" className="underline hover:text-amber-800">ILovePDF</a>
          </p>
        </div>
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
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>
                          {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                        </span>
                        {file.name.includes('.part') && (
                          <span className="px-1 bg-yellow-100 text-yellow-800 rounded">Chunk</span>
                        )}
                        {file.name.includes('.manifest') && (
                          <span className="px-1 bg-blue-100 text-blue-800 rounded">Manifest</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {file.name.includes('.manifest') && (
                      <button
                        onClick={() => handleReassemble(file.name.replace('.manifest', ''))}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Reassemble chunks"
                      >
                        <RefreshCw size={18} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(file.name)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
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