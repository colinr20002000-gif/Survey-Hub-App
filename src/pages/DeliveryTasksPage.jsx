import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useDeliveryTasks } from '../contexts/DeliveryTaskContext';
import { usePermissions } from '../hooks/usePermissions';
import { Button } from '../components/ui';
import { DeliveryTaskItem, DeliveryTaskModal } from '../components/tasks/TaskComponents';
import { sendDeliveryTaskCompletionNotification } from '../utils/fcmNotifications';

const mockUsers = {
  '1': { id: 1, username: 'Colin.Rogers', name: 'Colin Rogers', role: 'Admin', teamRole: 'Office Staff', avatar: 'CR', email: 'colin.rogers@surveyhub.co.uk', last_login: '2024-08-25 10:30', password: 'Survey Hub', privilege: 'Admin' },
  '2': { id: 2, username: 'Ben.Carter', name: 'Ben Carter', role: 'Manager', teamRole: 'Project Team', avatar: 'BC', email: 'ben.carter@surveyhub.co.uk', last_login: '2024-08-25 09:15', password: 'password123', privilege: 'Project Managers' },
  '3': { id: 3, username: 'Chloe.Davis', name: 'Chloe Davis', role: 'Editor', teamRole: 'Site Team', avatar: 'CD', email: 'chloe.davis@surveyhub.co.uk', last_login: '2024-08-24 15:45', password: 'password456', privilege: 'Site Staff' },
  '4': { id: 4, username: 'David.Evans', name: 'David Evans', role: 'Viewer', teamRole: 'Design Team', avatar: 'DE', email: 'david.evans@surveyhub.co.uk', last_login: '2024-08-23 11:20', password: 'password789', privilege: 'Delivery Surveyors' },
  '5': { id: 5, username: 'Frank.Green', name: 'Frank Green', role: 'Viewer', teamRole: 'Subcontractor', avatar: 'FG', email: 'frank.green@contractors.com', last_login: '2024-08-22 18:00', password: 'password101', privilege: 'Subcontractor' },
};

const DeliveryTasksPage = () => {
    const { user } = useAuth();
    const { canCompleteTasks, canCreateTasks, canEditProjects, canDeleteProjects } = usePermissions();
    const { deliveryTasks, addDeliveryTask, updateDeliveryTask, deleteDeliveryTask, deleteAllArchivedDeliveryTasks, loading, error } = useDeliveryTasks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    // Fetch real users from the database
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setUsersLoading(true);
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, name, privilege, avatar, email')
                    .is('deleted_at', null)
                    .order('name');

                if (error) {
                    console.error('Error fetching users:', error);
                    // Fallback to mock users if database fetch fails
                    setUsers(Object.values(mockUsers));
                } else {
                    setUsers(data || []);
                }
            } catch (error) {
                console.error('Error in fetchUsers:', error);
                // Fallback to mock users if there's an exception
                setUsers(Object.values(mockUsers));
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleSaveTask = async (taskData) => {
        if (taskToEdit) {
            await updateDeliveryTask({ ...taskToEdit, ...taskData });
        } else {
            const newTask = { ...taskData, completed: false, project: 'Delivery Team', createdBy: user?.id };
            await addDeliveryTask(newTask);
        }
        setIsModalOpen(false);
        setTaskToEdit(null);
    };

    const handleToggleComplete = async (task) => {
        const isCompleting = !task.completed;
        const updatedTask = {
            ...task,
            completed: isCompleting,
            completedAt: isCompleting ? new Date().toISOString() : null,
            completedBy: isCompleting ? user?.id : null
        };
        await updateDeliveryTask(updatedTask);

        // Send notification to task creator when task is completed
        if (isCompleting && task.createdBy && task.createdBy !== user?.id) {
            try {
                await sendDeliveryTaskCompletionNotification(
                    updatedTask,
                    task.createdBy,
                    user?.name || user?.email || 'Someone'
                );
                console.log('✅ Task completion notification sent to creator');
            } catch (error) {
                console.error('❌ Failed to send task completion notification:', error);
            }
        }
    };

    const handleDeleteTask = async (taskId) => {
        await deleteDeliveryTask(taskId);
    };

    const handleDeleteAllArchived = async () => {
        const archivedCount = deliveryTasks.filter(t => t.archived === true).length;
        if (archivedCount === 0) {
            alert('There are no archived tasks to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete all ${archivedCount} archived tasks? This action cannot be undone.`)) {
            await deleteAllArchivedDeliveryTasks();
        }
    };

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };

    const openNewTaskModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(true);
    };

    const handleArchiveTask = async (task) => {
        console.log('Archive button clicked for delivery task:', task.id, 'Current archived status:', task.archived);
        const newArchivedStatus = task.archived === true ? false : true;
        console.log('Setting archived to:', newArchivedStatus);
        const updatedTask = { ...task, archived: newArchivedStatus };
        await updateDeliveryTask(updatedTask);
    };

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading To Do List...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading To Do List</h2>
                <p>There was a problem fetching task data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    const activeTasks = deliveryTasks.filter(t => t.archived !== true);
    const archivedTasks = deliveryTasks.filter(t => t.archived === true);
    const tasksToDisplay = showArchived ? archivedTasks : activeTasks;
    const incompleteTasks = tasksToDisplay.filter(t => !t.completed);
    const completedTasks = tasksToDisplay.filter(t => t.completed);

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">To Do List</h1>
                    {canCreateTasks && (
                        <Button onClick={openNewTaskModal} className="w-full sm:w-auto">
                            <PlusCircle size={16} className="mr-2"/>Add Task
                        </Button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowArchived(!showArchived)}
                        className="text-sm"
                    >
                        {showArchived ? 'Show Active' : 'Show Archived'} ({showArchived ? activeTasks.length : archivedTasks.length})
                    </Button>
                    {showArchived && archivedTasks.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteAllArchived}
                            className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <Trash2 size={16} className="mr-1 sm:mr-2"/>
                            <span className="hidden xs:inline">Delete All Archived</span>
                            <span className="xs:hidden">Delete All</span>
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">To Do ({incompleteTasks.length})</h3>
                    <ul className="space-y-2">
                        {incompleteTasks.map(task => (
                            <DeliveryTaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} onArchive={handleArchiveTask} users={users} canComplete={canCompleteTasks} canEdit={canEditProjects} canDelete={canDeleteProjects} />
                        ))}
                        {incompleteTasks.length === 0 && (
                            <li className="text-gray-500 dark:text-gray-400 text-center py-4">{showArchived ? 'No pending archived tasks' : 'No pending tasks'}</li>
                        )}
                    </ul>
                </div>
                {completedTasks.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">Completed ({completedTasks.length})</h3>
                        <ul className="space-y-2">
                            {completedTasks.map(task => (
                                <DeliveryTaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} onArchive={handleArchiveTask} users={users} canComplete={canCompleteTasks} canEdit={canEditProjects} canDelete={canDeleteProjects} />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <DeliveryTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} task={taskToEdit} users={users} usersLoading={usersLoading} />
        </div>
    );
};

export default DeliveryTasksPage;
