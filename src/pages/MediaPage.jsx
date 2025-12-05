import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Input, Select, Modal, ConfirmationModal } from '../components/ui';
import { Loader2, Search, Edit, Trash2, PlusCircle, MapPin, Camera, FileText, Download, Archive } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

const MediaReportView = React.forwardRef(({ item, usersData, projects }, ref) => {
    if (!item) return null;

    const project = projects.find(p => p.id === item.project_id);
    const projectName = project ? `${project.project_number} - ${project.project_name}` : (item.project_name || 'N/A');
    const client = project ? project.client : (item.client || 'N/A');
    const userName = usersData[item.user_id] || 'Unknown User';

    return (
        <div className="p-6 space-y-6 bg-white text-left" ref={ref}>
            <div className="border-b pb-4 border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Media Post Report</h2>
                <p className="text-sm text-gray-500">Reported: {new Date(item.date_time).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-orange-500 p-4 rounded-lg border border-orange-600">
                <div>
                    <p className="text-xs text-orange-100 uppercase font-semibold">Project</p>
                    <p className="font-medium text-white">{projectName}</p>
                    <p className="text-sm text-orange-50">{client}</p>
                </div>
                <div>
                    <p className="text-xs text-orange-100 uppercase font-semibold">Reported By</p>
                    <p className="font-medium text-white">{userName}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-2 text-gray-900">Location Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">ELR</p>
                            <p className="font-medium text-gray-900">{item.elr || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Mileage</p>
                            <p className="font-medium text-gray-900">{item.mileage || 'N/A'}</p>
                        </div>
                        {(item.latitude || item.longitude) && (
                            <div className="col-span-2">
                                <p className="text-sm text-gray-500">Coordinates</p>
                                <p className="font-mono text-sm text-gray-900">{item.latitude}, {item.longitude}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-2 text-gray-900">Description</h3>
                    <h4 className="font-medium text-md mb-1 text-gray-900">{item.title}</h4>
                    <p className="whitespace-pre-wrap bg-orange-500 text-white p-3 rounded-md border border-orange-600">
                        {item.comments}
                    </p>
                </div>

                {item.photo_url && (
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-2 text-gray-900">Evidence</h3>
                        <img 
                            src={item.photo_url} 
                            alt="Evidence" 
                            className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                        />
                    </div>
                )}
                
                {/* Spacer to ensure bottom content isn't clipped during export */}
                <div className="h-4"></div>
            </div>
        </div>
    );
});

const MediaReportModal = ({ item, isOpen, onClose, usersData, projects }) => {
    const modalRef = React.useRef(null);

    const handleExport = async () => {
        if (!modalRef.current) return;
        
        const element = modalRef.current;
        let styleElement = null;

        try {
            // Inject print-friendly styles
            styleElement = document.createElement('style');
            styleElement.textContent = `
                .media-export-wrapper * { color: #000000 !important; }
                /* Override for the orange boxes to keep them orange with white text */
                .media-export-wrapper .bg-orange-500 { background-color: #f97316 !important; color: #ffffff !important; }
                .media-export-wrapper .text-white { color: #ffffff !important; }
                .media-export-wrapper .text-orange-100 { color: #ffedd5 !important; }
                .media-export-wrapper .text-orange-50 { color: #fff7ed !important; }
                .media-export-wrapper .border-orange-600 { border-color: #ea580c !important; }
                
                /* General overrides */
                .media-export-wrapper .bg-gray-50 { background-color: #ffffff !important; }
                .media-export-wrapper .dark\:bg-gray-800 { background-color: #ffffff !important; }
                .media-export-wrapper h2,
                .media-export-wrapper .text-gray-900,
                .media-export-wrapper .text-gray-500,
                .media-export-wrapper .text-gray-600,
                .media-export-wrapper .text-gray-700,
                .media-export-wrapper .font-medium { color: #000000 !important; }
                .media-export-wrapper .border-gray-200 { border-color: #e5e7eb !important; }
            `;
            document.head.appendChild(styleElement);
            element.classList.add('media-export-wrapper');

            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true
            });
            
            const link = document.createElement('a');
            link.href = dataUrl;
            const dateStr = new Date(item.date_time).toISOString().split('T')[0];
            link.download = `Media_Post_Report_${dateStr}.png`;
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            if (styleElement && styleElement.parentNode) {
                document.head.removeChild(styleElement);
            }
            if (element) {
                element.classList.remove('media-export-wrapper');
            }
        }
    };

    if (!isOpen || !item) return null;

    const project = projects.find(p => p.id === item.project_id);
    const projectName = project ? `${project.project_number} - ${project.project_name}` : (item.project_name || 'N/A');
    const client = project ? project.client : (item.client || 'N/A');
    const userName = usersData[item.user_id] || 'Unknown User';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Media Post Report">
            <div className="max-h-[80vh] overflow-y-auto">
                <MediaReportView item={item} usersData={usersData} projects={projects} ref={modalRef} />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={handleExport} className="flex items-center gap-2">
                    <Download size={16} /> Export
                </Button>
            </div>
        </Modal>
    );
};

const MediaPage = () => {
    const { user } = useAuth();
    const { can } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [mediaPosts, setMediaPosts] = useState([]);
    const [usersData, setUsersData] = useState({});
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [isManualProject, setIsManualProject] = useState(false);
    const [mileageUnit, setMileageUnit] = useState('ch'); // 'ch' or 'yds'
    const [formData, setFormData] = useState({
        project_id: '',
        project_name: '',
        client: '',
        date_time: '',
        elr: '',
        mileage_miles: '',
        mileage_yards: '',
        title: '',
        comments: '',
        latitude: '',
        longitude: '',
        photo_file: null,
        photo_url: ''
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);

    // Delete State
    const [isManageMode, setIsManageMode] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Report Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportItem, setReportItem] = useState(null);

    // Export Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [selectedUserFilter, setSelectedUserFilter] = useState([]);
    const [selectedClientFilter, setSelectedClientFilter] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportItemsList, setExportItemsList] = useState([]);

    const uniqueClients = useMemo(() => {
        const clients = new Set();
        mediaPosts.forEach(item => {
            if (item.client) clients.add(item.client);
            if (item.project_id) {
                // Use loose equality for ID match in case types differ
                const proj = projects.find(p => p.id == item.project_id);
                if (proj && proj.client) clients.add(proj.client);
            }
        });
        return [...clients].filter(Boolean).sort();
    }, [mediaPosts, projects]);

    const uniqueUserIds = useMemo(() => {
        return [...new Set(mediaPosts.map(c => c.user_id))];
    }, [mediaPosts]);

    const toggleUserFilter = (id) => {
        setSelectedUserFilter(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllUsers = () => {
        if (selectedUserFilter.length === uniqueUserIds.length) {
            setSelectedUserFilter([]);
        } else {
            setSelectedUserFilter([...uniqueUserIds]);
        }
    };

    const toggleClientFilter = (client) => {
        setSelectedClientFilter(prev => 
            prev.includes(client) ? prev.filter(x => x !== client) : [...prev, client]
        );
    };

    const selectAllClients = () => {
        if (selectedClientFilter.length === uniqueClients.length) {
            setSelectedClientFilter([]);
        } else {
            setSelectedClientFilter([...uniqueClients]);
        }
    };

    const handleWizardExport = async () => {
        if (!exportStartDate || !exportEndDate) {
            alert('Please select a start and end date.');
            return;
        }

        setIsExporting(true);
        try {
            // 1. Filter items based on criteria
            const startDate = new Date(exportStartDate);
            const endDate = new Date(exportEndDate);
            endDate.setHours(23, 59, 59, 999);

            const itemsToExport = mediaPosts.filter(item => {
                const itemDate = new Date(item.date_time);
                const matchesDate = itemDate >= startDate && itemDate <= endDate;
                
                const matchesUser = selectedUserFilter.length === 0 || 
                                   selectedUserFilter.length === uniqueUserIds.length || 
                                   selectedUserFilter.includes(item.user_id);
                
                const project = projects.find(p => p.id === item.project_id);
                const clientName = project ? project.client : (item.client || 'N/A');
                
                const matchesClient = selectedClientFilter.length === 0 ||
                                     selectedClientFilter.length === uniqueClients.length ||
                                     selectedClientFilter.includes(clientName);

                return matchesDate && matchesUser && matchesClient;
            });

            if (itemsToExport.length === 0) {
                alert('No reports found matching your criteria.');
                setIsExporting(false);
                return;
            }

            // 2. Render items for capture
            setExportItemsList(itemsToExport);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for render

            const zip = new JSZip();
            let count = 0;

            // Inject styles
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .media-export-wrapper * { color: #000000 !important; }
                .media-export-wrapper .bg-orange-500 { background-color: #f97316 !important; color: #ffffff !important; }
                .media-export-wrapper .text-white { color: #ffffff !important; }
                .media-export-wrapper .text-orange-100 { color: #ffedd5 !important; }
                .media-export-wrapper .text-orange-50 { color: #fff7ed !important; }
                .media-export-wrapper .border-orange-600 { border-color: #ea580c !important; }
                .media-export-wrapper .bg-gray-50 { background-color: #ffffff !important; }
                .media-export-wrapper .dark\:bg-gray-800 { background-color: #ffffff !important; }
                .media-export-wrapper h2,
                .media-export-wrapper .text-gray-900,
                .media-export-wrapper .text-gray-500,
                .media-export-wrapper .text-gray-600,
                .media-export-wrapper .text-gray-700,
                .media-export-wrapper .font-medium { color: #000000 !important; }
                .media-export-wrapper .border-gray-200 { border-color: #e5e7eb !important; }
            `;
            document.head.appendChild(styleElement);

            for (const item of itemsToExport) {
                const element = document.getElementById(`export-item-${item.id}`);
                if (element) {
                    element.classList.add('media-export-wrapper');
                    try {
                        const dataUrl = await toPng(element, {
                            backgroundColor: '#ffffff',
                            pixelRatio: 2,
                            cacheBust: true
                        });
                        
                        const dateStr = new Date(item.date_time).toISOString().split('T')[0];
                        const project = projects.find(p => p.id === item.project_id);
                        const projName = project ? project.project_number : (item.project_name || 'Manual');
                        const userName = usersData[item.user_id] || 'Unknown';
                        
                        const fileName = `${dateStr}_${projName}_${userName.replace(/\s+/g, '_')}_${item.id.substring(0,4)}.png`;
                        
                        const base64Data = dataUrl.split(',')[1];
                        zip.file(fileName, base64Data, { base64: true });
                        count++;
                    } catch (err) {
                        console.error(`Failed to export item ${item.id}:`, err);
                    }
                    element.classList.remove('media-export-wrapper');
                }
            }

            document.head.removeChild(styleElement);
            setExportItemsList([]);

            if (count > 0) {
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(content);
                link.download = `Media_Post_Reports_${exportStartDate}_to_${exportEndDate}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setWizardOpen(false);
            }

        } catch (error) {
            console.error('Export wizard error:', error);
            alert('Export failed: ' + error.message);
        } finally {
            setIsExporting(false);
            setExportItemsList([]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        console.log('Fetching media posts data...');
        try {
            // Fetch Media Posts
            const { data, error } = await supabase
                .from('media_posts')
                .select('*')
                .order('date_time', { ascending: false });

            if (error) {
                console.error('Error fetching media_posts table:', error);
                throw error;
            }
            setMediaPosts(data || []);
            console.log('Media posts fetched:', data?.length);

            // Fetch Projects
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('id, project_name, project_number, client')
                .order('project_number', { ascending: false });
            
            if (projectsError) {
                console.error('Error fetching projects:', projectsError);
            } else {
                setProjects(projectsData || []);
                console.log('Projects fetched:', projectsData?.length);
            }

            // Fetch User Names
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, name');
            
            if (userError) {
                console.error('Error fetching users:', userError);
            }

            const userMap = {};
            if (user) {
                userMap[user.id] = user.name || user.email;
            }

            if (!userError && users) {
                users.forEach(u => userMap[u.id] = u.name);
            }
            
            setUsersData(userMap);
            console.log('Users fetched');

        } catch (error) {
            console.error('CRITICAL Error in fetchData:', error);
        } finally {
            setLoading(false);
            console.log('fetchData complete, loading set to false');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({ ...prev, photo_file: file }));
            
            // Create preview URL
            const objectUrl = URL.createObjectURL(file);
            setPhotoPreview(objectUrl);
        }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setGettingLocation(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Unable to retrieve your location');
                setGettingLocation(false);
            }
        );
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setIsManualProject(false);
        setMileageUnit('ch');
        setFormData({
            project_id: '',
            project_name: '',
            client: '',
            date_time: new Date().toISOString().slice(0, 16), // Local datetime-local format
            elr: '',
            mileage_miles: '',
            mileage_yards: '',
            title: '',
            comments: '',
            latitude: '',
            longitude: '',
            photo_file: null,
            photo_url: ''
        });
        setPhotoPreview(null);
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        
        // If no project_id but has project_name, it's manual
        setIsManualProject(!item.project_id && !!item.project_name);
        
        let m = '', y = '';
        let unit = 'ch';
        if (item.mileage) {
            const parts = item.mileage.split('m ');
            if (parts.length > 0) m = parts[0];
            if (parts.length > 1) {
                if (parts[1].includes('yds')) {
                    y = parts[1].replace('yds', '');
                    unit = 'yds';
                } else {
                    y = parts[1].replace('ch', '');
                    unit = 'ch';
                }
            }
        }
        setMileageUnit(unit);

        setFormData({
            project_id: item.project_id || '',
            project_name: item.project_name || '',
            client: item.client || '',
            date_time: new Date(item.date_time).toISOString().slice(0, 16),
            elr: item.elr || '',
            mileage_miles: m,
            mileage_yards: y,
            title: item.title || '',
            comments: item.comments || '',
            latitude: item.latitude || '',
            longitude: item.longitude || '',
            photo_file: null,
            photo_url: item.photo_url || ''
        });
        setPhotoPreview(item.photo_url || null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let photoUrl = formData.photo_url;

            // Upload photo if new file selected
            if (formData.photo_file) {
                const file = formData.photo_file;
                const fileExt = file.name.split('.').pop();

                // Get project info
                let projectIdentifier = 'NoProject';
                if (formData.project_id) {
                    const project = projects.find(p => p.id === formData.project_id);
                    projectIdentifier = project ? project.project_number : 'UnknownProject';
                } else if (isManualProject && formData.project_name) {
                    projectIdentifier = formData.project_name;
                }
                
                // Get date
                const datePart = new Date(formData.date_time).toISOString().split('T')[0];

                // Sanitize title
                const sanitizedTitle = (formData.title || 'MediaPost').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 50);
                const sanitizedProjectIdentifier = projectIdentifier.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');


                // Construct filename: YYYY-MM-DD_PROJECT_TITLE_TIMESTAMP.ext
                const fileName = `${datePart}_${sanitizedProjectIdentifier}_${sanitizedTitle}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('media-photos')
                    .upload(filePath, file);

                if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message);

                const { data } = supabase.storage
                    .from('media-photos')
                    .getPublicUrl(filePath);
                
                photoUrl = data.publicUrl;
            }

            const mileage = `${formData.mileage_miles}m ${formData.mileage_yards}${mileageUnit}`;

            const payload = {
                project_id: isManualProject ? null : (formData.project_id || null),
                project_name: isManualProject ? formData.project_name : null,
                client: formData.client,
                date_time: new Date(formData.date_time).toISOString(),
                elr: formData.elr,
                mileage: mileage,
                title: formData.title,
                comments: formData.comments,
                latitude: formData.latitude || null,
                longitude: formData.longitude || null,
                photo_url: photoUrl
            };

            if (modalMode === 'create') {
                const { data, error } = await supabase
                    .from('media_posts')
                    .insert([{ ...payload, user_id: user.id }])
                    .select();
                
                if (error) throw error;
                setMediaPosts(prev => [data[0], ...prev]);
            } else {
                const { data, error } = await supabase
                    .from('media_posts')
                    .update(payload)
                    .eq('id', selectedItem.id)
                    .select();
                
                if (error) throw error;
                setMediaPosts(prev => prev.map(item => item.id === selectedItem.id ? data[0] : item));
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving media post:', error);
            alert('Failed to save: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            if (itemToDelete.photo_url) {
                const path = itemToDelete.photo_url.split('media-photos/').pop();
                if (path) {
                    await supabase.storage.from('media-photos').remove([path]);
                }
            }

            const { error } = await supabase
                .from('media_posts')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            setMediaPosts(prev => prev.filter(item => item.id !== itemToDelete.id));
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting media post:', error);
            alert('Failed to delete: ' + error.message);
        }
    };

    const handleViewReport = (item) => {
        setReportItem(item);
        setReportModalOpen(true);
    };

    const filteredPosts = mediaPosts.filter(item => 
        (item.elr || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.comments || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (usersData[item.user_id] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-lg">Loading Media...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Media</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Media posts for social media</p>
                </div>
                <div className="flex gap-2">
                    {can('EXPORT_MEDIA') && (
                        <Button onClick={() => setWizardOpen(true)} variant="outline" className="flex items-center">
                            <Archive className="w-4 h-4 mr-2" /> Export Wizard
                        </Button>
                    )}
                    {can('ADD_MEDIA') && (
                        <Button onClick={handleOpenCreate} className="flex items-center">
                            <PlusCircle className="w-4 h-4 mr-2" /> Add New
                        </Button>
                    )}
                    {can('MANAGE_MEDIA') && (
                        <Button 
                            variant={isManageMode ? 'primary' : 'outline'}
                            onClick={() => setIsManageMode(!isManageMode)}
                            className="flex items-center"
                        >
                            <Edit className="w-4 h-4 mr-2" /> {isManageMode ? 'Done' : 'Manage'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by ELR, comments, or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Media Posts</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="px-6 py-3">Date/Time</th>
                                <th className="px-6 py-3">Project</th>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">ELR</th>
                                <th className="px-6 py-3">Mileage</th>
                                <th className="px-6 py-3">Title</th>
                                <th className="px-6 py-3 text-center">Report</th>
                                {isManageMode && <th className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.length === 0 ? (
                                <tr>
                                    <td colSpan={isManageMode ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                                        No media posts found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPosts.map(item => (
                                    <tr key={item.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            {new Date(item.date_time).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.project_id 
                                                ? (() => {
                                                    const p = projects.find(p => p.id === item.project_id);
                                                    return p ? `${p.project_number} - ${p.project_name}` : '-';
                                                })()
                                                : (item.project_name || '-')
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.project_id 
                                                ? (projects.find(p => p.id === item.project_id)?.client || '-')
                                                : (item.client || '-')
                                            }
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {usersData[item.user_id] || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">{item.elr || '-'}</td>
                                        <td className="px-6 py-4">{item.mileage || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {item.title || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleViewReport(item)}
                                                className="text-blue-500 hover:text-blue-700 inline-flex items-center justify-center"
                                                title="View Report"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                        {isManageMode && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(item)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'create' ? 'Log Media Post' : 'Edit Media Post'}>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Project</label>
                            <label className="flex items-center space-x-2 text-xs text-gray-500 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isManualProject} 
                                    onChange={(e) => {
                                        setIsManualProject(e.target.checked);
                                        if (e.target.checked) {
                                            setFormData(prev => ({ ...prev, project_id: '', project_name: '' }));
                                        } else {
                                            setFormData(prev => ({ ...prev, project_name: '' }));
                                        }
                                    }}
                                    className="rounded text-orange-500 focus:ring-orange-500"
                                />
                                <span>Manual / Other</span>
                            </label>
                        </div>
                        {isManualProject ? (
                            <>
                                <div className="mb-4">
                                    <Input
                                        name="project_name"
                                        value={formData.project_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter project name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Client</label>
                                    <Input
                                        name="client"
                                        value={formData.client}
                                        onChange={handleInputChange}
                                        placeholder="Enter client"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <Select
                                        name="project_id"
                                        value={formData.project_id}
                                        onChange={(e) => {
                                            const pid = e.target.value;
                                            // Use loose equality because select value is string
                                            const proj = projects.find(p => p.id == pid); 
                                            setFormData(prev => ({
                                                ...prev,
                                                project_id: pid,
                                                client: proj ? proj.client : ''
                                            }));
                                        }}
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.project_number} - {p.project_name}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Client</label>
                                    <Input
                                        name="client"
                                        value={formData.client}
                                        readOnly
                                        placeholder="Client"
                                        className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date & Time</label>
                        <Input
                            type="datetime-local"
                            name="date_time"
                            value={formData.date_time}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ELR</label>
                        <Input
                            name="elr"
                            value={formData.elr}
                            onChange={handleInputChange}
                            placeholder="e.g. DZD"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Mileage</label>
                        <div className="flex items-center gap-2">
                            <Input
                                name="mileage_miles"
                                value={formData.mileage_miles}
                                onChange={handleInputChange}
                                placeholder="Miles"
                                className="flex-1"
                            />
                            <span className="text-gray-500 font-medium">m</span>
                            <Input
                                name="mileage_yards"
                                value={formData.mileage_yards}
                                onChange={handleInputChange}
                                placeholder={mileageUnit === 'ch' ? 'Chains' : 'Yards'}
                                className="flex-1"
                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setMileageUnit(prev => prev === 'ch' ? 'yds' : 'ch')}
                                                                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors min-w-[3rem]"
                                                                title={`Switch to ${mileageUnit === 'ch' ? 'Yards' : 'Chains'}`}
                                                            >
                                                                {mileageUnit}
                                                            </button>                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Location (Lat/Long)</label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                name="latitude"
                                value={formData.latitude}
                                onChange={handleInputChange}
                                placeholder="Latitude"
                            />
                            <Input
                                name="longitude"
                                value={formData.longitude}
                                onChange={handleInputChange}
                                placeholder="Longitude"
                            />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full">
                            <MapPin className="w-4 h-4 mr-2" />
                            {gettingLocation ? 'Locating...' : 'Use My Location'}
                        </Button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <Input
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Brief title for the media post"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Comments / Description</label>
                        <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows="4"
                            placeholder="Describe the media post..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Photo</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden" 
                                id="media-photo-upload"
                            />
                            <label htmlFor="media-photo-upload" className="cursor-pointer flex flex-col items-center justify-center">
                                {photoPreview ? (
                                    <div className="flex flex-col items-center">
                                        <img src={photoPreview} alt="Preview" className="h-32 object-contain mb-2 rounded" />
                                        <span className="text-xs text-gray-500">Click to change</span>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500">Take photo or upload</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Post'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Media Post"
                message="Are you sure you want to delete this entry? This cannot be undone."
                confirmText="Delete"
                confirmVariant="danger"
            />

            {/* Export Wizard Modal */}
            <Modal isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title="Export Media Reports">
                <div className="p-6 space-y-4 h-[80vh] flex flex-col">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select filters to generate and export media reports as a ZIP file.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <Input
                                type="date"
                                value={exportStartDate}
                                onChange={(e) => setExportStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <Input
                                type="date"
                                value={exportEndDate}
                                onChange={(e) => setExportEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                        {/* User Filter */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                                <span className="font-medium text-sm">Filter by User</span>
                                <button 
                                    onClick={selectAllUsers}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {selectedUserFilter.length === uniqueUserIds.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1 flex-1">
                                {uniqueUserIds.map(uid => (
                                    <label key={uid} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedUserFilter.includes(uid)}
                                            onChange={() => toggleUserFilter(uid)}
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm truncate">{usersData[uid] || 'Unknown User'}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Client Filter */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                                <span className="font-medium text-sm">Filter by Client</span>
                                <button 
                                    onClick={selectAllClients}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {selectedClientFilter.length === uniqueClients.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1 flex-1">
                                {uniqueClients.map(client => (
                                    <label key={client} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedClientFilter.includes(client)}
                                            onChange={() => toggleClientFilter(client)}
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm truncate">{client}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                        <Button onClick={handleWizardExport} disabled={isExporting}>
                            {isExporting ? 'Generating...' : 'Export Reports'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Hidden container for batch export rendering */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                {exportItemsList.map(item => (
                    <div key={item.id} id={`export-item-${item.id}`} className="w-[800px] bg-white p-4">
                        <MediaReportView item={item} usersData={usersData} projects={projects} />
                    </div>
                ))}
            </div>

            <MediaReportModal
                item={reportItem}
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                usersData={usersData}
                projects={projects}
            />
        </div>
    );
};

export default MediaPage;
