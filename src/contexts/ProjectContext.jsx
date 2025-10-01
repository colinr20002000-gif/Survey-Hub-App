import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getProjects = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('projects')
                .select('*')
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
    };

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
    }, []);

    const addProject = async (projectData) => {
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
            if (data) setProjects(prev => [data[0], ...prev]);
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    };

    const updateProject = async (updatedProject) => {
        try {
            const updateQuery = Promise.race([
                supabase.from('projects').update(updatedProject).eq('id', updatedProject.id).select(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database update timeout')), 8000)
                )
            ]);
            
            const { data, error } = await updateQuery;
            if (error) console.error('Error updating project:', error);
            else if (data) setProjects(prev => prev.map(p => p.id === updatedProject.id ? data[0] : p));
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    };

    const deleteProject = async (projectId) => {
        try {
            const deleteQuery = Promise.race([
                supabase.from('projects').delete().eq('id', projectId),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database delete timeout')), 8000)
                )
            ]);
            
            const { error } = await deleteQuery;
            if (error) console.error('Error deleting project:', error);
            else setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (timeoutError) {
            console.error('Database timeout:', timeoutError);
            alert('Database connection timeout. Please try again.');
        }
    };
    
    const value = { projects, addProject, updateProject, deleteProject, loading, error };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
