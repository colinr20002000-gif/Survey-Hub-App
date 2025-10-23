import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';
import { Button, Input, Modal } from '../components/ui';
import { getDepartmentColor, getAvatarText } from '../utils/avatarColors';

// Mock users - TODO: Replace with useUsers hook
const mockUsers = {
  '1': { id: 1, username: 'Colin.Rogers', name: 'Colin Rogers', role: 'Admin', teamRole: 'Office Staff', avatar: 'CR', email: 'colin.rogers@surveyhub.co.uk', department: 'Office', last_login: '2024-08-25 10:30', password: 'Survey Hub', privilege: 'Admin' },
  '2': { id: 2, username: 'Ben.Carter', name: 'Ben Carter', role: 'Manager', teamRole: 'Project Team', avatar: 'BC', email: 'ben.carter@surveyhub.co.uk', department: 'Project', last_login: '2024-08-25 09:15', password: 'password123', privilege: 'Project Managers' },
};

const AssignedTasksPage = () => {
    const { tasks, addTask, updateTask, deleteTask, loading, error } = useTasks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);

    const handleSaveTask = async (taskData) => {
        if (taskToEdit) {
            await updateTask({ ...taskToEdit, ...taskData });
        } else {
            const newTask = { ...taskData, completed: false, project: 'General' };
            await addTask(newTask);
        }
        setIsModalOpen(false);
        setTaskToEdit(null);
    };

    const handleToggleComplete = async (task) => {
        await updateTask({ ...task, completed: !task.completed });
    };

    const handleDeleteTask = async (taskId) => {
        await deleteTask(taskId);
    };

    const handleClearCompleted = async () => {
        const completedTasks = tasks.filter(t => t.completed);
        const deletePromises = completedTasks.map(task => deleteTask(task.id));
        await Promise.all(deletePromises);
    };

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };

    const openNewTaskModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(true);
    };

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Tasks...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Tasks</h2>
                <p>There was a problem fetching tasks from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    const incompleteTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Assigned Tasks</h1>
                <Button onClick={openNewTaskModal}><PlusCircle size={16} className="mr-2"/>Add Task</Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">To Do ({incompleteTasks.length})</h3>
                    <ul className="space-y-2">
                        {incompleteTasks.map(task => (
                            <TaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} />
                        ))}
                    </ul>
                </div>

                {completedTasks.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Completed ({completedTasks.length})</h3>
                            <Button variant="outline" onClick={handleClearCompleted}>Clear Completed</Button>
                        </div>
                        <ul className="space-y-2">
                            {completedTasks.map(task => (
                                <TaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} task={taskToEdit} users={Object.values(mockUsers)} />
        </div>
    );
};

const TaskItem = ({ task, onToggle, onEdit, onDelete }) => {
    const assignedUsers = task.assignedTo.map(id => mockUsers[id]).filter(Boolean);

    return (
        <li className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor={`task-${task.id}`} className={`ml-3 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.text}
                </label>
            </div>
            <div className="flex items-center">
                {assignedUsers.length > 0 && (
                    <div className="flex -space-x-2 mr-3">
                        {assignedUsers.map(user => (
                            <div
                                key={user.id}
                                className={`w-7 h-7 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-xs border-2 border-white dark:border-gray-800`}
                                title={user.name}
                            >
                                {getAvatarText(user)}
                            </div>
                        ))}
                    </div>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <button onClick={() => onEdit(task)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                </div>
            </div>
        </li>
    );
};

const TaskModal = ({ isOpen, onClose, onSave, task, users }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                        <Input id="text" name="text" value={formData.text} onChange={handleChange} placeholder="e.g., Finalize survey report" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                            {users.map(user => (
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
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Task</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default AssignedTasksPage;
