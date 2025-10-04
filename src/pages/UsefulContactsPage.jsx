import React, { useState, useEffect, useMemo } from 'react';
import { Search, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui';
import { useDebouncedValue } from '../utils/debounce';

const UsefulContactsPage = () => {
    const { showSuccessModal, showErrorModal } = useToast();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
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

    const handleSaveContact = async (contactData) => {
        try {
            if (editingContact) {
                const { error } = await supabase
                    .from('useful_contacts')
                    .update(contactData)
                    .eq('id', editingContact.id);

                if (error) throw error;
                showSuccessModal('Contact updated successfully');
            } else {
                const { error } = await supabase
                    .from('useful_contacts')
                    .insert([contactData]);

                if (error) throw error;
                showSuccessModal('Contact added successfully');
            }
            fetchContacts();
            setIsModalOpen(false);
            setEditingContact(null);
        } catch (error) {
            console.error('Error saving contact:', error);
            showErrorModal('Error saving contact');
        }
    };

    const handleDeleteContact = async (contactId) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;

        try {
            const { error } = await supabase
                .from('useful_contacts')
                .delete()
                .eq('id', contactId);

            if (error) throw error;
            showSuccessModal('Contact deleted successfully');
            fetchContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            showErrorModal('Error deleting contact');
        }
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const filteredContacts = useMemo(() => {
        let filtered = contacts.filter(contact =>
            (contact.name && contact.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (contact.email && contact.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (contact.phone_number && contact.phone_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (contact.address && contact.address.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (contact.organisation && contact.organisation.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (contact.website && contact.website.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        );

        // Sort the filtered contacts
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [contacts, debouncedSearchTerm, sortConfig]);

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Useful Contacts...</div>;
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Useful Contacts</h1>
                <Button onClick={() => { setEditingContact(null); setIsModalOpen(true); }}>
                    <PlusCircle size={16} className="mr-2" />Add Contact
                </Button>
            </div>

            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Name {getSortIndicator('name')}
                                </th>
                                <th onClick={() => handleSort('organisation')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Organisation {getSortIndicator('organisation')}
                                </th>
                                <th onClick={() => handleSort('address')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Address {getSortIndicator('address')}
                                </th>
                                <th onClick={() => handleSort('email')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Email {getSortIndicator('email')}
                                </th>
                                <th onClick={() => handleSort('phone_number')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Phone Number {getSortIndicator('phone_number')}
                                </th>
                                <th onClick={() => handleSort('website')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Website {getSortIndicator('website')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredContacts.map(contact => (
                                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{contact.organisation || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{contact.address || '-'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {contact.email ? (
                                            <a href={`mailto:${contact.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {contact.email}
                                            </a>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {contact.phone_number ? (
                                            <a href={`tel:${contact.phone_number}`} className="md:pointer-events-none md:cursor-default text-blue-600 dark:text-blue-400 md:text-gray-900 md:dark:text-gray-100 hover:underline md:hover:no-underline">
                                                {contact.phone_number}
                                            </a>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {contact.website ? (
                                            <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {contact.website}
                                            </a>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        <button
                                            onClick={() => { setEditingContact(contact); setIsModalOpen(true); }}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteContact(contact.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredContacts.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No contacts found. Click "Add Contact" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <UsefulContactModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingContact(null); }}
                onSave={handleSaveContact}
                contact={editingContact}
            />
        </div>
    );
};

const UsefulContactModal = ({ isOpen, onClose, onSave, contact }) => {
    const [formData, setFormData] = useState({
        name: '',
        organisation: '',
        address: '',
        email: '',
        phone_number: '',
        website: ''
    });

    useEffect(() => {
        if (contact) {
            setFormData({
                name: contact.name || '',
                organisation: contact.organisation || '',
                address: contact.address || '',
                email: contact.email || '',
                phone_number: contact.phone_number || '',
                website: contact.website || ''
            });
        } else {
            setFormData({
                name: '',
                organisation: '',
                address: '',
                email: '',
                phone_number: '',
                website: ''
            });
        }
    }, [contact, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Name is required');
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {contact ? 'Edit Contact' : 'Add New Contact'}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Organisation
                                </label>
                                <input
                                    type="text"
                                    value={formData.organisation}
                                    onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Address
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                </div>
            </div>
        </div>
    );
};

export default UsefulContactsPage;
