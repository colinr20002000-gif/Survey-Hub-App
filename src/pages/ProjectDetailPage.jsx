import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, FileSpreadsheet, FileText, Presentation, Archive, File, Upload, Eye, Download, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Input, ConfirmationModal } from '../components/ui';
import { userPrivileges } from '../App';

const ProjectDetailPage = ({ project, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { updateProject } = useProjects();
    const { user } = useAuth();
    // Assuming userPrivileges is available or imported. If not, we might need to adjust.
    // In App.jsx it was using a local object. We should probably use usePermissions hook instead for better consistency.
    const { canEditProjects, canEditSiteInformation } = usePermissions();

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'files', label: 'Files' },
        { id: 'site_info', label: 'Site Information' },
    ];

    return (
        <div className="p-4 md:p-6">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 mb-4">
                <ChevronLeft size={16} className="mr-1"/>
                Back to Projects
            </button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{project.project_name}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{project.project_number} - {project.client}</p>
                </div>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'overview' && <ProjectOverview project={project} onUpdate={updateProject} canEdit={canEditProjects} />}
                {activeTab === 'tasks' && <ProjectTasks project={project} canEdit={canEditProjects} />}
                {activeTab === 'files' && <ProjectFiles projectId={project.id} />}
                {activeTab === 'site_info' && <ProjectSiteInformation project={project} onUpdate={updateProject} canEdit={canEditSiteInformation} />}
            </div>
        </div>
    );
};

