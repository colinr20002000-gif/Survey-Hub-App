import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, User, Users, Plus, Trash2, Edit2, X, Save, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDepartmentColor } from '../utils/avatarColors';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Select, Combobox } from '../components/ui';

const SubcontractorsPage = () => {
    const { canAddSubcontractors, canEditSubcontractors, canDeleteSubcontractors } = usePermissions();
    const [subcontractors, setSubcontractors] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSubcontractor, setEditingSubcontractor] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile_number: '',
        department: '',
        organisation: '',
        competencies: ''
    });

    useEffect(() => {
        fetchSubcontractors();
        fetchDisciplines();
    }, []);

    const fetchSubcontractors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('subcontractors')
                .select('*')
                .order('name');

            if (error) throw error;
            setSubcontractors(data || []);
        } catch (error) {
            console.error('Error fetching subcontractors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDisciplines = async () => {
        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .eq('name', 'subcontractor_contacts')
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

    const handleAddSubcontractor = async () => {
        try {
            const { data, error } = await supabase
                .from('subcontractors')
                .insert([formData])
                .select();

            if (error) throw error;

            setSubcontractors([...subcontractors, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            handleCloseModal();
        } catch (error) {
            console.error('Error adding subcontractor:', error);
            alert('Error adding subcontractor: ' + error.message);
        }
    };

    const handleUpdateSubcontractor = async () => {
        try {
            const { data, error } = await supabase
                .from('subcontractors')
                .update(formData)
                .eq('id', editingSubcontractor.id)
                .select();

            if (error) throw error;

            setSubcontractors(subcontractors.map(s => s.id === editingSubcontractor.id ? data[0] : s));
            handleCloseModal();
        } catch (error) {
            console.error('Error updating subcontractor:', error);
            alert('Error updating subcontractor: ' + error.message);
        }
    };

    const handleDeleteSubcontractor = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subcontractor?')) return;

        try {
            const { error } = await supabase
                .from('subcontractors')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSubcontractors(subcontractors.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting subcontractor:', error);
            alert('Error deleting subcontractor: ' + error.message);
        }
    };

    const handleOpenAddModal = () => {
        setEditingSubcontractor(null);
        setFormData({
            name: '',
            email: '',
            mobile_number: '',
            department: '',
            organisation: '',
            competencies: ''
        });
        setShowAddModal(true);
    };

    const handleOpenEditModal = (subcontractor) => {
        setEditingSubcontractor(subcontractor);
        setFormData({
            name: subcontractor.name || '',
            email: subcontractor.email || '',
            mobile_number: subcontractor.mobile_number || '',
            department: subcontractor.department || '',
            organisation: subcontractor.organisation || '',
            competencies: subcontractor.competencies || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingSubcontractor(null);
        setFormData({
            name: '',
            email: '',
            mobile_number: '',
            department: '',
            organisation: '',
            competencies: ''
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingSubcontractor) {
            handleUpdateSubcontractor();
        } else {
            handleAddSubcontractor();
        }
    };

    // Group subcontractors by discipline
    const subcontractorsByDiscipline = useMemo(() => {
        const grouped = {};

        // Sort subcontractors alphabetically by name first
        const sortedSubcontractors = [...subcontractors].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        sortedSubcontractors.forEach(subcontractor => {
            const disc = subcontractor.department || 'No Discipline';
            if (!grouped[disc]) {
                grouped[disc] = [];
            }
            grouped[disc].push(subcontractor);
        });

        // Sort disciplines alphabetically
        return Object.keys(grouped)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, disc) => {
                acc[disc] = grouped[disc];
                return acc;
            }, {});
    }, [subcontractors]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Subcontractors...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Subcontractors</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage external contractor contacts</p>
                </div>
                {canAddSubcontractors && (
                    <Button
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Subcontractor
                    </Button>
                )}
            </div>

            {/* Subcontractor Cards Grouped by Discipline */}
            <div className="space-y-8">
                {Object.keys(subcontractorsByDiscipline).map(discipline => (
                    <div key={discipline}>
                        {/* Discipline Header */}
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={20} className="text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{discipline}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({subcontractorsByDiscipline[discipline].length})
                            </span>
                        </div>

                        {/* Discipline Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {subcontractorsByDiscipline[discipline].map(subcontractor => {
                                const departmentColor = getDepartmentColor(subcontractor.department);
                                return (
                                    <div
                                        key={subcontractor.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                                    >
                                        {/* Card Header */}
                                        <div className={`${departmentColor} p-3 text-white`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold truncate text-sm leading-tight flex-1">{subcontractor.name}</h3>
                                                <div className="flex gap-1">
                                                    {canEditSubcontractors && (
                                                        <button
                                                            onClick={() => handleOpenEditModal(subcontractor)}
                                                            className="p-1 bg-white bg-opacity-25 rounded hover:bg-opacity-40 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDeleteSubcontractors && (
                                                        <button
                                                            onClick={() => handleDeleteSubcontractor(subcontractor.id)}
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
                                                {subcontractor.email && (
                                                    <a
                                                        href={`mailto:${subcontractor.email}`}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
                                                        title="Send email"
                                                    >
                                                        <Mail size={14} />
                                                        <span className="hidden sm:inline">Email</span>
                                                    </a>
                                                )}
                                                {subcontractor.mobile_number && (
                                                    <a
                                                        href={`tel:${subcontractor.mobile_number}`}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs font-medium"
                                                        title="Call"
                                                    >
                                                        <Phone size={14} />
                                                        <span className="hidden sm:inline">Call</span>
                                                    </a>
                                                )}
                                            </div>

                                            {/* Subcontractor Details */}
                                            <div className="space-y-1.5 text-xs">
                                                {subcontractor.email && (
                                                    <div className="flex items-start gap-1.5">
                                                        <Mail size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 break-all leading-tight">{subcontractor.email}</span>
                                                    </div>
                                                )}

                                                {subcontractor.mobile_number && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone size={13} className="text-gray-400 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{subcontractor.mobile_number}</span>
                                                    </div>
                                                )}

                                                {subcontractor.organisation && (
                                                    <div className="flex items-start gap-1.5">
                                                        <User size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{subcontractor.organisation}</span>
                                                    </div>
                                                )}

                                                {subcontractor.competencies && (
                                                    <div className="flex items-start gap-1.5">
                                                        <MessageSquare size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-gray-600 dark:text-gray-400 leading-tight block">
                                                                {subcontractor.competencies}
                                                            </span>
                                                        </div>
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
            {subcontractors.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No subcontractors</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {canAddSubcontractors
                                ? 'Get started by adding your first subcontractor contact.'
                                : 'There are no subcontractor contacts to display.'}
                        </p>
                        {canAddSubcontractors && (
                            <Button onClick={handleOpenAddModal} className="inline-flex items-center gap-2">
                                <Plus size={20} />
                                Add Subcontractor
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
                                    {editingSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor'}
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
                                            Mobile Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.mobile_number}
                                            onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <Combobox
                                            label="Discipline"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            options={disciplines.map(d => d.display_text)}
                                            placeholder="Select Discipline"
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Comments
                                    </label>
                                    <textarea
                                        value={formData.competencies}
                                        onChange={(e) => setFormData({ ...formData, competencies: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                        <Save size={20} />
                                        {editingSubcontractor ? 'Update' : 'Add'} Subcontractor
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

export default SubcontractorsPage;
