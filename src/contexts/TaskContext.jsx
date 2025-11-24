import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error("Supabase tasks fetch error:", fetchError);
                setError(fetchError.message);
            } else {
                setTasks(data || []);
            }
        } catch (e) {
            console.error("Unexpected JS error fetching tasks:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Defer loading by 200ms to avoid overwhelming browser on initial load
        const loadTimer = setTimeout(() => {
            getTasks();
        }, 200);

        // Set up real-time subscription for tasks
        const subscription = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks'
                },
                (payload) => {
                    console.log('📋 Tasks table changed:', payload.eventType);

                    // Handle different event types for optimized updates
                    if (payload.eventType === 'INSERT') {
                        setTasks(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    } else {
                        // Fallback: refresh all data
                        getTasks();
                    }
                }
            )
            .subscribe();

        return () => {
            clearTimeout(loadTimer);
            subscription.unsubscribe();
        };
    }, [getTasks]);

    const addTask = useCallback(async (taskData) => {
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            alert(`Error creating task: ${error.message}`);
            return;
        }
        // Don't manually update state - realtime subscription handles it
    }, []);

    const updateTask = useCallback(async (updatedTask) => {
        const { data, error } = await supabase
            .from('tasks')
            .update(updatedTask)
            .eq('id', updatedTask.id)
            .select();

        if (error) {
            console.error('Error updating task:', error);
             alert(`Error updating task: ${error.message}`);
        }
        // Don't manually update state - realtime subscription handles it
    }, []);

    const deleteTask = useCallback(async (taskId) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            alert(`Error deleting task: ${error.message}`);
        }
        // Don't manually update state - realtime subscription handles it
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        tasks,
        addTask,
        updateTask,
        deleteTask,
        loading,
        error
    }), [tasks, addTask, updateTask, deleteTask, loading, error]);

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};
