import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getProjects = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('projects')
                .select('id, project_number, project_name, client, description, team, startDate, targetDate, tasksText, date_created, created_by, assigned_to, project_manager, year, archived, site_info_sections, site_info_photos')
                .order('id', { ascending: false });

            if (fetchError) {
                setError(fetchError.message);
                setProjects([]);
            } else {
                setProjects(data || []);
            }
        } catch (e) {
            setError(e.message);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array - getProjects is stable

    useEffect(() => {
        getProjects();

        // Set up real-time subscription for projects
        const subscription = supabase
            .channel('projects-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects'
                },
                (payload) => {
                    console.log('📁 Projects table changed:', payload.eventType);

                    // Handle different event types for optimized updates
                    if (payload.eventType === 'INSERT') {
                        setProjects(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
                    } else if (payload.eventType === 'DELETE') {
                        setProjects(prev => prev.filter(p => p.id !== payload.old.id));
                    } else {
                        // Fallback: refresh all data
                        getProjects();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [getProjects]); // Depend on getProjects

    const addProject = useCallback(async (projectData) => {
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
    }, []); // No dependencies

    const updateProject = useCallback(async (updatedProject) => {
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
    }, []); // No dependencies

    const deleteProject = useCallback(async (projectId) => {
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
    }, []); // No dependencies

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        projects,
        addProject,
        updateProject,
        deleteProject,
        loading,
        error
    }), [projects, addProject, updateProject, deleteProject, loading, error]);

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
