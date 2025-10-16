import React, { useState, useEffect } from 'react';
import { Edit, Archive, Trash2 } from 'lucide-react';
import { Modal, Input, Button } from '../ui';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';

export const DeliveryTaskItem = ({ task, onToggle, onEdit, onDelete, onArchive, users, canComplete, canEdit, canDelete }) => {
    const assignedUsers = task.assignedTo?.map(id => users.find(user => user.id === id)).filter(Boolean) || [];
    const createdByUser = task.createdBy ? users.find(user => user.id === task.createdBy) : null;
    const completedByUser = task.completedBy ? users.find(user => user.id === task.completedBy) : null;

    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <li className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border ${task.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'}`}>
            <div className="flex items-start sm:items-center space-x-3 flex-grow min-w-0">
                {canComplete && (
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={onToggle}
                        className="h-5 w-5 mt-0.5 sm:mt-0 flex-shrink-0 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600"
                    />
                )}
                <div className="flex-grow min-w-0">
                    <p className={`text-sm font-medium break-words ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                        {task.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Project: {task.project}</p>

                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1">
                        <span className="text-xs text-gray-400">Created:</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 break-all">{formatDateTime(task.createdAt)}</span>
                        {createdByUser && (
                            <>
                                <span className="text-xs text-gray-400">by</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 truncate max-w-[150px]">
                                    {createdByUser.name}
                                </span>
                            </>
                        )}
                    </div>

                    {task.completed && task.completedAt && (
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1">
                            <span className="text-xs text-gray-400">Completed:</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 break-all">{formatDateTime(task.completedAt)}</span>
                            {completedByUser && (
                                <>
                                    <span className="text-xs text-gray-400">by</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 truncate max-w-[150px]">
                                        {completedByUser.name}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {assignedUsers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1">
                            <span className="text-xs text-gray-400 flex-shrink-0">Assigned to:</span>
                            {assignedUsers.map(user => (
                                <span key={user.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 truncate max-w-[150px]">
                                    {user.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                {canEdit && (
                    <button onClick={() => onEdit(task)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600" title="Edit"><Edit size={16} /></button>
                )}
                {canEdit && onArchive && (
                    <button onClick={() => onArchive(task)} className="p-1.5 text-gray-500 hover:text-yellow-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600" title={task.archived ? "Unarchive" : "Archive"}>
                        <Archive size={16} />
                    </button>
                )}
                {canDelete && (
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600" title="Delete"><Trash2 size={16} /></button>
                )}
            </div>
        </li>
    );
};

export const DeliveryTaskModal = ({ isOpen, onClose, onSave, task, users, usersLoading, title }) => {
    const [formData, setFormData] = useState({ text: '', assignedTo: [] });

    useEffect(() => {
        if (task) {
            setFormData({ text: task.text, assignedTo: task.assignedTo || [] });
        } else {
            setFormData({ text: '', assignedTo: [] });
        }
    }, [task, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMultiSelectChange = (userId) => {
        setFormData(prev => {
            const newAssignedTo = prev.assignedTo.includes(userId)
                ? prev.assignedTo.filter(id => id !== userId)
                : [...prev.assignedTo, userId];
            return { ...prev, assignedTo: newAssignedTo };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || (task ? 'Edit Delivery Task' : 'New Delivery Task')}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                        <Input id="text" name="text" value={formData.text} onChange={handleChange} placeholder="e.g., Review delivery documentation" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                            {usersLoading ? (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                    Loading users...
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                    No users available
                                </div>
                            ) : (
                                users.map(user => (
                                    <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.assignedTo.includes(user.id)}
                                            onChange={() => handleMultiSelectChange(user.id)}
                                            className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600"
                                        />
                                        <div className="flex items-center">
                                            <div className={`w-7 h-7 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-xs mr-2`}>{getAvatarText(user)}</div>
                                            <span className="text-gray-800 dark:text-gray-200">{user.name}</span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
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
