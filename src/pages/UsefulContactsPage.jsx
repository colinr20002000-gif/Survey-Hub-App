import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, User, Users, Plus, Trash2, Edit2, X, Save, Globe, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDepartmentColor } from '../utils/avatarColors';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Select } from '../components/ui';

const UsefulContactsPage = () => {
    const { canAddUsefulContacts, canEditUsefulContacts, canDeleteUsefulContacts } = usePermissions();
    const [contacts, setContacts] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        discipline: '',
        organisation: '',
        address: '',
        email: '',
        phone_number: '',
        website: ''
    });

    useEffect(() => {
        fetchContacts();
        fetchDisciplines();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('useful_contacts')
                .select('*')
                .order('name');

            if (error) throw error;
            setContacts(data || []);
        } catch (error) {
            console.error('Error fetching useful contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDisciplines = async () => {
        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .eq('name', 'useful_contacts')
                .single();

            if (categoryError) throw categoryError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('value, display_text')
                .eq('category_id', categoryData.id)
                .eq('is_active', true)
                .order('sort_order');

            if (itemsError) throw itemsError;
            setDisciplines(itemsData || []);
        } catch (error) {
            console.error('Error fetching disciplines:', error);
        }
    };

    const handleAddContact = async () => {
        try {
            const { data, error } = await supabase
                .from('useful_contacts')
                .insert([formData])
                .select();

            if (error) throw error;

            setContacts([...contacts, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            handleCloseModal();
        } catch (error) {
            console.error('Error adding contact:', error);
            alert('Error adding contact: ' + error.message);
        }
    };

    const handleUpdateContact = async () => {
        try {
            const { data, error } = await supabase
                .from('useful_contacts')
                .update(formData)
                .eq('id', editingContact.id)
                .select();

            if (error) throw error;

            setContacts(contacts.map(c => c.id === editingContact.id ? data[0] : c));
            handleCloseModal();
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Error updating contact: ' + error.message);
        }
    };

    const handleDeleteContact = async (id) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;

        try {
            const { error } = await supabase
                .from('useful_contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setContacts(contacts.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error deleting contact: ' + error.message);
        }
    };

    const handleOpenAddModal = () => {
        setEditingContact(null);
        setFormData({
            name: '',
            discipline: '',
            organisation: '',
            address: '',
            email: '',
            phone_number: '',
            website: ''
        });
        setShowAddModal(true);
    };

    const handleOpenEditModal = (contact) => {
        setEditingContact(contact);
        setFormData({
            name: contact.name || '',
            discipline: contact.discipline || '',
            organisation: contact.organisation || '',
            address: contact.address || '',
            email: contact.email || '',
            phone_number: contact.phone_number || '',
            website: contact.website || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingContact(null);
        setFormData({
            name: '',
            discipline: '',
            organisation: '',
            address: '',
            email: '',
            phone_number: '',
            website: ''
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingContact) {
            handleUpdateContact();
        } else {
            handleAddContact();
        }
    };

    // Group contacts by discipline
    const contactsByDiscipline = useMemo(() => {
        const grouped = {};

        // Sort contacts alphabetically by name first
        const sortedContacts = [...contacts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        sortedContacts.forEach(contact => {
            const disc = contact.discipline || 'No Discipline';
            if (!grouped[disc]) {
                grouped[disc] = [];
            }
            grouped[disc].push(contact);
        });

        // Sort disciplines alphabetically
        return Object.keys(grouped)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, disc) => {
                acc[disc] = grouped[disc];
                return acc;
            }, {});
    }, [contacts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Useful Contacts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Useful Contacts</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage important contact information</p>
                </div>
                {canAddUsefulContacts && (
                    <Button
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Contact
                    </Button>
                )}
            </div>

            {/* Contact Cards Grouped by Discipline */}
            <div className="space-y-8">
                {Object.keys(contactsByDiscipline).map(discipline => (
                    <div key={discipline}>
                        {/* Discipline Header */}
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={20} className="text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{discipline}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({contactsByDiscipline[discipline].length})
                            </span>
                        </div>

                        {/* Discipline Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {contactsByDiscipline[discipline].map(contact => {
                                const disciplineColor = getDepartmentColor(contact.discipline);
                                return (
                                    <div
                                        key={contact.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                                    >
                                        {/* Card Header */}
                                        <div className={`${disciplineColor} p-3 text-white`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold truncate text-sm leading-tight flex-1">{contact.name}</h3>
                                                <div className="flex gap-1">
                                                    {canEditUsefulContacts && (
                                                        <button
                                                            onClick={() => handleOpenEditModal(contact)}
                                                            className="p-1 bg-white bg-opacity-25 rounded hover:bg-opacity-40 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDeleteUsefulContacts && (
                                                        <button
                                                            onClick={() => handleDeleteContact(contact.id)}
                                                            className="p-1 bg-white bg-opacity-25 rounded hover:bg-opacity-40 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-3 space-y-2">
                                            {/* Contact Actions */}
                                            <div className="flex gap-1.5">
                                                {contact.email && (
                                                    <a
                                                        href={`mailto:${contact.email}`}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
                                                        title="Send email"
                                                    >
                                                        <Mail size={14} />
                                                        <span className="hidden sm:inline">Email</span>
                                                    </a>
                                                )}
                                                {contact.phone_number && (
                                                    <a
                                                        href={`tel:${contact.phone_number}`}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs font-medium"
                                                        title="Call"
                                                    >
                                                        <Phone size={14} />
                                                        <span className="hidden sm:inline">Call</span>
                                                    </a>
                                                )}
                                                {contact.website && (
                                                    <a
                                                        href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-xs font-medium"
                                                        title="Visit website"
                                                    >
                                                        <Globe size={14} />
                                                        <span className="hidden sm:inline">Web</span>
                                                    </a>
                                                )}
                                            </div>

                                            {/* Contact Details */}
                                            <div className="space-y-1.5 text-xs">
                                                {contact.email && (
                                                    <div className="flex items-start gap-1.5">
                                                        <Mail size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 break-all leading-tight">{contact.email}</span>
                                                    </div>
                                                )}

                                                {contact.phone_number && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone size={13} className="text-gray-400 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{contact.phone_number}</span>
                                                    </div>
                                                )}

                                                {contact.organisation && (
                                                    <div className="flex items-start gap-1.5">
                                                        <User size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{contact.organisation}</span>
                                                    </div>
                                                )}

                                                {contact.address && (
                                                    <div className="flex items-start gap-1.5">
                                                        <FileText size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-gray-600 dark:text-gray-400 leading-tight block text-[11px]">
                                                                Policy: {contact.address}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {contact.website && (
                                                    <div className="flex items-start gap-1.5">
                                                        <Globe size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <a
                                                            href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 hover:underline leading-tight break-all"
                                                        >
                                                            {contact.website}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {contacts.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No contacts</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {canAddUsefulContacts
                                ? 'Get started by adding your first useful contact.'
                                : 'There are no useful contacts to display.'}
                        </p>
                        {canAddUsefulContacts && (
                            <Button onClick={handleOpenAddModal} className="inline-flex items-center gap-2">
                                <Plus size={20} />
                                Add Contact
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {editingContact ? 'Edit Contact' : 'Add Contact'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <Select
                                            label="Discipline"
                                            value={formData.discipline}
                                            onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                                        >
                                            <option value="">Select Discipline</option>
                                            {disciplines.map(discipline => (
                                                <option key={discipline.value} value={discipline.display_text}>
                                                    {discipline.display_text}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Organisation
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.organisation}
                                            onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Policy Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://example.com"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                        <Save size={20} />
                                        {editingContact ? 'Update' : 'Add'} Contact
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseModal}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsefulContactsPage;
