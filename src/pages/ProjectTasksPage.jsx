import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useProjectTasks } from '../contexts/ProjectTaskContext';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui';
import { DeliveryTaskItem, DeliveryTaskModal } from '../components/tasks/TaskComponents';

const ProjectTasksPage = () => {
    const { user } = useAuth();
    const { canCompleteTasks, canCreateTasks, canEditProjects, canDeleteProjects } = usePermissions();
    const { projectTasks, addProjectTask, updateProjectTask, deleteProjectTask, deleteAllArchivedProjectTasks, loading, error } = useProjectTasks();
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
                } else {
                    setUsers(data || []);
                }
            } catch (err) {
                console.error('Error in fetchUsers:', err);
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleEditTask = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (taskData) => {
        if (taskToEdit) {
            await updateProjectTask({ ...taskToEdit, ...taskData });
        } else {
            const newTask = { ...taskData, completed: false, project: 'Project Team', createdBy: user?.id };
            await addProjectTask(newTask);
        }
        setIsModalOpen(false);
        setTaskToEdit(null);
    };

    const openNewTaskModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };

    const handleToggleComplete = async (task) => {
        const isCompleting = !task.completed;
        const updatedTask = {
            ...task,
            completed: isCompleting,
            completedAt: isCompleting ? new Date().toISOString() : null,
            completedBy: isCompleting ? user?.id : null
        };
        await updateProjectTask(updatedTask);
    };

    const handleDeleteTask = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            await deleteProjectTask(taskId);
        }
    };

    const handleDeleteAllArchived = async () => {
        const archivedCount = projectTasks.filter(t => t.archived === true).length;
        if (archivedCount === 0) {
            alert('There are no archived tasks to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete all ${archivedCount} archived project tasks? This action cannot be undone.`)) {
            await deleteAllArchivedProjectTasks();
        }
    };

    const handleArchiveTask = async (task) => {
        console.log('Archive button clicked for task:', task.id, 'Current archived status:', task.archived);
        const newArchivedStatus = task.archived === true ? false : true;
        console.log('Setting archived to:', newArchivedStatus);
        const updatedTask = { ...task, archived: newArchivedStatus };
        await updateProjectTask(updatedTask);
    };

    // Loading and error states
    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Project Tasks...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Project Tasks</h2>
                <p>There was a problem fetching project task data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    const activeTasks = projectTasks.filter(t => t.archived !== true);
    const archivedTasks = projectTasks.filter(t => t.archived === true);
    const tasksToDisplay = showArchived ? archivedTasks : activeTasks;
    const incompleteTasks = tasksToDisplay.filter(t => !t.completed);
    const completedTasks = tasksToDisplay.filter(t => t.completed);

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Project Tasks</h1>
                    {canCreateTasks && (
                        <Button onClick={openNewTaskModal} className="w-full sm:w-auto">
                            <PlusCircle size={16} className="mr-2"/>Add Project Task
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
                            <li className="text-gray-500 dark:text-gray-400 text-center py-4">{showArchived ? 'No pending archived tasks' : 'No pending project tasks'}</li>
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
            <DeliveryTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                task={taskToEdit}
                users={users}
                usersLoading={usersLoading}
                title={taskToEdit ? 'Edit Project Task' : 'New Project Task'}
            />
        </div>
    );
};

export default ProjectTasksPage;
