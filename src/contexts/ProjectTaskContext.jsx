import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { sendProjectTaskAssignmentNotification, sendProjectTaskCompletionNotification } from '../utils/fcmNotifications';

const ProjectTaskContext = createContext(null);

export const ProjectTaskProvider = ({ children }) => {
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal } = useToast();
    const [projectTasks, setProjectTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Map database snake_case to component camelCase
    const mapToCamelCase = (task) => ({
        id: task.id,
        createdAt: task.created_at,
        text: task.text,
        completed: task.completed,
        project: task.project,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        completedAt: task.completed_at,
        completedBy: task.completed_by,
        archived: task.archived,
    });

    // Map component camelCase to database snake_case
    const mapToSnakeCase = (task) => ({
        text: task.text,
        completed: task.completed,
        project: task.project,
        assigned_to: task.assignedTo,
        created_by: task.createdBy,
        completed_at: task.completedAt,
        completed_by: task.completedBy,
        archived: task.archived,
    });

    const getProjectTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('project_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setProjectTasks(data.map(mapToCamelCase) || []);
        } catch (err) {
            console.error("Error fetching project tasks:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getProjectTasks();

        // Set up real-time subscription for project tasks
        const subscription = supabase
            .channel('project-tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_tasks'
                },
                (payload) => {
                    console.log('📋 Project tasks table changed:', payload.eventType);

                    // Handle different event types for optimized updates
                    if (payload.eventType === 'INSERT') {
                        setProjectTasks(prev => [mapToCamelCase(payload.new), ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProjectTasks(prev => prev.map(t => t.id === payload.new.id ? mapToCamelCase(payload.new) : t));
                    } else if (payload.eventType === 'DELETE') {
                        setProjectTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    } else {
                        // Fallback: refresh all data
                        getProjectTasks();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const addProjectTask = async (taskData) => {
        const taskRecord = mapToSnakeCase(taskData);
        const { data, error } = await supabase
            .from('project_tasks')
            .insert([taskRecord])
            .select();

        if (error) {
             console.error('Error adding project task:', error);
             alert(`Error adding project task: ${error.message}`);
             return;
        }
        if (data) {
            const newTask = mapToCamelCase(data[0]);
            // Don't manually update state - realtime subscription handles it

            // Send notification to assigned users
            if (taskData.assignedTo && taskData.assignedTo.length > 0) {
                try {
                    // Create in-app notifications for each assigned user
                    const notificationPromises = taskData.assignedTo.map(async (userId) => {
                        const { data: notifData, error: notifError } = await supabase
                            .from('notifications')
                            .insert({
                                user_id: userId,
                                type: 'project_task',
                                title: 'New Project Task Assigned',
                                message: `You have been assigned to: "${newTask.text}"`,
                                read: false,
                                dismissed: false,
                                data: {
                                    task_id: newTask.id,
                                    task_text: newTask.text,
                                    project: newTask.project,
                                    assigned_by: user?.id,
                                    assigned_by_name: user?.name
                                }
                            });

                        if (notifError) {
                            console.error('❌ Error creating in-app notification:', notifError);
                            console.error('❌ Error details:', {
                                message: notifError.message,
                                code: notifError.code,
                                details: notifError.details,
                                hint: notifError.hint
                            });
                            console.error('❌ Failed for user_id:', userId);
                            console.error('❌ Attempted insert data:', {
                                user_id: userId,
                                type: 'project_task',
                                title: 'New Project Task Assigned',
                                message: `You have been assigned to: "${newTask.text}"`,
                                data: {
                                    task_id: newTask.id,
                                    task_text: newTask.text,
                                    project: newTask.project,
                                    assigned_by: user?.id,
                                    assigned_by_name: user?.name
                                }
                            });
                            throw notifError;
                        }

                        return notifData;
                    });

                    await Promise.all(notificationPromises);
                    console.log('✅ In-app notifications created for project task assignment');

                    // Send FCM push notifications
                    const notificationResult = await sendProjectTaskAssignmentNotification(newTask, user?.id);

                    if (notificationResult.success) {
                        const successMessage = `Project task created successfully! Notifications sent to ${notificationResult.sent} users.`;
                        showSuccessModal(successMessage, 'Success');
                    } else {
                        showSuccessModal('Project task created successfully! (Note: Some notifications may have failed to send)', 'Success');
                    }
                } catch (notificationError) {
                    console.error('Error sending project task assignment notification:', notificationError);
                    showSuccessModal('Project task created successfully! (Note: Notifications may have failed to send)', 'Success');
                }
            } else {
                showSuccessModal('Project task created successfully!', 'Success');
            }
        }
    };

    const updateProjectTask = async (updatedTask) => {
        console.log('updateProjectTask called with:', updatedTask);

        // Get the old task to check if it's being marked as complete
        const oldTask = projectTasks.find(t => t.id === updatedTask.id);
        const isBeingCompleted = !oldTask?.completed && updatedTask.completed;

        const taskRecord = mapToSnakeCase(updatedTask);
        console.log('Task record to update (snake_case):', taskRecord);
        const { data, error } = await supabase
            .from('project_tasks')
            .update(taskRecord)
            .eq('id', updatedTask.id)
            .select();

        if (error) {
            console.error('Error updating project task:', error);
            alert(`Error updating project task: ${error.message}`);
            return;
        }
        if (data) {
            console.log('Successfully updated project task:', data[0]);
            // Don't manually update state - realtime subscription handles it

            // Send notification to task creator when task is marked complete (if they didn't complete it themselves)
            if (isBeingCompleted && oldTask.createdBy && user?.id && oldTask.createdBy !== user.id) {
                try {
                    // Create in-app notification for the task creator
                    const { error: notifError } = await supabase
                        .from('notifications')
                        .insert({
                            user_id: oldTask.createdBy,
                            type: 'project_task_completed',
                            title: 'Project Task Completed',
                            message: `"${updatedTask.text}" has been marked as complete by ${user.name}`,
                            read: false,
                            dismissed: false,
                            data: {
                                task_id: updatedTask.id,
                                task_text: updatedTask.text,
                                project: updatedTask.project,
                                completed_by: user.id,
                                completed_by_name: user.name
                            }
                        });

                    if (notifError) {
                        console.error('❌ Error creating task completion notification:', notifError);
                    } else {
                        console.log('✅ Task completion in-app notification sent to creator');
                    }

                    // Send FCM push notification
                    const fcmResult = await sendProjectTaskCompletionNotification(
                        updatedTask,
                        oldTask.createdBy,
                        user.name
                    );

                    if (fcmResult.success) {
                        console.log('✅ Task completion push notification sent to creator');
                    } else {
                        console.error('❌ Failed to send task completion push notification:', fcmResult);
                    }
                } catch (notificationError) {
                    console.error('Error sending task completion notification:', notificationError);
                }
            }
        }
    };

    const deleteProjectTask = async (taskId) => {
        const { error } = await supabase
            .from('project_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting project task:', error);
            alert(`Error deleting project task: ${error.message}`);
        }
        // Don't manually update state - realtime subscription handles it
    };

    const deleteAllArchivedProjectTasks = async () => {
        const archivedTaskIds = projectTasks.filter(t => t.archived === true).map(t => t.id);

        if (archivedTaskIds.length === 0) {
            return;
        }

        const { error } = await supabase
            .from('project_tasks')
            .delete()
            .in('id', archivedTaskIds);

        if (error) {
            console.error('Error deleting archived project tasks:', error);
            alert(`Error deleting archived project tasks: ${error.message}`);
        } else {
            // Don't manually update state - realtime subscription handles it
            showSuccessModal('All archived project tasks have been deleted');
        }
    };

    const value = { projectTasks, addProjectTask, updateProjectTask, deleteProjectTask, deleteAllArchivedProjectTasks, loading, error };

    return <ProjectTaskContext.Provider value={value}>{children}</ProjectTaskContext.Provider>;
};

export const useProjectTasks = () => {
    const context = useContext(ProjectTaskContext);
    if (!context) {
        throw new Error('useProjectTasks must be used within a ProjectTaskProvider');
    }
    return context;
};
