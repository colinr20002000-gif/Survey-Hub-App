import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useOffline } from './SimpleOfflineContext';
import { cacheData, getCachedData } from '../utils/simpleOfflineCache';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const { isOnline } = useOffline();

    const getTasks = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (isOnline) {
            // ONLINE: Fetch from Supabase
            try {
                const { data, error: fetchError } = await supabase
                    .from('tasks')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (fetchError) {
                    console.error("Supabase tasks fetch error:", fetchError);
                    setError(fetchError.message);
                    // Try cache as fallback
                    const cached = await getCachedData('tasks');
                    if (cached) {
                        console.log('📦 Using cached tasks due to fetch error');
                        setTasks(cached);
                    } else {
                        setTasks([]);
                    }
                } else {
                    setTasks(data || []);
                    setLastSync(Date.now());
                    await cacheData('tasks', data || []);
                    console.log('✅ Tasks cached for offline use');
                }
            } catch (e) {
                console.error("Unexpected JS error fetching tasks:", e);
                setError(e.message);
                // Try cache as fallback
                const cached = await getCachedData('tasks');
                if (cached) {
                    console.log('📦 Using cached tasks due to error');
                    setTasks(cached);
                } else {
                    setTasks([]);
                }
            }
        } else {
            // OFFLINE: Load from cache
            try {
                const cached = await getCachedData('tasks');
                if (cached) {
                    setTasks(cached);
                    console.log('📦 Loaded tasks from cache (offline)');
                } else {
                    setTasks([]);
                    setError('No cached data available. Please connect to the internet.');
                }
            } catch (e) {
                setError('Failed to load cached data.');
                setTasks([]);
            }
        }

        setLoading(false);
    }, [isOnline]);

    useEffect(() => {
        getTasks();

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
            subscription.unsubscribe();
        };
    }, [getTasks]);

    const addTask = useCallback(async (taskData) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot create tasks while offline. Please connect to the internet.');
            throw new Error('Cannot create tasks while offline');
        }

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
    }, [isOnline]);

    const updateTask = useCallback(async (updatedTask) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot update tasks while offline. Please connect to the internet.');
            throw new Error('Cannot update tasks while offline');
        }

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
    }, [isOnline]);

    const deleteTask = useCallback(async (taskId) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot delete tasks while offline. Please connect to the internet.');
            throw new Error('Cannot delete tasks while offline');
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            alert(`Error deleting task: ${error.message}`);
        }
        // Don't manually update state - realtime subscription handles it
    }, [isOnline]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        tasks,
        addTask,
        updateTask,
        deleteTask,
        loading,
        error,
        isOnline,
        lastSync
    }), [tasks, addTask, updateTask, deleteTask, loading, error, isOnline, lastSync]);

    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};