const ProjectOverview = ({ project, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(project);

    useEffect(() => {
        setFormData(project);
    }, [project]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(project); }}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Details</Button>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Project Description</h3>
                    {isEditing ? (
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="5" className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Key Dates</h3>
                    <div className="text-sm space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Created</label>
                            {isEditing ? <Input type="date" name="date_created" value={formData.date_created} onChange={handleInputChange} /> : <p>{project.date_created}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Start Date</label>
                            {isEditing ? <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} /> : <p>{project.startDate}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Target Completion</label>
                            {isEditing ? <Input type="date" name="targetDate" value={formData.targetDate} onChange={handleInputChange} /> : <p>{project.targetDate}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectTasks = ({ project, canEdit }) => {
    const { updateProject } = useProjects();
    const [isEditing, setIsEditing] = useState(false);
    const [tasksText, setTasksText] = useState(project.tasksText || '');

    useEffect(() => {
        setTasksText(project.tasksText || '');
    }, [project.tasksText]);

    const handleSave = () => {
        updateProject({ ...project, tasksText });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTasksText(project.tasksText || '');
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Tasks & Notes</h3>
                {canEdit && (
                    isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                    )
                )}
            </div>
            <div className="p-4">
                {isEditing ? (
                    <textarea
                        value={tasksText}
                        onChange={(e) => setTasksText(e.target.value)}
                        rows="15"
                        className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter a list of tasks or any relevant information..."
                    />
                ) : (
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                        {tasksText || 'No tasks or notes have been added yet.'}
                    </pre>
                )}
            </div>
        </div>
    );
};

const ProjectFiles = ({ projectId }) => {
    const { canDownloadFiles, canUploadDocuments, canDeleteDocuments } = usePermissions();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const fileInputRef = useRef(null);

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'xlsx':
            case 'xls':
            case 'csv':
                return <FileSpreadsheet className="text-green-500" />;
            case 'pdf':
                return <FileText className="text-red-500" />;
            case 'dwg':
            case 'dxf':
            case 'ppt':
            case 'pptx':
                return <Presentation className="text-blue-500" />;
            case 'zip':
            case 'rar':
                return <Archive className="text-yellow-500" />;
            default:
                return <File className="text-gray-500" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const fetchFiles = async () => {
        try {
            const { data, error } = await supabase.storage
                .from('project-files')
                .list(`project-${projectId}`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) {
                console.error('Error fetching files:', error);
                return;
            }

            const filesWithDetails = data.map(file => {
                const originalName = file.name.includes('_')
                    ? file.name.substring(file.name.indexOf('_') + 1)
                    : file.name;

                return {
                    id: file.id,
                    name: originalName,
                    storageName: file.name,
                    size: formatFileSize(file.metadata?.size || 0),
                    uploaded: new Date(file.created_at).toLocaleDateString(),
                    fullPath: `project-${projectId}/${file.name}`
                };
            });

            setFiles(filesWithDetails);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [projectId]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `project-${projectId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (error) {
                alert('Error uploading file: ' + error.message);
                return;
            }

            await fetchFiles();
            alert('File uploaded successfully!');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownload = async (file) => {
        try {
            const { data, error } = await supabase.storage
                .from('project-files')
                .download(file.fullPath);

            if (error) {
                alert('Error downloading file: ' + error.message);
                return;
            }

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading file');
        }
    };

    const handleOpen = async (file) => {
        try {
            const { data } = supabase.storage
                .from('project-files')
                .getPublicUrl(file.fullPath);

            if (!data?.publicUrl) {
                alert('Error: Could not generate file URL');
                return;
            }

            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'kml' || extension === 'kmz') {
                const googleEarthUrl = `https://earth.google.com/web/@0,0,0a,22251752.77375655d,35y,0h,0t,0r/data=CgRCAggB?url=${encodeURIComponent(data.publicUrl)}`;
                window.open(googleEarthUrl, '_blank');
            } else {
                window.open(data.publicUrl, '_blank');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Error opening file');
        }
    };

    const handleDeleteClick = (file) => {
        setFileToDelete(file);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;

        try {
            const { error } = await supabase.storage
                .from('project-files')
                .remove([fileToDelete.fullPath]);

            if (error) {
                alert('Error deleting file: ' + error.message);
                return;
            }

            await fetchFiles();
            alert('File deleted successfully!');
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file');
        } finally {
            setIsDeleteModalOpen(false);
            setFileToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading files...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Project Files</h3>
                {canUploadDocuments && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <><Loader2 size={16} className="mr-2 animate-spin" />Uploading...</>
                            ) : (
                                <><Upload size={16} className="mr-2" />Upload File</>
                            )}
                        </Button>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Size</th>
                            <th className="px-4 py-2 text-left">Uploaded</th>
                            <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No files uploaded yet. Click "Upload File" to add your first file.
                                </td>
                            </tr>
                        ) : (
                            files.map(file => (
                                <tr key={file.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-4 py-3 flex items-center">
                                        {getFileIcon(file.name)}
                                        <span className="ml-3 font-medium">{file.name}</span>
                                    </td>
                                    <td className="px-4 py-3">{file.size}</td>
                                    <td className="px-4 py-3">{file.uploaded}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center space-x-1">
                                            {canDownloadFiles && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpen(file)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Open file"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(file)}
                                                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Download file"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {canDeleteDocuments && (
                                                <button
                                                    onClick={() => handleDeleteClick(file)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Delete file"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            {!canDownloadFiles && !canDeleteDocuments && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm File Deletion"
                message={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
};

const ProjectSiteInformation = ({ project, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(project);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setFormData(project);
    }, [project]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    const handlePhotoUpload = async (event, fieldName) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}_${fieldName}_${Date.now()}.${fileExt}`;
            const filePath = `site-info-photos/${fileName}`;

            const { data, error } = await supabase.storage
                .from('project-files') // Reusing project-files bucket, or create a new one? Assuming reuse for now.
                .upload(filePath, file);

            if (error) {
                alert('Error uploading photo: ' + error.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath);

            const updatedData = { ...formData, [fieldName]: publicUrlData.publicUrl };
            setFormData(updatedData);
            onUpdate(updatedData); // Auto-save after upload
            alert('Photo uploaded successfully!');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo');
        } finally {
            setUploading(false);
        }
    };

    const PhotoBox = ({ title, fieldName, imageUrl }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">{title}</h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px] relative bg-gray-50 dark:bg-gray-900">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-gray-400">
                        <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No photo inserted</p>
                    </div>
                )}
                
                {canEdit && (
                    <div className="absolute top-4 right-4">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`upload-${fieldName}`}
                            onChange={(e) => handlePhotoUpload(e, fieldName)}
                            disabled={uploading}
                        />
                        <label htmlFor={`upload-${fieldName}`}>
                            <Button as="span" size="sm" variant="outline" className="cursor-pointer" disabled={uploading}>
                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                <span className="ml-2">{imageUrl ? 'Change' : 'Upload'}</span>
                            </Button>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(project); }}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Information</Button>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-4">Site Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="ELR" name="elr" value={formData.elr || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Postcode" name="postcode" value={formData.postcode || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Chainage Datum" name="chainage_datum" value={formData.chainage_datum || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Start Mileage" name="start_mileage" value={formData.start_mileage || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="End Mileage" name="end_mileage" value={formData.end_mileage || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Design Track" name="design_track" value={formData.design_track || ''} onChange={handleInputChange} disabled={!isEditing} />
                    <Input label="Reference Track" name="reference_track" value={formData.reference_track || ''} onChange={handleInputChange} disabled={!isEditing} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PhotoBox title="Section Appendix" fieldName="section_appendix_url" imageUrl={formData.section_appendix_url} />
                <PhotoBox title="Routeview" fieldName="routeview_url" imageUrl={formData.routeview_url} />
                <PhotoBox title="Signal Diagram" fieldName="signal_diagram_url" imageUrl={formData.signal_diagram_url} />
            </div>
        </div>
    );
};

export default ProjectDetailPage;
