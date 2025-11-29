import React, { useState, useEffect, useMemo } from 'react';
import { Link as LinkIcon, Plus, Trash2, Edit2, X, Save, ExternalLink, Folder } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDepartmentColor } from '../utils/avatarColors';
import { useAuth } from '../contexts/AuthContext';
import { Button, Select } from '../components/ui';

const UsefulLinksPage = () => {
    const { user } = useAuth();
    const [links, setLinks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [formData, setFormData] = useState({
        display_name: '',
        url: '',
        category_id: '',
        description: ''
    });

    useEffect(() => {
        fetchLinks();
        fetchCategories();
    }, []);

    const fetchLinks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('useful_links')
                .select(`
                    *,
                    dropdown_items:category_id (
                        id,
                        value,
                        display_text,
                        sort_order
                    ),
                    users:created_by (
                        name
                    )
                `)
                .order('display_name');

            if (error) throw error;
            setLinks(data || []);
        } catch (error) {
            console.error('Error fetching useful links:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .eq('name', 'useful_links')
                .single();

            if (categoryError) throw categoryError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('id, value, display_text, sort_order')
                .eq('category_id', categoryData.id)
                .eq('is_active', true)
                .order('sort_order');

            if (itemsError) throw itemsError;
            setCategories(itemsData || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleAddLink = async () => {
        try {
            const { data, error } = await supabase
                .from('useful_links')
                .insert([{
                    ...formData,
                    created_by: user?.id
                }])
                .select(`
                    *,
                    dropdown_items:category_id (
                        id,
                        value,
                        display_text,
                        sort_order
                    ),
                    users:created_by (
                        name
                    )
                `);

            if (error) throw error;

            setLinks([...links, data[0]].sort((a, b) => a.display_name.localeCompare(b.display_name)));
            handleCloseModal();
        } catch (error) {
            console.error('Error adding link:', error);
            alert('Error adding link: ' + error.message);
        }
    };

    const handleUpdateLink = async () => {
        try {
            const { data, error } = await supabase
                .from('useful_links')
                .update(formData)
                .eq('id', editingLink.id)
                .select(`
                    *,
                    dropdown_items:category_id (
                        id,
                        value,
                        display_text,
                        sort_order
                    ),
                    users:created_by (
                        name
                    )
                `);

            if (error) throw error;

            setLinks(links.map(link => link.id === editingLink.id ? data[0] : link));
            handleCloseModal();
        } catch (error) {
            console.error('Error updating link:', error);
            alert('Error updating link: ' + error.message);
        }
    };

    const handleDeleteLink = async (id) => {
        if (!window.confirm('Are you sure you want to delete this link?')) return;

        try {
            const { error } = await supabase
                .from('useful_links')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setLinks(links.filter(link => link.id !== id));
        } catch (error) {
            console.error('Error deleting link:', error);
            alert('Error deleting link: ' + error.message);
        }
    };

    const handleOpenAddModal = () => {
        setEditingLink(null);
        setFormData({
            display_name: '',
            url: '',
            category_id: '',
            description: ''
        });
        setShowAddModal(true);
    };

    const handleOpenEditModal = (link) => {
        setEditingLink(link);
        setFormData({
            display_name: link.display_name || '',
            url: link.url || '',
            category_id: link.category_id || '',
            description: link.description || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingLink(null);
        setFormData({
            display_name: '',
            url: '',
            category_id: '',
            description: ''
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingLink) {
            handleUpdateLink();
        } else {
            handleAddLink();
        }
    };

    // Group links by category
    const linksByCategory = useMemo(() => {
        const grouped = {};

        // Sort links alphabetically by display name first
        const sortedLinks = [...links].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));

        sortedLinks.forEach(link => {
            const categoryName = link.dropdown_items?.display_text || 'Uncategorized';
            const sortOrder = link.dropdown_items?.sort_order ?? 999;
            if (!grouped[categoryName]) {
                grouped[categoryName] = {
                    links: [],
                    sortOrder: sortOrder
                };
            }
            grouped[categoryName].links.push(link);
        });

        // Sort categories by sort_order instead of alphabetically
        return Object.keys(grouped)
            .sort((a, b) => grouped[a].sortOrder - grouped[b].sortOrder)
            .reduce((acc, cat) => {
                acc[cat] = grouped[cat].links;
                return acc;
            }, {});
    }, [links]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Useful Links...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Useful Links</h1>
                    <p className="text-gray-600 dark:text-gray-400">Quick access to important websites and resources</p>
                </div>
                <Button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Link
                </Button>
            </div>

            {/* Link Cards Grouped by Category */}
            <div className="space-y-8">
                {Object.keys(linksByCategory).map(category => (
                    <div key={category}>
                        {/* Category Header */}
                        <div className="flex items-center gap-2 mb-4">
                            <Folder size={20} className="text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({linksByCategory[category].length})
                            </span>
                        </div>

                        {/* Category Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {linksByCategory[category].map(link => {
                                const categoryColor = getDepartmentColor(link.dropdown_items?.display_text);
                                return (
                                    <div
                                        key={link.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col"
                                    >
                                        {/* Card Header */}
                                        <div className={`${categoryColor} p-3 text-white`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold truncate text-sm leading-tight flex-1">
                                                    {link.display_name}
                                                </h3>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleOpenEditModal(link)}
                                                        className="p-1 bg-white bg-opacity-25 rounded hover:bg-opacity-40 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        className="p-1 bg-white bg-opacity-25 rounded hover:bg-opacity-40 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-3 space-y-2 flex-1 flex flex-col">
                                            {/* Description */}
                                            {link.description && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight flex-1">
                                                    {link.description}
                                                </p>
                                            )}

                                            {/* Visit Button */}
                                            <a
                                                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-auto flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm font-medium"
                                            >
                                                <ExternalLink size={16} />
                                                Visit Link
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {links.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LinkIcon size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No links yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Get started by adding your first useful link.
                        </p>
                        <Button onClick={handleOpenAddModal} className="inline-flex items-center gap-2">
                            <Plus size={20} />
                            Add Link
                        </Button>
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
                                    {editingLink ? 'Edit Link' : 'Add Link'}
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
                                            Display Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.display_name}
                                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            placeholder="e.g., Network Rail Standards"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <Select
                                            label={<>Category <span className="text-red-500">*</span></>}
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.display_text}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://example.com"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Optional description of this link..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                        <Save size={20} />
                                        {editingLink ? 'Update' : 'Add'} Link
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

export default UsefulLinksPage;
