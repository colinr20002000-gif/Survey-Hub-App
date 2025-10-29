import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Edit, Trash2, Calendar, Archive, ArchiveRestore } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../supabaseClient';
import { Button, Modal } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import { getWeekStartDate, addDays, formatDateForDisplay, formatDateForKey, getFiscalWeek } from '../utils/dateHelpers';

const OnCallContactsPage = () => {
    const { showSuccessModal, showErrorModal } = useToast();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [activeTab, setActiveTab] = useState('active');

    const { can } = usePermissions();
    const canView = can('VIEW_ON_CALL_CONTACTS');
    const canCreate = can('CREATE_ON_CALL_CONTACTS');
    const canEdit = can('EDIT_ON_CALL_CONTACTS');
    const canDelete = can('DELETE_ON_CALL_CONTACTS');
    const canArchive = can('ARCHIVE_ON_CALL_CONTACTS');
    const canViewArchive = can('VIEW_ARCHIVED_ON_CALL_CONTACTS');

    useEffect(() => {
        if (canView) {
            fetchContacts();
        } else {
            setLoading(false);
        }
    }, [canView]);

    const fetchContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('on_call_contacts')
                .select('*')
                .order('week_start_date', { ascending: true });

            if (error) throw error;
            setContacts(data || []);

            // Auto-archive contacts that are past their date range (with 1-day delay)
            if (canArchive && data) {
                await autoArchiveOldContacts(data);
            }
        } catch (error) {
            console.error('Error fetching on-call contacts:', error);
            showErrorModal('Error loading on-call contacts');
        } finally {
            setLoading(false);
        }
    };

    const autoArchiveOldContacts = async (contactsList) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate the threshold date (1 day ago from today)
            const thresholdDate = new Date(today);
            thresholdDate.setDate(thresholdDate.getDate() - 1);

            // Find contacts that need to be archived
            const contactsToArchive = contactsList.filter(contact => {
                if (contact.archived) return false; // Skip already archived

                const weekEndDate = new Date(contact.week_end_date);
                weekEndDate.setHours(0, 0, 0, 0);

                // Archive if week_end_date is before threshold (more than 1 day old)
                return weekEndDate < thresholdDate;
            });

            // Archive them
            if (contactsToArchive.length > 0) {
                const idsToArchive = contactsToArchive.map(c => c.id);

                const { error } = await supabase
                    .from('on_call_contacts')
                    .update({ archived: true })
                    .in('id', idsToArchive);

                if (error) throw error;

                console.log(`Auto-archived ${contactsToArchive.length} old on-call contacts`);

                // Refresh the contacts list
                const { data: refreshedData, error: refreshError } = await supabase
                    .from('on_call_contacts')
                    .select('*')
                    .order('week_start_date', { ascending: true });

                if (!refreshError) {
                    setContacts(refreshedData || []);
                }
            }
        } catch (error) {
            console.error('Error auto-archiving old contacts:', error);
            // Don't show error to user as this is background process
        }
    };

    const handleSaveContact = async (contactData) => {
        try {
            if (editingContact) {
                const { error } = await supabase
                    .from('on_call_contacts')
                    .update(contactData)
                    .eq('id', editingContact.id);

                if (error) throw error;
                showSuccessModal('On-call contact updated successfully');
            } else {
                const { error } = await supabase
                    .from('on_call_contacts')
                    .insert([contactData]);

                if (error) throw error;
                showSuccessModal('On-call contact added successfully');
            }
            fetchContacts();
            setIsModalOpen(false);
            setEditingContact(null);
        } catch (error) {
            console.error('Error saving on-call contact:', error);
            showErrorModal('Error saving on-call contact');
        }
    };

    const handleDeleteContact = async (contactId) => {
        if (!window.confirm('Are you sure you want to delete this on-call contact?')) return;

        try {
            const { error } = await supabase
                .from('on_call_contacts')
                .delete()
                .eq('id', contactId);

            if (error) throw error;
            showSuccessModal('On-call contact deleted successfully');
            fetchContacts();
        } catch (error) {
            console.error('Error deleting on-call contact:', error);
            showErrorModal('Error deleting on-call contact');
        }
    };

    const handleArchiveContact = async (contactId) => {
        try {
            const { error } = await supabase
                .from('on_call_contacts')
                .update({ archived: true })
                .eq('id', contactId);

            if (error) throw error;
            showSuccessModal('On-call contact archived successfully');
            fetchContacts();
        } catch (error) {
            console.error('Error archiving on-call contact:', error);
            showErrorModal('Error archiving on-call contact');
        }
    };

    const handleUnarchiveContact = async (contactId) => {
        try {
            const { error } = await supabase
                .from('on_call_contacts')
                .update({ archived: false })
                .eq('id', contactId);

            if (error) throw error;
            showSuccessModal('On-call contact restored successfully');
            fetchContacts();
        } catch (error) {
            console.error('Error unarchiving on-call contact:', error);
            showErrorModal('Error unarchiving on-call contact');
        }
    };

    const handleDeleteAllArchived = async () => {
        if (!window.confirm('Are you sure you want to permanently delete ALL archived on-call contacts? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('on_call_contacts')
                .delete()
                .eq('archived', true);

            if (error) throw error;
            showSuccessModal('All archived on-call contacts deleted successfully');
            fetchContacts();
        } catch (error) {
            console.error('Error deleting archived contacts:', error);
            showErrorModal('Error deleting archived contacts');
        }
    };

    const activeContacts = useMemo(() => {
        return contacts
            .filter(c => !c.archived)
            .sort((a, b) => {
                const dateA = new Date(a.week_start_date);
                const dateB = new Date(b.week_start_date);
                return dateA - dateB;
            });
    }, [contacts]);

    const archivedContacts = useMemo(() => {
        return contacts
            .filter(c => c.archived)
            .sort((a, b) => {
                const dateA = new Date(a.week_start_date);
                const dateB = new Date(b.week_start_date);
                return dateB - dateA; // Most recent first in archive
            });
    }, [contacts]);

    const displayedContacts = activeTab === 'active' ? activeContacts : archivedContacts;

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading On-Call Contacts...</div>;
    }

    if (!canView) {
        return (
            <div className="p-8 text-center">
                <p className="text-xl text-red-600 dark:text-red-400">You do not have permission to view on-call contacts.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">On-Call Contacts</h1>
                <div className="flex gap-3">
                    {activeTab === 'archive' && canArchive && archivedContacts.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteAllArchived}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                        >
                            <Trash2 size={16} className="mr-2" />Delete All Archived
                        </Button>
                    )}
                    {canCreate && activeTab === 'active' && (
                        <Button onClick={() => { setEditingContact(null); setIsModalOpen(true); }}>
                            <PlusCircle size={16} className="mr-2" />Add On-Call Contact
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                            activeTab === 'active'
                                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        Active ({activeContacts.length})
                    </button>
                    {canViewArchive && (
                        <button
                            onClick={() => setActiveTab('archive')}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                activeTab === 'archive'
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <Archive size={16} className="inline mr-1" />
                            Archive ({archivedContacts.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {displayedContacts.map(contact => {
                    const weekStart = new Date(contact.week_start_date);
                    const weekEnd = new Date(contact.week_end_date);
                    const fiscalWeek = getFiscalWeek(weekStart);

                    return (
                        <div key={contact.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-orange-500" size={24} />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Week {fiscalWeek}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {formatDateForDisplay(weekStart)} - {formatDateForDisplay(weekEnd)}
                                        </p>
                                    </div>
                                </div>
                                {(canEdit || canDelete || canArchive) && (
                                    <div className="flex gap-2">
                                        {canEdit && activeTab === 'active' && (
                                            <button
                                                onClick={() => { setEditingContact(contact); setIsModalOpen(true); }}
                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {canArchive && activeTab === 'active' && (
                                            <button
                                                onClick={() => handleArchiveContact(contact.id)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Archive"
                                            >
                                                <Archive size={18} />
                                            </button>
                                        )}
                                        {canDelete && activeTab === 'active' && (
                                            <button
                                                onClick={() => handleDeleteContact(contact.id)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        {canArchive && activeTab === 'archive' && (
                                            <button
                                                onClick={() => handleUnarchiveContact(contact.id)}
                                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="Restore"
                                            >
                                                <ArchiveRestore size={18} />
                                            </button>
                                        )}
                                        {canDelete && activeTab === 'archive' && (
                                            <button
                                                onClick={() => handleDeleteContact(contact.id)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{contact.content}</p>
                            </div>
                        </div>
                    );
                })}
                {displayedContacts.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            {activeTab === 'active'
                                ? `No active on-call contacts found. ${canCreate ? 'Click "Add On-Call Contact" to create one.' : ''}`
                                : 'No archived on-call contacts.'
                            }
                        </p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <OnCallContactModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingContact(null); }}
                    onSave={handleSaveContact}
                    contact={editingContact}
                />
            )}
        </div>
    );
};

const OnCallContactModal = ({ isOpen, onClose, onSave, contact }) => {
    const [formData, setFormData] = useState({
        week_start_date: '',
        week_end_date: '',
        content: ''
    });
    const [selectedWeek, setSelectedWeek] = useState(null);

    // Generate list of weeks (current week + next 12 weeks)
    const weekOptions = useMemo(() => {
        const weeks = [];
        const today = new Date();
        const currentWeekStart = getWeekStartDate(today);

        for (let i = 0; i < 13; i++) {
            const weekStart = addDays(currentWeekStart, i * 7);
            const weekEnd = addDays(weekStart, 6);
            const fiscalWeek = getFiscalWeek(weekStart);

            weeks.push({
                start: weekStart,
                end: weekEnd,
                fiscalWeek: fiscalWeek,
                startKey: formatDateForKey(weekStart),
                endKey: formatDateForKey(weekEnd),
                label: `Week ${fiscalWeek} (${formatDateForDisplay(weekStart)} - ${formatDateForDisplay(weekEnd)})`
            });
        }

        return weeks;
    }, []);

    useEffect(() => {
        if (contact) {
            setFormData({
                week_start_date: contact.week_start_date,
                week_end_date: contact.week_end_date,
                content: contact.content || ''
            });
            setSelectedWeek(contact.week_start_date);
        } else {
            // Default to current week
            const currentWeek = weekOptions[0];
            setFormData({
                week_start_date: currentWeek.startKey,
                week_end_date: currentWeek.endKey,
                content: ''
            });
            setSelectedWeek(currentWeek.startKey);
        }
    }, [contact, isOpen, weekOptions]);

    const handleWeekChange = (weekStartKey) => {
        const week = weekOptions.find(w => w.startKey === weekStartKey);
        if (week) {
            setSelectedWeek(weekStartKey);
            setFormData({
                ...formData,
                week_start_date: week.startKey,
                week_end_date: week.endKey
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.content.trim()) {
            alert('Content is required');
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contact ? 'Edit On-Call Contact' : 'Add On-Call Contact'}>
            <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Working Week <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedWeek || ''}
                            onChange={(e) => handleWeekChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            {weekOptions.map(week => (
                                <option key={week.startKey} value={week.startKey}>
                                    {week.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            On-Call Information <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows="8"
                            placeholder="Enter on-call manager details, contact information, and any other relevant information for this week..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit">
                        {contact ? 'Update' : 'Add'} Contact
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default OnCallContactsPage;
