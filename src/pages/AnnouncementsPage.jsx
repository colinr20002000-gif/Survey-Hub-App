import React, { useState, useEffect, useMemo } from 'react';
import { Megaphone, X, Calendar, AlertTriangle, Filter, PlusCircle, Edit, Trash2, Loader2, Paperclip, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { useDebouncedValue } from '../utils/debounce';
import { Button, Input, Pagination, ConfirmationModal, Combobox, Modal } from '../components/ui';
import CustomConfirmationModal from '../components/ConfirmationModal';
import { ANNOUNCEMENT_PRIORITIES } from '../constants';
import { sendAnnouncementFCMNotification } from '../utils/fcmNotifications';

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedPriority, setSelectedPriority] = useState('All');
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal } = useToast();
    const { markAsRead, refreshNotifications, announcementRefreshTrigger } = useNotifications();
    const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermissions();

    console.log('📢 [FILTER] AnnouncementsPage rendered, categories state:', categories);

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    author:users!author_id(name, username, avatar),
                    announcement_reads!left (
                        read_at,
                        dismissed_at,
                        user_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist, just set empty announcements
                if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.warn('Announcements table does not exist yet. Please create it in your Supabase database.');
                    setAnnouncements([]);
                    setLoading(false);
                    return;
                }
                throw error;
            }

            const processedData = (data || []).map(announcement => {
                const userRead = announcement.announcement_reads?.find(read => read.user_id === user?.id);
                return {
                    ...announcement,
                    author_name: 'System', // Fallback since we removed the join
                    isRead: !!userRead?.read_at, // Check if current user has read this announcement
                    readCount: announcement.announcement_reads?.length || 0 // Count of total reads
                };
            });

            setAnnouncements(processedData);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch announcement categories from database
    const fetchCategories = async () => {
        try {
            console.log('📢 [FILTER] Fetching announcement categories for filter...');

            // First, let's see what categories exist in the database
            const { data: allCategories, error: allError } = await supabase
                .from('dropdown_categories')
                .select('name');

            console.log('📢 [FILTER] Available dropdown categories:', allCategories);

            if (allError) {
                console.log('📢 [FILTER] Error fetching dropdown_categories (table may not exist):', allError.message);
                console.log('📢 [FILTER] Using hardcoded fallback due to table access error');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            if (!allCategories || allCategories.length === 0) {
                console.log('📢 [FILTER] No dropdown categories found in database - using hardcoded fallback');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            // Try different possible variations of announcement category names
            const possibleNames = [
                'announcement_category',  // Your database has this one!
                'announcement category',
                'Announcement Category',
                'Announcement',
                'announcement',
                'Category',
                'category'
            ];

            let foundData = null;
            let foundCategoryName = null;

            for (const categoryName of possibleNames) {
                console.log(`📢 [FILTER] Trying category name: "${categoryName}"`);
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', categoryName)
                    .eq('is_active', true)
                    .order('sort_order');

                if (!error && data && data.length > 0) {
                    console.log(`📢 [FILTER] SUCCESS! Found categories with name "${categoryName}":`, data);
                    foundData = data;
                    foundCategoryName = categoryName;
                    break;
                } else if (error) {
                    console.log(`📢 [FILTER] Error with "${categoryName}":`, error.message);
                } else {
                    console.log(`📢 [FILTER] No data found for "${categoryName}"`);
                }
            }

            if (foundData && foundData.length > 0) {
                console.log(`📢 [FILTER] Using categories from "${foundCategoryName}":`, foundData.map(cat => cat.display_text));
                setCategories(foundData.map(cat => cat.display_text));
            } else {
                console.log('📢 [FILTER] No announcement categories found in any variation.');
                console.log('📢 [FILTER] Available category names to try:', allCategories.map(cat => cat.name));
                console.log('📢 [FILTER] ✅ Found "announcement_category" category but it has NO ITEMS!');
                console.log('📢 [FILTER] ⚠️  ACTION NEEDED: Go to Dropdown Menu Management → announcement_category');
                console.log('📢 [FILTER] ➕ ADD THESE ITEMS: General, Safety, Equipment, Policy, Training, Project Updates, Maintenance');
                console.log('📢 [FILTER] 🔄 Then refresh this page - the dropdown will work automatically!');
                console.log('📢 [FILTER] Using hardcoded fallback for now');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
            }
        } catch (error) {
            console.error('📢 [FILTER] Error fetching announcement categories:', error);
            // Fallback to hardcoded categories
            setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAnnouncements();
            fetchCategories();
        }
    }, [user]);

    // Debug: Log categories whenever they change
    useEffect(() => {
        console.log('📢 [FILTER] Categories state updated:', categories);
    }, [categories]);

    // Refresh announcements when markAllAsRead is called from notification bell
    useEffect(() => {
        if (user && announcementRefreshTrigger > 0) {
            fetchAnnouncements();
        }
    }, [announcementRefreshTrigger, user]);

    const handleMarkAsRead = async (announcementId) => {
        try {
            // First check if the record already exists
            const { data: existing, error: checkError } = await supabase
                .from('announcement_reads')
                .select('id, read_at')
                .eq('announcement_id', announcementId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing read record:', checkError);
                return;
            }

            if (existing) {
                // Record exists, update it if not already marked as read
                if (!existing.read_at) {
                    const { error: updateError } = await supabase
                        .from('announcement_reads')
                        .update({ read_at: new Date().toISOString() })
                        .eq('announcement_id', announcementId)
                        .eq('user_id', user.id);

                    if (updateError) {
                        console.error('Error updating read status:', updateError);
                        return;
                    }
                }
            } else {
                // Record doesn't exist, insert it
                const { error: insertError } = await supabase
                    .from('announcement_reads')
                    .insert({
                        announcement_id: announcementId,
                        user_id: user.id,
                        read_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('Error inserting read record:', insertError);
                    return;
                }
            }

            fetchAnnouncements();
        } catch (error) {
            console.error('Error marking announcement as read:', error);
        }
    };

    const handleMarkAsReadPage = async (announcementId) => {
        try {
            // Use the NotificationContext markAsRead function
            await markAsRead(announcementId);
            
            // Refresh both the announcements page and notifications
            await fetchAnnouncements();
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking announcement as read:', error);
            showErrorModal('Error marking announcement as read', 'Error');
        }
    };

    const handleDelete = (announcementId) => {
        setAnnouncementToDelete(announcementId);
        setIsDeleteConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!announcementToDelete) return;

        try {
            // Find the announcement to get file URLs
            const announcement = announcements.find(a => a.id === announcementToDelete);
            
            // Delete attachments if they exist
            if (announcement && announcement.file_urls && announcement.file_urls.length > 0) {
                const filesToRemove = announcement.file_urls.map(url => {
                    // Extract path after 'documents/'
                    const parts = url.split('/documents/');
                    if (parts.length > 1) {
                        return parts[1]; // Returns "announcements/filename..."
                    }
                    return null;
                }).filter(Boolean); // Remove nulls

                if (filesToRemove.length > 0) {
                    console.log('Deleting attachments:', filesToRemove);
                    const { error: storageError } = await supabase.storage
                        .from('documents')
                        .remove(filesToRemove);
                    
                    if (storageError) {
                        console.error('Error deleting attachments:', storageError);
                        // We continue with DB deletion even if file deletion fails, 
                        // but log the error. Or we could stop here.
                        // For now, let's log and continue to ensure the record is removed.
                    }
                }
            }

            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', announcementToDelete);

            if (error) throw error;

            fetchAnnouncements();
            showSuccessModal('Announcement deleted successfully', 'Success');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            showErrorModal('Error deleting announcement', 'Error');
        } finally {
            setIsDeleteConfirmModalOpen(false);
            setAnnouncementToDelete(null);
        }
    };

    // Defensive: Ensure announcements is always an array
    const filteredAnnouncements = (Array.isArray(announcements) ? announcements : []).filter(announcement => {
        // Defensive: Check if announcement has required fields
        if (!announcement || typeof announcement !== 'object') return false;

        const title = announcement.title || '';
        const content = announcement.content || '';
        const category = announcement.category || '';
        const priority = announcement.priority || 'medium';

        const matchesSearch = title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            content.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
        const matchesPriority = selectedPriority === 'All' || priority === selectedPriority.toLowerCase();

        // Hide feedback announcements from non-super admins
        const isSuperAdmin = user?.email === 'colin.rogers@inorail.co.uk';
        const isFeedbackAnnouncement = category === 'Feedback';
        const showFeedback = !isFeedbackAnnouncement || isSuperAdmin;

        return matchesSearch && matchesCategory && matchesPriority && showFeedback;
    });

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Loading announcements...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
                    <p className="text-gray-600 dark:text-gray-400">Company-wide announcements and updates</p>
                </div>
                {canCreateProjects && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
                        <PlusCircle size={16} className="mr-2" />
                        New Announcement
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Search announcements..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Combobox 
                            value={selectedCategory === 'All' ? 'All Categories' : selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value === 'All Categories' ? 'All' : e.target.value)}
                            options={['All Categories', ...(Array.isArray(categories) ? categories : [])]}
                        />
                        <Combobox 
                            value={selectedPriority === 'All' ? 'All Priorities' : selectedPriority} 
                            onChange={(e) => setSelectedPriority(e.target.value === 'All Priorities' ? 'All' : e.target.value)}
                            options={['All Priorities', 'Low', 'Medium', 'High', 'Urgent']}
                        />
                    </div>
                </div>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {filteredAnnouncements.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                        <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No announcements found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm || selectedCategory !== 'All' || selectedPriority !== 'All' 
                                ? 'Try adjusting your filters'
                                : 'No announcements have been created yet'
                            }
                        </p>
                    </div>
                ) : (
                    filteredAnnouncements.map(announcement => {
                        // Defensive: Ensure priority exists and is valid
                        const priorityKey = announcement.priority || 'medium';
                        const priority = ANNOUNCEMENT_PRIORITIES[priorityKey] || ANNOUNCEMENT_PRIORITIES.medium;

                        return (
                            <div
                                key={announcement.id}
                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 ${
                                    !announcement.isRead ? 'border-l-4 border-l-orange-500' : ''
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white break-words">
                                                {announcement.title || 'Untitled Announcement'}
                                            </h3>
                                            {!announcement.isRead && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 self-start">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            <span className="flex items-center gap-1">
                                                👤 By {announcement.author?.name || 'Unknown User'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString() : 'Unknown Date'}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
                                                {priority.label}
                                            </span>
                                            {announcement.category && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {announcement.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        {!announcement.isRead && announcement.author_id !== user?.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMarkAsReadPage(announcement.id)}
                                            >
                                                Mark as Read
                                            </Button>
                                        )}
                                        {(canEditProjects || canDeleteProjects) && (announcement.author_id === user.id || user.privilege === 'Admin') && (
                                            <>
                                                {canEditProjects && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedAnnouncement(announcement);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit size={14} />
                                                    </Button>
                                                )}
                                                {canDeleteProjects && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(announcement.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                    {announcement.content || 'No content available'}
                                </div>

                                {announcement.file_urls && announcement.file_urls.length > 0 && (
                                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Attachments</p>
                                        <div className="flex flex-wrap gap-2">
                                            {announcement.file_urls.map((url, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors group"
                                                >
                                                    <Paperclip className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                                                    <span className="text-sm text-blue-600 dark:text-blue-400 group-hover:underline truncate max-w-[200px]">
                                                        {decodeURIComponent(url.split('/').pop().split('_').slice(2).join('_') || url.split('/').pop())}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {announcement.expires_at && (
                                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-yellow-500" />
                                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                                            Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {announcement.target_roles && Array.isArray(announcement.target_roles) && announcement.target_roles.length > 0 && (
                                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        Target audience: {announcement.target_roles.join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Announcement Modal */}
            <AnnouncementModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={fetchAnnouncements}
                announcement={null}
            />

            {/* Edit Announcement Modal */}
            <AnnouncementModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedAnnouncement(null);
                }}
                onSave={fetchAnnouncements}
                announcement={selectedAnnouncement}
            />

            {/* Custom Confirmation Modals */}
            <CustomConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => {
                    setIsDeleteConfirmModalOpen(false);
                    setAnnouncementToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Announcement"
                message={`Are you sure you want to permanently delete this announcement? This action cannot be undone and the announcement will be removed for all users.${announcementToDelete && user.privilege === 'Admin' ? ' (Admin override - deleting another user\'s announcement)' : ''}`}
                confirmText="Delete Permanently"
                cancelText="Keep Announcement"
                type="danger"
            />
        </div>
    );
};

const AnnouncementModal = ({ isOpen, onClose, onSave, announcement }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General',
        priority: 'medium',
        target_roles: [],
        expires_at: '',
        file_urls: []
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal } = useToast();

    // Fetch announcement categories from database
    const fetchCategories = async () => {
        try {
            console.log('📢 [MODAL] Fetching announcement categories...');

            // First, let's see what categories exist in the database
            const { data: allCategories, error: allError } = await supabase
                .from('dropdown_categories')
                .select('name');

            console.log('📢 [MODAL] Available dropdown categories:', allCategories);

            if (allError) {
                console.log('📢 [MODAL] Error fetching dropdown_categories (table may not exist):', allError.message);
                console.log('📢 [MODAL] Using hardcoded fallback due to table access error');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            if (!allCategories || allCategories.length === 0) {
                console.log('📢 [MODAL] No dropdown categories found in database - using hardcoded fallback');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            // Try different possible variations of announcement category names
            const possibleNames = [
                'announcement_category',  // Your database has this one!
                'announcement category',
                'Announcement Category',
                'Announcement',
                'announcement',
                'Category',
                'category'
            ];

            let foundData = null;
            let foundCategoryName = null;

            for (const categoryName of possibleNames) {
                console.log(`📢 [MODAL] Trying category name: "${categoryName}"`);
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', categoryName)
                    .eq('is_active', true)
                    .order('sort_order');

                if (!error && data && data.length > 0) {
                    console.log(`📢 [MODAL] SUCCESS! Found categories with name "${categoryName}":`, data);
                    foundData = data;
                    foundCategoryName = categoryName;
                    break;
                } else if (error) {
                    console.log(`📢 [MODAL] Error with "${categoryName}":`, error.message);
                } else {
                    console.log(`📢 [MODAL] No data found for "${categoryName}"`);
                }
            }

            if (foundData && foundData.length > 0) {
                console.log(`📢 [MODAL] SUCCESS! Using categories from "${foundCategoryName}":`, foundData.map(cat => cat.display_text));
                setCategories(foundData.map(cat => cat.display_text));
            } else {
                console.log('📢 [MODAL] ❌ No announcement categories found in any variation!');
                console.log('📢 [MODAL] Available dropdown categories in your database:', allCategories.map(cat => cat.name));
                console.log('📢 [MODAL] ✅ Found "announcement_category" category but it has NO ITEMS!');
                console.log('📢 [MODAL] ⚠️  ACTION NEEDED: Go to Dropdown Menu Management → announcement_category');
                console.log('📢 [MODAL] ➕ ADD THESE ITEMS: General, Safety, Equipment, Policy, Training, Project Updates, Maintenance');
                console.log('📢 [MODAL] 🔄 Then refresh this page - the dropdown will work automatically!');
                console.log('📢 [MODAL] Using hardcoded fallback for now');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
            }
        } catch (error) {
            console.error('📢 [MODAL] Error fetching announcement categories:', error);
            // Fallback to hardcoded categories
            setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    useEffect(() => {
        if (announcement) {
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                category: announcement.category || 'General',
                priority: announcement.priority || 'medium',
                target_roles: announcement.target_roles || [],
                expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
                file_urls: announcement.file_urls || []
            });
            setFiles([]);
        } else {
            setFormData({
                title: '',
                content: '',
                category: 'General',
                priority: 'medium',
                target_roles: [],
                expires_at: '',
                file_urls: []
            });
            setFiles([]);
        }
    }, [announcement, isOpen]);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const handleRemoveFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveExistingFile = (index) => {
        setFormData(prev => ({
            ...prev,
            file_urls: prev.file_urls.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let uploadedUrls = [];

            // Upload new files
            if (files.length > 0) {
                for (const file of files) {
                    const timestamp = Date.now();
                    const randomId = Math.random().toString(36).substring(2, 8);
                    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = `announcements/${timestamp}_${randomId}_${sanitizedFileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('documents')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrl);
                }
            }

            const payload = {
                ...formData,
                author_id: user.id,
                expires_at: formData.expires_at || null,
                target_roles: formData.target_roles.length > 0 ? formData.target_roles : null,
                file_urls: [...(formData.file_urls || []), ...uploadedUrls]
            };

            console.log('📢 [ANNOUNCEMENT] Creating announcement with payload:', payload);
            console.log('📢 [ANNOUNCEMENT] target_roles:', payload.target_roles);
            console.log('📢 [ANNOUNCEMENT] target_roles is array:', Array.isArray(payload.target_roles));
            console.log('📢 [ANNOUNCEMENT] target_roles length:', payload.target_roles?.length);

            let result;
            if (announcement) {
                result = await supabase
                    .from('announcements')
                    .update(payload)
                    .eq('id', announcement.id);
            } else {
                result = await supabase
                    .from('announcements')
                    .insert([payload])
                    .select();  // Add select to get the inserted data back
            }

            if (result.error) throw result.error;

            console.log('📢 [ANNOUNCEMENT] Database result:', result);
            console.log('📢 [ANNOUNCEMENT] Saved announcement data:', result.data?.[0]);

            // Send FCM push notification for new announcements
            if (!announcement) {
                try {
                    const announcementData = {
                        ...formData,
                        id: result.data?.[0]?.id || 'new-announcement'
                    };
                    console.log('📢 [ANNOUNCEMENT] Sending FCM notification for:', announcementData);
                    console.log('📢 [ANNOUNCEMENT] FCM target_roles:', announcementData.target_roles);

                    const fcmResult = await sendAnnouncementFCMNotification(
                        announcementData,
                        user.id
                    );

                    if (fcmResult.success) {
                        console.log(`FCM notifications sent to ${fcmResult.sent} subscribers`);

                        // Show success message with notification count
                        const successMessage = `Announcement created successfully! Notifications sent to ${fcmResult.sent} users.`;
                        showSuccessModal(successMessage, 'Success');
                    } else {
                        console.warn('FCM notification failed:', fcmResult.message);
                        // Still show success for announcement creation, but note notification failure
                        showSuccessModal('Announcement created successfully! (Note: Some notifications may have failed to send)', 'Success');
                    }
                } catch (notifError) {
                    console.error('Error sending FCM notification:', notifError);
                    // Don't fail the announcement creation if notifications fail
                    showSuccessModal('Announcement created successfully! (Note: Push notifications failed to send)', 'Success');
                }
            } else {
                showSuccessModal('Announcement updated successfully!', 'Success');
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving announcement:', error);
            showErrorModal('Error saving announcement: ' + error.message, 'Error');
        } finally {
            setLoading(false);
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={announcement ? 'Edit Announcement' : 'Create Announcement'}>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        placeholder="Announcement title"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Content
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            required
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Announcement content..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Attachments
                        </label>
                        <div className="space-y-3">
                            {/* Existing Files */}
                            {formData.file_urls && formData.file_urls.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Existing Files</p>
                                    {formData.file_urls.map((url, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center space-x-2 truncate">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                    {decodeURIComponent(url.split('/').pop().split('_').slice(2).join('_') || url.split('/').pop())}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExistingFile(index)}
                                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New Files */}
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase">New Files</p>
                                    {files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center space-x-2 truncate">
                                                <Paperclip className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(index)}
                                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="announcement-file-upload"
                                />
                                <label
                                    htmlFor="announcement-file-upload"
                                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex flex-col items-center">
                                        <Paperclip className="w-6 h-6 text-gray-400 mb-1" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Click to attach files
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Combobox
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            options={Array.isArray(categories) && categories.length > 0 ? categories : ['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']}
                        />

                        <Combobox
                            label="Priority"
                            value={formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value.toLowerCase() }))}
                            options={['Low', 'Medium', 'High', 'Urgent']}
                        />
                    </div>

                    <Input
                        label="Expiration Date (optional)"
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {announcement ? 'Update' : 'Create'} Announcement
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// DropdownMenuPage moved to src/components/pages/DropdownMenuPage.jsx


// ProjectsPage has been extracted to src/pages/ProjectsPage.jsx

export default AnnouncementsPage;
