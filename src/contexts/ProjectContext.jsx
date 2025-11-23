import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useOffline } from './SimpleOfflineContext';
import { cacheData, getCachedData } from '../utils/simpleOfflineCache';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const { isOnline } = useOffline();

    const getProjects = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (isOnline) {
            // ONLINE: Fetch from Supabase
            try {
                const { data, error: fetchError } = await supabase
                    .from('projects')
                    .select('id, project_number, project_name, client, description, team, startDate, targetDate, tasksText, date_created, created_by, assigned_to, project_manager, year, archived')
                    .order('id', { ascending: false });

                if (fetchError) {
                    setError(fetchError.message);
                    // Try to load from cache as fallback
                    const cached = await getCachedData('projects');
                    if (cached) {
                        console.log('📦 Using cached projects due to fetch error');
                        setProjects(cached);
                    } else {
                        setProjects([]);
                    }
                } else {
                    setProjects(data || []);
                    setLastSync(Date.now());
                    // Cache for offline use
                    await cacheData('projects', data || []);
                    console.log('✅ Projects cached for offline use');
                }
            } catch (e) {
                setError(e.message);
                // Try to load from cache as fallback
                const cached = await getCachedData('projects');
                if (cached) {
                    console.log('📦 Using cached projects due to error');
                    setProjects(cached);
                } else {
                    setProjects([]);
                }
            }
        } else {
            // OFFLINE: Load from cache
            try {
                const cached = await getCachedData('projects');
                if (cached) {
                    setProjects(cached);
                    console.log('📦 Loaded projects from cache (offline)');
                } else {
                    setProjects([]);
                    setError('No cached data available. Please connect to the internet.');
                }
            } catch (e) {
                setError('Failed to load cached data.');
                setProjects([]);
            }
        }

        setLoading(false);
    }, [isOnline]); // Depend on isOnline

    useEffect(() => {
        getProjects();

        // Set up real-time subscription for projects (only when online)
        let subscription;

        if (isOnline) {
            subscription = supabase
                .channel('projects-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'projects'
                    },
                    async (payload) => {
                        console.log('📁 Projects table changed:', payload.eventType);

                        // Handle different event types for optimized updates
                        if (payload.eventType === 'INSERT') {
                            setProjects(prev => {
                                const updated = [payload.new, ...prev];
                                // Update cache
                                cacheData('projects', updated);
                                return updated;
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            setProjects(prev => {
                                const updated = prev.map(p => p.id === payload.new.id ? payload.new : p);
                                // Update cache
                                cacheData('projects', updated);
                                return updated;
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setProjects(prev => {
                                const updated = prev.filter(p => p.id !== payload.old.id);
                                // Update cache
                                cacheData('projects', updated);
                                return updated;
                            });
                        } else {
                            // Fallback: refresh all data
                            getProjects();
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [getProjects, isOnline]); // Depend on getProjects and isOnline

    const addProject = useCallback(async (projectData) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot create projects while offline. Please connect to the internet.');
            throw new Error('Cannot create projects while offline');
        }

        try {
            // Remove id field if present to let database auto-generate it
            const { id, ...dataWithoutId } = projectData;
            const newProjectData = { ...dataWithoutId, description: '', team: [], tasksText: '' };

            // Add timeout to database insert
            const insertQuery = Promise.race([
                supabase.from('projects').insert([newProjectData]).select(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database insert timeout')), 8000)
                )
            ]);

            const { data, error } = await insertQuery;

            if (error) {
                console.error('Supabase insert error:', error);
                alert(`Error creating project: ${error.message}`);
                return;
            }
            // Don't manually update state - realtime subscription handles it
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    }, [isOnline]); // Depend on isOnline

    const updateProject = useCallback(async (updatedProject) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot update projects while offline. Please connect to the internet.');
            throw new Error('Cannot update projects while offline');
        }

        try {
            const updateQuery = Promise.race([
                supabase.from('projects').update(updatedProject).eq('id', updatedProject.id).select(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database update timeout')), 8000)
                )
            ]);

            const { data, error } = await updateQuery;
            if (error) console.error('Error updating project:', error);
            // Don't manually update state - realtime subscription handles it
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    }, [isOnline]); // Depend on isOnline

    const deleteProject = useCallback(async (projectId) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot delete projects while offline. Please connect to the internet.');
            throw new Error('Cannot delete projects while offline');
        }

        try {
            const deleteQuery = Promise.race([
                supabase.from('projects').delete().eq('id', projectId),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database delete timeout')), 8000)
                )
            ]);

            const { error } = await deleteQuery;
            if (error) console.error('Error deleting project:', error);
            // Don't manually update state - realtime subscription handles it
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    }, [isOnline]); // Depend on isOnline

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        projects,
        addProject,
        updateProject,
        deleteProject,
        loading,
        error,
        isOnline,
        lastSync
    }), [projects, addProject, updateProject, deleteProject, loading, error, isOnline, lastSync]);

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
