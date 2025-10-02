import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { sendDeliveryTaskAssignmentNotification } from '../utils/fcmNotifications';
import { handleSupabaseError, isRLSError } from '../utils/rlsErrorHandler';

const DeliveryTaskContext = createContext(null);

export const DeliveryTaskProvider = ({ children }) => {
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal, showPrivilegeError } = useToast();
    const [deliveryTasks, setDeliveryTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Map database snake_case to component camelCase
    const mapToCamelCase = (task) => {
        if (!task) return null;
        return {
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
        };
    };

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

    const getDeliveryTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('delivery_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setDeliveryTasks(data?.map(mapToCamelCase).filter(Boolean) || []);
        } catch (err) {
            console.error("Error fetching delivery tasks:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getDeliveryTasks();

        // Set up real-time subscription for delivery tasks
        const subscription = supabase
            .channel('delivery-tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'delivery_tasks'
                },
                (payload) => {
                    console.log('📋 Delivery tasks table changed:', payload.eventType);

                    // Handle different event types for optimized updates
                    if (payload.eventType === 'INSERT' && payload.new) {
                        const newTask = mapToCamelCase(payload.new);
                        if (newTask) {
                            setDeliveryTasks(prev => [newTask, ...prev]);
                        }
                    } else if (payload.eventType === 'UPDATE' && payload.new) {
                        const updatedTask = mapToCamelCase(payload.new);
                        if (updatedTask) {
                            setDeliveryTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                        }
                    } else if (payload.eventType === 'DELETE' && payload.old) {
                        setDeliveryTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    } else {
                        // Fallback: refresh all data
                        getDeliveryTasks();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const addDeliveryTask = async (taskData) => {
        const taskRecord = mapToSnakeCase(taskData);
        const { data, error } = await supabase
            .from('delivery_tasks')
            .insert([taskRecord])
            .select();

        if (error) {
             console.error('Error adding delivery task:', error);
             const errorMessage = handleSupabaseError(error, 'delivery_tasks', 'insert', taskRecord);
             if (isRLSError(error)) {
                 showPrivilegeError(errorMessage);
             } else {
                 showErrorModal(errorMessage, 'Error Adding Delivery Task');
             }
             return;
        }
        if (data && data[0]) {
            const newTask = mapToCamelCase(data[0]);
            setDeliveryTasks(prev => [newTask, ...prev]);

            // Send notification to assigned users
            if (taskData.assignedTo && taskData.assignedTo.length > 0) {
                try {
                    const notificationResult = await sendDeliveryTaskAssignmentNotification(newTask, user?.id);

                    if (notificationResult.success) {
                        const successMessage = `Delivery task created successfully! Notifications sent to ${notificationResult.sent} users.`;
                        showSuccessModal(successMessage, 'Success');
                    } else {
                        showSuccessModal('Delivery task created successfully! (Note: Some notifications may have failed to send)', 'Success');
                    }
                } catch (notificationError) {
                    console.error('Error sending task assignment notification:', notificationError);
                    showSuccessModal('Delivery task created successfully! (Note: Push notifications failed to send)', 'Success');
                }
            } else {
                showSuccessModal('Delivery task created successfully!', 'Success');
            }
        }
    };

    const updateDeliveryTask = async (updatedTask) => {
        const taskRecord = mapToSnakeCase(updatedTask);
        const { data, error } = await supabase
            .from('delivery_tasks')
            .update(taskRecord)
            .eq('id', updatedTask.id)
            .select();

        if (error) {
            console.error('Error updating delivery task:', error);
            const errorMessage = handleSupabaseError(error, 'delivery_tasks', 'update', taskRecord);
            if (isRLSError(error)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Error Updating Delivery Task');
            }
        } else if (data && data[0]) {
            setDeliveryTasks(prev => prev.map(t => (t.id === updatedTask.id ? mapToCamelCase(data[0]) : t)));
        } else {
            console.error('No data returned from delivery task update - possibly blocked by RLS');
            showPrivilegeError('You need Editor privileges or higher to modify delivery tasks.');
        }
    };

    const deleteDeliveryTask = async (taskId) => {
        const { error } = await supabase
            .from('delivery_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting delivery task:', error);
            const errorMessage = handleSupabaseError(error, 'delivery_tasks', 'delete');
            if (isRLSError(error)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Error Deleting Delivery Task');
            }
        } else {
            setDeliveryTasks(prev => prev.filter(t => t.id !== taskId));
        }
    };

    const deleteAllArchivedDeliveryTasks = async () => {
        const archivedTaskIds = deliveryTasks.filter(t => t.archived === true).map(t => t.id);

        if (archivedTaskIds.length === 0) {
            return;
        }

        const { error } = await supabase
            .from('delivery_tasks')
            .delete()
            .in('id', archivedTaskIds);

        if (error) {
            console.error('Error deleting archived delivery tasks:', error);
            alert(`Error deleting archived delivery tasks: ${error.message}`);
        } else {
            setDeliveryTasks(prev => prev.filter(t => !archivedTaskIds.includes(t.id)));
            showSuccessModal('All archived delivery tasks have been deleted');
        }
    };

    const value = { deliveryTasks, addDeliveryTask, updateDeliveryTask, deleteDeliveryTask, deleteAllArchivedDeliveryTasks, loading, error };

    return <DeliveryTaskContext.Provider value={value}>{children}</DeliveryTaskContext.Provider>;
};

export const useDeliveryTasks = () => {
    const context = useContext(DeliveryTaskContext);
    if (!context) {
        throw new Error('useDeliveryTasks must be used within a DeliveryTaskProvider');
    }
    return context;
};
