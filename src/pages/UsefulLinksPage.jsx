import React, { useState, useEffect, useMemo } from 'react';
import { Link as LinkIcon, Plus, Trash2, Edit2, X, Save, ExternalLink, Folder, Edit3, Globe, ChevronRight, ChevronDown, Search } from 'lucide-react';
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
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState({});
    const [formData, setFormData] = useState({
        display_name: '',
        url: '',
        category_id: '',
        description: ''
    });

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

    useEffect(() => {
        fetchLinks();
        fetchCategories();
    }, []);

    // Filter and group links
    const linksByCategory = useMemo(() => {
        const grouped = {};

        // Filter by search term first
        const filteredLinks = links.filter(link => 
            link.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Sort links alphabetically by display name
        const sortedLinks = [...filteredLinks].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));

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

        // Sort categories by sort_order
        return Object.keys(grouped)
            .sort((a, b) => grouped[a].sortOrder - grouped[b].sortOrder)
            .reduce((acc, cat) => {
                acc[cat] = grouped[cat].links;
                return acc;
            }, {});
    }, [links, searchTerm]);

    // Effect to initialize all categories as collapsed when linksByCategory changes
    useEffect(() => {
        const initialCollapsedState = {};
        Object.keys(linksByCategory).forEach(category => {
            initialCollapsedState[category] = true; // Set all to true (collapsed)
        });
        setCollapsedCategories(initialCollapsedState);
    }, [linksByCategory]);

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

    const handleDeleteLink = async (id, e) => {
        e.stopPropagation(); // Prevent row click
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

    const toggleCategory = (category) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
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

    const handleOpenEditModal = (link, e) => {
        e.stopPropagation(); // Prevent row click
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Loading resources...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Useful Links
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Curated resources, tools, and external references for the team.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search links..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setEditMode(!editMode)}
                                variant={editMode ? "default" : "outline"}
                                className={`h-11 px-4 rounded-xl border-gray-200 dark:border-gray-600 transition-all ${
                                    editMode 
                                        ? 'bg-orange-500 text-white border-transparent shadow-lg shadow-orange-500/30 hover:bg-orange-600' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Edit3 size={18} />
                                    <span className="font-medium">{editMode ? 'Done' : 'Manage'}</span>
                                </div>
                            </Button>
                            <Button
                                onClick={handleOpenAddModal}
                                className="h-11 px-5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg shadow-gray-900/20 dark:shadow-none transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Plus size={20} />
                                    <span className="font-bold">Add Link</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Categories List */}
                <div className="space-y-8">
                    {Object.keys(linksByCategory).map(category => {
                        const isCollapsed = collapsedCategories[category];
                        
                        return (
                            <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                                {/* Category Header */}
                                <div 
                                    onClick={() => toggleCategory(category)}
                                    className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg shadow-sm border transition-all ${isCollapsed ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-orange-500'}`}>
                                            <Folder size={18} />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{category}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {linksByCategory[category].length}
                                        </span>
                                    </div>
                                    <div className={`text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                        <ChevronDown size={20} />
                                    </div>
                                </div>

                                {/* Links Rows */}
                                {!isCollapsed && (
                                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50 animate-in slide-in-from-top-2 duration-200">
                                        {linksByCategory[category].map(link => {
                                            const categoryColor = getDepartmentColor(link.dropdown_items?.display_text);
                                            
                                            return (
                                                <div
                                                    key={link.id}
                                                    onClick={() => window.open(link.url.startsWith('http') ? link.url : `https://${link.url}`, '_blank')}
                                                    className="group relative p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all cursor-pointer flex items-center gap-4 sm:gap-6"
                                                >
                                                    {/* Icon */}
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${categoryColor} group-hover:scale-110 transition-transform duration-300`}>
                                                        <Globe size={24} className="opacity-90" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start gap-2 mb-1">
                                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors whitespace-normal break-words">
                                                                {link.display_name}
                                                            </h3>
                                                            <ExternalLink size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                                                        </div>
                                                        {link.description && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {link.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 font-mono opacity-60">
                                                            {link.url}
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2">
                                                        {editMode ? (
                                                            <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    onClick={(e) => handleOpenEditModal(link, e)}
                                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteLink(link.id, e)}
                                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                                                                <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                                                    <ChevronRight size={20} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {links.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 text-center">
                        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-12">
                            <LinkIcon size={40} className="text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No links found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                            {searchTerm ? `No results found for "${searchTerm}"` : "Get started by building your library of useful resources."}
                        </p>
                        <Button onClick={handleOpenAddModal} className="inline-flex items-center gap-2 px-8 py-3 h-auto text-lg rounded-xl">
                            <Plus size={24} />
                            Add First Link
                        </Button>
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {editingLink ? <Edit3 size={22} className="text-orange-500" /> : <Plus size={22} className="text-orange-500" />}
                                    {editingLink ? 'Edit Resource' : 'Add Resource'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Display Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.display_name}
                                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            placeholder="e.g., Network Rail Standards"
                                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <Select
                                            label={<>Category <span className="text-red-500">*</span></>}
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            required
                                            className="w-full"
                                        >
                                            <option value="">Select a Category...</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.display_text}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            URL <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Globe size={18} />
                                            </div>
                                            <input
                                                type="url"
                                                required
                                                value={formData.url}
                                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                placeholder="https://example.com"
                                                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Brief description of this resource..."
                                            rows={3}
                                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseModal}
                                        className="flex-1 h-11 rounded-xl border-gray-200 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Save size={20} />
                                            {editingLink ? 'Update Resource' : 'Save Resource'}
                                        </div>
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsefulLinksPage;
