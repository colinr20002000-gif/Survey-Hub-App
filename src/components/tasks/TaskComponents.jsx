import React, { useState, useEffect } from 'react';
import { Edit, Archive, Trash2, Calendar, User, CheckCircle2, Circle, Search, X, Check } from 'lucide-react';
import { Modal, Input, Button } from '../ui';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';

// ... DeliveryTaskCard and DeliveryTaskItem components remain unchanged ...

export const DeliveryTaskCard = ({ task, onToggle, onEdit, onDelete, onArchive, users, canComplete, canEdit, canDelete }) => {
    const assignedUsers = task.assignedTo?.map(id => users.find(user => user.id === id)).filter(Boolean) || [];
    const createdByUser = task.createdBy ? users.find(user => user.id === task.createdBy) : null;
    const completedByUser = task.completedBy ? users.find(user => user.id === task.completedBy) : null;

    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`rounded-xl p-4 shadow-sm border transition-all duration-200 flex flex-col h-full relative group ${
            task.completed
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5'
        }`}>
            <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {task.project}
                </span>
                {canComplete && (
                    <Button
                        size="sm"
                        variant={task.completed ? "success" : "primary"}
                        onClick={onToggle}
                        className="text-xs px-2 py-1"
                        title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                    >
                        {task.completed ? <><CheckCircle2 size={14} className="mr-1" /> Completed</> : <><CheckCircle2 size={14} className="mr-1" /> Mark Complete</>}
                    </Button>
                )}
            </div>
            
            <p className={`text-lg font-semibold mb-4 flex-grow ${task.completed ? 'text-gray-800 dark:text-gray-200 line-through' : 'text-gray-800 dark:text-white'}`}>
                {task.text}
            </p>

            <div className="mt-auto space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(createdByUser || task.createdAt) && (
                    <div className="flex flex-col space-y-1">
                        {createdByUser && (
                            <div className="flex items-center space-x-2">
                                <User size={14} className="flex-shrink-0 text-gray-400" />
                                <span>Created by <span className="font-medium text-gray-800 dark:text-gray-300">{createdByUser.name}</span></span>
                            </div>
                        )}
                        {task.createdAt && (
                            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar size={14} className="flex-shrink-0 text-gray-400" />
                                <span>Created on {formatDateTime(task.createdAt)}</span>
                            </div>
                        )}
                    </div>
                )}
                {assignedUsers.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <User size={14} className="flex-shrink-0 text-gray-400" />
                        <span className="flex-shrink-0">Assigned to:</span>
                        <div className="flex flex-wrap gap-1">
                            {assignedUsers.map(user => (
                                <span key={user.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${task.completed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                                    {user.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {task.completed && (
                    <div className="flex flex-col space-y-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {completedByUser && (
                            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                <CheckCircle2 size={14} className="flex-shrink-0 text-green-600" />
                                <span>Completed by <span className="font-medium">{completedByUser.name}</span></span>
                            </div>
                        )}
                        {task.completedAt && (
                            <div className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300">
                                <Calendar size={14} className="flex-shrink-0 text-green-600" />
                                <span>Completed on {formatDateTime(task.completedAt)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-1 mt-4">
                 {canEdit && (
                    <button onClick={() => onEdit(task)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Edit Task"><Edit size={16} /></button>
                )}
                {canEdit && onArchive && (
                    <button onClick={() => onArchive(task)} className="p-1.5 text-gray-500 hover:text-purple-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title={task.archived ? "Unarchive Task" : "Archive Task"}>
                        <Archive size={16} />
                    </button>
                )}
                {canDelete && (
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Delete Task"><Trash2 size={16} /></button>
                )}
            </div>
        </div>
    );
};

export const DeliveryTaskItem = ({ task, onToggle, onEdit, onDelete, onArchive, users, canComplete, canEdit, canDelete }) => {
    const assignedUsers = task.assignedTo?.map(id => users.find(user => user.id === id)).filter(Boolean) || [];
    const createdByUser = task.createdBy ? users.find(user => user.id === task.createdBy) : null;
    const completedByUser = task.completedBy ? users.find(user => user.id === task.completedBy) : null;

    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <li className={`flex flex-col gap-3 p-4 rounded-xl shadow-sm transition-all duration-200 ease-in-out ${
            task.completed
                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/60 border border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5'
        }`}>
            <div className="flex items-start space-x-3">
                {canComplete && (
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={onToggle}
                        className="h-5 w-5 flex-shrink-0 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 cursor-pointer"
                        title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                    />
                )}
                <div className="flex-grow min-w-0">
                    <p className={`text-base font-semibold break-words ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                        {task.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Project: <span className="font-medium text-gray-700 dark:text-gray-300">{task.project}</span></p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {createdByUser && (
                            <span className="flex items-center">
                                Created <span className="font-medium ml-1 text-gray-700 dark:text-gray-300">{createdByUser.name}</span>
                            </span>
                        )}
                        {task.createdAt && (
                            <span className="flex items-center">
                                on <span className="font-medium ml-1 text-gray-700 dark:text-gray-300">{formatDateTime(task.createdAt)}</span>
                            </span>
                        )}
                    </div>

                    {task.completed && task.completedAt && completedByUser && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-green-600 dark:text-green-400">
                            <span className="flex items-center">
                                Completed <span className="font-medium ml-1">{completedByUser.name}</span>
                            </span>
                            <span className="flex items-center">
                                on <span className="font-medium ml-1">{formatDateTime(task.completedAt)}</span>
                            </span>
                        </div>
                    )}

                    {assignedUsers.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Assigned to:</span>
                            {assignedUsers.map(user => (
                                <span key={user.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                    <div className={`w-4 h-4 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-xs mr-1`}>{getAvatarText(user)}</div>
                                    {user.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0 self-end sm:self-auto ml-auto">
                {canEdit && (
                    <button onClick={() => onEdit(task)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Edit Task"><Edit size={16} /></button>
                )}
                {canEdit && onArchive && (
                    <button onClick={() => onArchive(task)} className="p-2 text-gray-500 hover:text-purple-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title={task.archived ? "Unarchive Task" : "Archive Task"}>
                        <Archive size={16} />
                    </button>
                )}
                {canDelete && (
                    <button onClick={() => onDelete(task.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Delete Task"><Trash2 size={16} /></button>
                )}
            </div>
        </li>
    );
};

export const DeliveryTaskModal = ({ isOpen, onClose, onSave, task, users, usersLoading, title }) => {
    const [formData, setFormData] = useState({ text: '', assignedTo: [] });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (task) {
            setFormData({ text: task.text, assignedTo: task.assignedTo || [] });
        } else {
            setFormData({ text: '', assignedTo: [] });
        }
        setSearchQuery('');
    }, [task, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUserToggle = (userId) => {
        setFormData(prev => {
            const newAssignedTo = prev.assignedTo.includes(userId)
                ? prev.assignedTo.filter(id => id !== userId)
                : [...prev.assignedTo, userId];
            return { ...prev, assignedTo: newAssignedTo };
        });
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelectAll = () => {
        const visibleIds = filteredUsers.map(u => u.id);
        const allVisibleSelected = visibleIds.every(id => formData.assignedTo.includes(id));

        if (allVisibleSelected) {
            // Deselect all visible
            setFormData(prev => ({
                ...prev,
                assignedTo: prev.assignedTo.filter(id => !visibleIds.includes(id))
            }));
        } else {
            // Select all visible
            setFormData(prev => ({
                ...prev,
                assignedTo: [...new Set([...prev.assignedTo, ...visibleIds])]
            }));
        }
    };

    const clearSelection = () => {
        setFormData(prev => ({ ...prev, assignedTo: [] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || (task ? 'Edit Delivery Task' : 'New Delivery Task')}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                        <Input id="text" name="text" value={formData.text} onChange={handleChange} placeholder="e.g., Review delivery documentation" required className="w-full" />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                            {formData.assignedTo.length > 0 && (
                                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                    {formData.assignedTo.length} selected
                                </span>
                            )}
                        </div>
                        
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 text-xs">
                            <button type="button" onClick={toggleSelectAll} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                {filteredUsers.every(u => formData.assignedTo.includes(u.id)) && filteredUsers.length > 0 ? 'Deselect Visible' : 'Select Visible'}
                            </button>
                            <button type="button" onClick={clearSelection} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline">
                                Clear All
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-inner">
                            {usersLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mb-2"></div>
                                    <span className="text-sm">Loading users...</span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">{searchQuery ? 'No users match your search' : 'No users available'}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredUsers.map(user => {
                                        const isSelected = formData.assignedTo.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => handleUserToggle(user.id)}
                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors duration-150 ${
                                                    isSelected 
                                                        ? 'bg-orange-50 dark:bg-orange-900/20' 
                                                        : 'hover:bg-white dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                                                        {getAvatarText(user)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-medium ${isSelected ? 'text-orange-900 dark:text-orange-100' : 'text-gray-700 dark:text-gray-200'}`}>
                                                            {user.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.team_role || 'Staff'}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? 'bg-orange-500 border-orange-500'
                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                                }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">
                            {title && title.includes('Project') ? 'Save Project Task' : 'Save Delivery Task'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
