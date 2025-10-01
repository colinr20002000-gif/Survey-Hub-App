import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Select, Modal, ConfirmationModal } from '../ui';
import { PlusCircle, Edit, Trash2, ChevronUp, ChevronDown, Loader2, List } from 'lucide-react';

const DropdownMenuPage = () => {
    const { user: currentUser } = useAuth();
    const isAdminOrSuperAdmin = currentUser && (currentUser.privilege === 'Admin' || currentUser.privilege === 'Super Admin');

    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
    const [isPasteListModalOpen, setIsPasteListModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [deleteCategoryConfirmation, setDeleteCategoryConfirmation] = useState(null);
    const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);
    const { showSuccessModal, showErrorModal } = useToast();

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchItems(selectedCategory.id);
        } else {
            setItems([]);
        }
    }, [selectedCategory]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('dropdown_categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);

            // Auto-select Team Role category if it exists
            if (data && data.length > 0) {
                const teamRoleCategory = data.find(cat => cat.name === 'team_role');
                if (teamRoleCategory) {
                    setSelectedCategory(teamRoleCategory);
                } else {
                    setSelectedCategory(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            showErrorModal('Error loading dropdown categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async (categoryId) => {
        try {
            setItemsLoading(true);
            const { data, error } = await supabase
                .from('dropdown_items')
                .select('*')
                .eq('category_id', categoryId)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
            showErrorModal('Error loading dropdown items');
        } finally {
            setItemsLoading(false);
        }
    };

    const createCategory = async (categoryData) => {
        try {
            setCategoryLoading(true);
            const { data, error } = await supabase
                .from('dropdown_categories')
                .insert([categoryData])
                .select()
                .single();

            if (error) throw error;

            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setIsCreateCategoryModalOpen(false);
            showSuccessModal('Category created successfully');
        } catch (error) {
            console.error('Error creating category:', error);
            showErrorModal('Error creating category');
        } finally {
            setCategoryLoading(false);
        }
    };

    const updateCategory = async (categoryId, categoryData) => {
        try {
            setCategoryLoading(true);
            const { data, error } = await supabase
                .from('dropdown_categories')
                .update(categoryData)
                .eq('id', categoryId)
                .select()
                .single();

            if (error) throw error;

            setCategories(prev => prev.map(cat => cat.id === categoryId ? data : cat).sort((a, b) => a.name.localeCompare(b.name)));

            // Update selectedCategory if it was the one being edited
            if (selectedCategory?.id === categoryId) {
                setSelectedCategory(data);
            }

            setIsEditCategoryModalOpen(false);
            setSelectedCategoryForEdit(null);
            showSuccessModal('Category updated successfully');
        } catch (error) {
            console.error('Error updating category:', error);
            showErrorModal('Error updating category');
        } finally {
            setCategoryLoading(false);
        }
    };

    const deleteCategory = async (categoryId) => {
        try {
            setCategoryLoading(true);

            // First check if there are items in this category
            const { data: itemsCheck, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('id')
                .eq('category_id', categoryId);

            if (itemsError) throw itemsError;

            if (itemsCheck && itemsCheck.length > 0) {
                showErrorModal('Cannot delete category with existing items. Please delete all items first.');
                return;
            }

            const { error } = await supabase
                .from('dropdown_categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;

            setCategories(prev => prev.filter(cat => cat.id !== categoryId));

            // Clear selection if deleted category was selected
            if (selectedCategory?.id === categoryId) {
                setSelectedCategory(null);
                setItems([]);
            }

            setDeleteCategoryConfirmation(null);
            showSuccessModal('Category deleted successfully');
        } catch (error) {
            console.error('Error deleting category:', error);
            showErrorModal('Error deleting category');
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleEditCategory = (category) => {
        setSelectedCategoryForEdit(category);
        setIsEditCategoryModalOpen(true);
    };

    const handleDeleteCategory = (category) => {
        setDeleteCategoryConfirmation(category);
    };

    const createItem = async (itemData) => {
        try {
            const { data, error } = await supabase
                .from('dropdown_items')
                .insert([{ ...itemData, category_id: selectedCategory.id }])
                .select()
                .single();

            if (error) throw error;

            setItems(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
            setIsCreateItemModalOpen(false);
            showSuccessModal('Item created successfully');
        } catch (error) {
            console.error('Error creating item:', error);
            showErrorModal('Error creating item');
        }
    };

    const createItemsFromList = async (itemsData) => {
        try {
            const itemsToInsert = itemsData.map(item => ({
                ...item,
                category_id: selectedCategory.id
            }));

            const { data, error } = await supabase
                .from('dropdown_items')
                .insert(itemsToInsert)
                .select();

            if (error) throw error;

            setItems(prev => [...prev, ...data].sort((a, b) => a.sort_order - b.sort_order));
            setIsPasteListModalOpen(false);
            showSuccessModal(`${data.length} items created successfully`);
        } catch (error) {
            console.error('Error creating items:', error);
            showErrorModal('Error creating items');
        }
    };

    const updateItem = async (itemId, itemData) => {
        try {
            const { data, error } = await supabase
                .from('dropdown_items')
                .update(itemData)
                .eq('id', itemId)
                .select()
                .single();

            if (error) throw error;

            setItems(prev => prev.map(item => item.id === itemId ? data : item).sort((a, b) => a.sort_order - b.sort_order));
            setIsEditItemModalOpen(false);
            setSelectedItem(null);
            showSuccessModal('Item updated successfully');
        } catch (error) {
            console.error('Error updating item:', error);
            showErrorModal('Error updating item');
        }
    };

    const deleteItem = async (itemId) => {
        try {
            const { error } = await supabase
                .from('dropdown_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            setItems(prev => prev.filter(item => item.id !== itemId));
            setDeleteConfirmation(null);
            showSuccessModal('Item deleted successfully');
        } catch (error) {
            console.error('Error deleting item:', error);
            showErrorModal('Error deleting item');
        }
    };

    const deleteAllItems = async () => {
        try {
            const { error } = await supabase
                .from('dropdown_items')
                .delete()
                .eq('category_id', selectedCategory.id);

            if (error) throw error;

            setItems([]);
            setDeleteAllConfirmation(false);
            showSuccessModal('All items deleted successfully');
        } catch (error) {
            console.error('Error deleting all items:', error);
            showErrorModal('Error deleting all items');
        }
    };

    const handleEditItem = (item) => {
        setSelectedItem(item);
        setIsEditItemModalOpen(true);
    };

    const handleDeleteItem = (item) => {
        setDeleteConfirmation(item);
    };

    const reorderItems = async (itemId, newOrder) => {
        try {
            const currentItem = items.find(item => item.id === itemId);
            if (!currentItem || currentItem.sort_order === newOrder) return;

            const oldOrder = currentItem.sort_order;

            // Create a copy of items for manipulation
            let itemsToUpdate = [...items];

            if (newOrder > oldOrder) {
                // Moving down: shift items up
                itemsToUpdate = itemsToUpdate.map(item => {
                    if (item.id === itemId) {
                        return { ...item, sort_order: newOrder };
                    } else if (item.sort_order > oldOrder && item.sort_order <= newOrder) {
                        return { ...item, sort_order: item.sort_order - 1 };
                    }
                    return item;
                });
            } else {
                // Moving up: shift items down
                itemsToUpdate = itemsToUpdate.map(item => {
                    if (item.id === itemId) {
                        return { ...item, sort_order: newOrder };
                    } else if (item.sort_order >= newOrder && item.sort_order < oldOrder) {
                        return { ...item, sort_order: item.sort_order + 1 };
                    }
                    return item;
                });
            }

            // Update all affected items in database
            const updates = itemsToUpdate
                .filter(item => {
                    const originalItem = items.find(orig => orig.id === item.id);
                    return originalItem && originalItem.sort_order !== item.sort_order;
                })
                .map(item =>
                    supabase
                        .from('dropdown_items')
                        .update({ sort_order: item.sort_order })
                        .eq('id', item.id)
                );

            await Promise.all(updates);

            // Update local state
            setItems(itemsToUpdate.sort((a, b) => a.sort_order - b.sort_order));
            showSuccessModal('Items reordered successfully');
        } catch (error) {
            console.error('Error reordering items:', error);
            showErrorModal('Error reordering items');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dropdown Menu Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage dropdown lists used throughout the application</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categories Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Categories</h2>
                        {isAdminOrSuperAdmin && (
                            <Button
                                onClick={() => setIsCreateCategoryModalOpen(true)}
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                <PlusCircle size={16} className="mr-1" />
                                Add
                            </Button>
                        )}
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categories.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No categories found
                            </div>
                        ) : (
                            categories.map((category) => (
                                <div
                                    key={category.id}
                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                        selectedCategory?.id === category.id ? 'bg-orange-50 dark:bg-orange-500/10 border-r-4 border-orange-500' : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                                                {category.name.replace('_', ' ')}
                                            </h3>
                                            {category.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {category.description}
                                                </p>
                                            )}
                                        </div>
                                        {isAdminOrSuperAdmin && (
                                            <div className="flex gap-1 ml-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditCategory(category);
                                                    }}
                                                    className="p-1 h-auto"
                                                >
                                                    <Edit size={12} />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCategory(category);
                                                    }}
                                                    className="p-1 h-auto text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Items Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                {selectedCategory ? 'Items' : 'Select a Category'}
                            </h2>
                            {selectedCategory && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Manage items in this dropdown list
                                </p>
                            )}
                        </div>
                        {selectedCategory && isAdminOrSuperAdmin && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setIsCreateItemModalOpen(true)}
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600"
                                >
                                    <PlusCircle size={16} className="mr-1" />
                                    Add Item
                                </Button>
                                <Button
                                    onClick={() => setIsPasteListModalOpen(true)}
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600"
                                >
                                    <PlusCircle size={16} className="mr-1" />
                                    Paste List
                                </Button>
                                {items.length > 0 && (
                                    <Button
                                        onClick={() => setDeleteAllConfirmation(true)}
                                        size="sm"
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        <Trash2 size={16} className="mr-1" />
                                        Delete All
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedCategory ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {itemsLoading ? (
                                <div className="p-8 flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="p-8 text-center">
                                    <List className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Get started by adding a new item.
                                    </p>
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <div className="flex-1 flex items-center gap-3">
                                            {isAdminOrSuperAdmin && (
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => reorderItems(item.id, item.sort_order - 1)}
                                                        disabled={index === 0}
                                                        className="p-1 h-auto"
                                                    >
                                                        <ChevronUp size={12} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => reorderItems(item.id, item.sort_order + 1)}
                                                        disabled={index === items.length - 1}
                                                        className="p-1 h-auto"
                                                    >
                                                        <ChevronDown size={12} />
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        #{item.sort_order}
                                                    </span>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {item.display_text}
                                                    </h3>
                                                    {!item.is_active && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isAdminOrSuperAdmin && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditItem(item)}
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteItem(item)}
                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <List className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Select a category</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Choose a category from the left panel to manage its items.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Category Modal */}
            <CategoryModal
                isOpen={isCreateCategoryModalOpen}
                onClose={() => setIsCreateCategoryModalOpen(false)}
                onSave={createCategory}
                loading={categoryLoading}
            />

            {/* Create Item Modal */}
            <ItemModal
                isOpen={isCreateItemModalOpen}
                onClose={() => setIsCreateItemModalOpen(false)}
                onSave={createItem}
                category={selectedCategory}
                existingItems={items}
            />

            {/* Paste List Modal */}
            <PasteListModal
                isOpen={isPasteListModalOpen}
                onClose={() => setIsPasteListModalOpen(false)}
                onSave={createItemsFromList}
                category={selectedCategory}
                existingItems={items}
            />

            {/* Edit Item Modal */}
            <ItemModal
                isOpen={isEditItemModalOpen}
                onClose={() => {
                    setIsEditItemModalOpen(false);
                    setSelectedItem(null);
                }}
                onSave={(itemData) => updateItem(selectedItem.id, itemData)}
                category={selectedCategory}
                existingItems={items.filter(item => item.id !== selectedItem?.id)}
                item={selectedItem}
                isEdit={true}
            />

            {/* Edit Category Modal */}
            <CategoryModal
                isOpen={isEditCategoryModalOpen}
                onClose={() => {
                    setIsEditCategoryModalOpen(false);
                    setSelectedCategoryForEdit(null);
                }}
                onSave={(categoryData) => updateCategory(selectedCategoryForEdit.id, categoryData)}
                loading={categoryLoading}
                category={selectedCategoryForEdit}
                isEdit={true}
            />

            {/* Delete Item Confirmation Modal */}
            {deleteConfirmation && (
                <ConfirmationModal
                    isOpen={!!deleteConfirmation}
                    onClose={() => setDeleteConfirmation(null)}
                    onConfirm={() => deleteItem(deleteConfirmation.id)}
                    title="Delete Item"
                    message={`Are you sure you want to delete "${deleteConfirmation.display_text}"? This action cannot be undone.`}
                    confirmText="Delete"
                    confirmVariant="danger"
                />
            )}

            {/* Delete Category Confirmation Modal */}
            {deleteCategoryConfirmation && (
                <ConfirmationModal
                    isOpen={!!deleteCategoryConfirmation}
                    onClose={() => setDeleteCategoryConfirmation(null)}
                    onConfirm={() => deleteCategory(deleteCategoryConfirmation.id)}
                    title="Delete Category"
                    message={`Are you sure you want to delete "${deleteCategoryConfirmation.name}"? This will also delete all items in this category. This action cannot be undone.`}
                    confirmText="Delete"
                    confirmVariant="danger"
                />
            )}

            {/* Delete All Items Confirmation Modal */}
            {deleteAllConfirmation && (
                <ConfirmationModal
                    isOpen={deleteAllConfirmation}
                    onClose={() => setDeleteAllConfirmation(false)}
                    onConfirm={deleteAllItems}
                    title="Delete All Items"
                    message={`Are you sure you want to delete all ${items.length} items from "${selectedCategory?.name}"? This action cannot be undone.`}
                    confirmText="Delete All"
                    confirmVariant="danger"
                />
            )}
        </div>
    );
};

const CategoryModal = ({ isOpen, onClose, onSave, loading, category, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setFormData({ name: '', description: '' });
        } else if (isEdit && category) {
            setFormData({
                name: category.name,
                description: category.description || ''
            });
        }
    }, [isOpen, isEdit, category]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        const saveData = {
            name: isEdit ? formData.name : formData.name.toLowerCase().replace(/\s+/g, '_'),
            description: formData.description.trim()
        };

        onSave(saveData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Category" : "Create Category"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${isEdit ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`}
                        placeholder="e.g., project_status"
                        disabled={isEdit}
                        required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isEdit ? 'Category name cannot be changed' : 'Will be converted to lowercase with underscores'}
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Brief description of this category"
                        rows="3"
                    />
                </div>
                <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={loading || !formData.name.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isEdit ? 'Update Category' : 'Create Category'}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const ItemModal = ({ isOpen, onClose, onSave, category, existingItems, item, isEdit = false }) => {
    const [formData, setFormData] = useState({
        value: '',
        display_text: '',
        sort_order: 0,
        is_active: true
    });

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                value: '',
                display_text: '',
                sort_order: 0,
                is_active: true
            });
        } else if (isEdit && item) {
            setFormData({
                value: item.value,
                display_text: item.display_text,
                sort_order: item.sort_order,
                is_active: item.is_active
            });
        } else {
            // Set default sort order to be the next number
            const maxSortOrder = Math.max(...existingItems.map(i => i.sort_order), 0);
            setFormData(prev => ({ ...prev, sort_order: maxSortOrder + 1 }));
        }
    }, [isOpen, isEdit, item, existingItems]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.display_text.trim()) return;

        onSave({
            value: formData.display_text.trim(),
            display_text: formData.display_text.trim(),
            sort_order: parseInt(formData.sort_order),
            is_active: formData.is_active
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${isEdit ? 'Edit' : 'Create'} Item`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Text *
                    </label>
                    <input
                        type="text"
                        value={formData.display_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_text: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Project Manager"
                        required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Text shown to users in the dropdown
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sort Order
                    </label>
                    <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Order in which this item appears in the dropdown
                    </p>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="mr-2"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Active
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        Inactive items won't appear in dropdowns
                    </p>
                </div>
                <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={!formData.display_text.trim()}>
                        {isEdit ? 'Update' : 'Create'} Item
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const PasteListModal = ({ isOpen, onClose, onSave, category, existingItems }) => {
    const [textInput, setTextInput] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTextInput('');
            setItems([]);
        }
    }, [isOpen]);

    const parseItems = () => {
        if (!textInput.trim()) {
            setItems([]);
            return;
        }

        const lines = textInput.split('\n').filter(line => line.trim());
        const maxSortOrder = Math.max(...existingItems.map(i => i.sort_order), 0);

        const parsedItems = lines.map((line, index) => ({
            display_text: line.trim(),
            value: line.trim(),
            sort_order: maxSortOrder + index + 1,
            is_active: true
        }));

        setItems(parsedItems);
    };

    useEffect(() => {
        parseItems();
    }, [textInput, existingItems]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) return;

        setLoading(true);
        try {
            await onSave(items);
            onClose();
        } catch (error) {
            console.error('Error saving items:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
        const lines = textInput.split('\n');
        lines.splice(index, 1);
        setTextInput(lines.join('\n'));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Paste Items List">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Paste List *
                    </label>
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Paste your list here, one item per line:&#10;Project Manager&#10;Developer&#10;Designer&#10;QA Tester"
                        rows={8}
                        required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Paste your list with one item per line. Empty lines will be ignored.
                    </p>
                </div>

                {items.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preview ({items.length} items)
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                            {items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                    <span className="text-sm text-gray-900 dark:text-white">{item.display_text}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={items.length === 0 || loading}>
                        {loading ? 'Creating...' : `Create ${items.length} Items`}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


export default DropdownMenuPage;
