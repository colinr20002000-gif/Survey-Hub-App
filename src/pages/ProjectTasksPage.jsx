import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, ListEnd, ListTodo, Loader2, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useProjectTasks } from '../contexts/ProjectTaskContext';
import { supabase } from '../supabaseClient';
import { Button, Card } from '../components/ui';
import { DeliveryTaskCard, DeliveryTaskModal } from '../components/tasks/TaskComponents';
import { sendProjectTaskCompletionNotification } from '../utils/fcmNotifications';

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

        // Send notification to task creator when task is completed
        if (isCompleting && task.createdBy && task.createdBy !== user?.id) {
            try {
                await sendProjectTaskCompletionNotification(
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
        // Ensure boolean value for archiving toggle
        const currentStatus = task.archived === true;
        const newArchivedStatus = !currentStatus;
        
        console.log(`Archiving task ${task.id}: ${currentStatus} -> ${newArchivedStatus}`);
        
        const updatedTask = { ...task, archived: newArchivedStatus };
        await updateProjectTask(updatedTask);
    };

    // Loading and error states
    if (loading) {
        return (
            <div className="p-8 text-2xl font-semibold text-center text-gray-700 dark:text-gray-300">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
                Loading To Do List...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading To Do List</h2>
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
        <div className="p-4 md:p-6 space-y-8">
            <div className="flex flex-col gap-4 mb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Project Team Tasks</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage project tasks and track progress</p>
                    </div>
                    {canCreateTasks && !showArchived && (
                        <Button onClick={openNewTaskModal} className="w-full sm:w-auto shadow-sm">
                            <PlusCircle size={16} className="mr-2"/>Add Task
                        </Button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowArchived(!showArchived)}
                        className="text-sm"
                        size="sm"
                    >
                        {showArchived ? 'Show Active' : 'Show Archived'} <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">{showArchived ? activeTasks.length : archivedTasks.length}</span>
                    </Button>
                    {showArchived && archivedTasks.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteAllArchived}
                            className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                            size="sm"
                        >
                            <Trash2 size={16} className="mr-1 sm:mr-2"/>
                            Delete All Archived
                        </Button>
                    )}
                </div>
            </div>

            {tasksToDisplay.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <ListEnd className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{showArchived ? 'No archived tasks found' : 'All caught up!'}</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {showArchived ? 'Archived tasks will appear here.' : 'There are no pending tasks at the moment. Enjoy your day or add a new task to get started.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Active Tasks Grid */}
                    {incompleteTasks.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <ListTodo className="h-5 w-5 text-orange-500" />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">To Do <span className="ml-2 text-sm font-normal text-gray-500">({incompleteTasks.length})</span></h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {incompleteTasks.map(task => (
                                    <DeliveryTaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onToggle={() => handleToggleComplete(task)} 
                                        onEdit={openEditModal} 
                                        onDelete={handleDeleteTask} 
                                        onArchive={handleArchiveTask} 
                                        users={users} 
                                        canComplete={canCompleteTasks} 
                                        canEdit={canEditProjects} 
                                        canDelete={canDeleteProjects} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Completed Tasks Grid */}
                    {completedTasks.length > 0 && (
                        <div className={`space-y-4 ${incompleteTasks.length > 0 ? 'pt-8 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                            <div className="flex items-center space-x-2">
                                <ClipboardCheck className="h-5 w-5 text-green-500" />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Completed <span className="ml-2 text-sm font-normal text-gray-500">({completedTasks.length})</span></h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {completedTasks.map(task => (
                                    <DeliveryTaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onToggle={() => handleToggleComplete(task)} 
                                        onEdit={openEditModal} 
                                        onDelete={handleDeleteTask} 
                                        onArchive={handleArchiveTask} 
                                        users={users} 
                                        canComplete={canCompleteTasks} 
                                        canEdit={canEditProjects} 
                                        canDelete={canDeleteProjects} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

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
