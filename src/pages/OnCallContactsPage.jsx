import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Edit, Trash2, Calendar } from 'lucide-react';
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

    const { can } = usePermissions();
    const canView = can('VIEW_ON_CALL_CONTACTS');
    const canCreate = can('CREATE_ON_CALL_CONTACTS');
    const canEdit = can('EDIT_ON_CALL_CONTACTS');
    const canDelete = can('DELETE_ON_CALL_CONTACTS');

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
        } catch (error) {
            console.error('Error fetching on-call contacts:', error);
            showErrorModal('Error loading on-call contacts');
        } finally {
            setLoading(false);
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

    const sortedContacts = useMemo(() => {
        return [...contacts].sort((a, b) => {
            const dateA = new Date(a.week_start_date);
            const dateB = new Date(b.week_start_date);
            return dateA - dateB;
        });
    }, [contacts]);

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
                {canCreate && (
                    <Button onClick={() => { setEditingContact(null); setIsModalOpen(true); }}>
                        <PlusCircle size={16} className="mr-2" />Add On-Call Contact
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {sortedContacts.map(contact => {
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
                                {(canEdit || canDelete) && (
                                    <div className="flex gap-2">
                                        {canEdit && (
                                            <button
                                                onClick={() => { setEditingContact(contact); setIsModalOpen(true); }}
                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {canDelete && (
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
                {sortedContacts.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            No on-call contacts found. {canCreate && 'Click "Add On-Call Contact" to create one.'}
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
