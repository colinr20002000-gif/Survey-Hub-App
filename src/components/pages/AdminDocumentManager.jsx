import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';

const AdminDocumentManager = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

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
    setIsUploading(true);
    const { error } = await supabase.storage.from('policy-documents').upload(file.name, file, { upsert: true });
    if (error) alert(`Upload failed: ${error.message}`);
    else alert('File uploaded! It will be processed in the background.');
    setIsUploading(false);
    fetchFiles();
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
          <span className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Click to upload or replace a document'}</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.txt,.md" />
        </label>
        <p className="text-xs text-gray-500 mt-2">Supports PDF, TXT, and MD files. Images within PDFs will be analyzed.</p>
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Uploaded Documents</h2>
          {isLoading ? <p>Loading...</p> : (
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center gap-2"><FileText size={18} /><span>{file.name}</span></div>
                  <button onClick={() => handleDelete(file.name)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
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