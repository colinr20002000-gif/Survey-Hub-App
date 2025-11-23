import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useOffline } from './SimpleOfflineContext';
import { cacheData, getCachedData } from '../utils/simpleOfflineCache';

const JobContext = createContext(null);

export const JobProvider = ({ children }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const { isOnline } = useOffline();

    // Map database snake_case to component camelCase
    const mapToCamelCase = useCallback((job) => ({
        id: job.id,
        createdAt: job.created_at,
        projectName: job.project_name,
        projectNumber: job.project_number,
        itemName: job.item_name,
        projectManager: job.project_manager,
        client: job.client,
        processingHours: job.processing_hours,
        checkingHours: job.checking_hours,
        siteStartDate: job.site_start_date,
        siteCompletionDate: job.site_completion_date,
        plannedDeliveryDate: job.planned_delivery_date,
        actualDeliveryDate: job.actual_delivery_date,
        discipline: job.discipline,
        comments: job.comments,
        status: job.status,
        archived: job.archived,
    }), []);

    // Map component camelCase to database snake_case
    const mapToSnakeCase = useCallback((job) => ({
        project_name: job.projectName,
        project_number: job.projectNumber,
        item_name: job.itemName,
        project_manager: job.projectManager,
        client: job.client,
        processing_hours: job.processingHours,
        checking_hours: job.checkingHours,
        site_start_date: job.siteStartDate || null,
        site_completion_date: job.siteCompletionDate || null,
        planned_delivery_date: job.plannedDeliveryDate || null,
        actual_delivery_date: job.actualDeliveryDate || null,
        discipline: job.discipline,
        comments: job.comments,
        status: job.status,
        archived: job.archived,
    }), []);

    const getJobs = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (isOnline) {
            // ONLINE: Fetch from Supabase
            try {
                const { data, error: fetchError } = await supabase
                    .from('jobs')
                    .select('*')
                    .order('planned_delivery_date', { ascending: true });

                if (fetchError) {
                    setError(fetchError.message);
                    // Try to load from cache as fallback
                    const cached = await getCachedData('jobs');
                    if (cached) {
                        console.log('📦 Using cached jobs due to fetch error');
                        setJobs(cached);
                    } else {
                        setJobs([]);
                    }
                } else {
                    const mappedJobs = data.map(mapToCamelCase) || [];
                    setJobs(mappedJobs);
                    setLastSync(Date.now());
                    // Cache for offline use
                    await cacheData('jobs', mappedJobs);
                    console.log('✅ Jobs cached for offline use');
                }
            } catch (err) {
                console.error("Error fetching jobs:", err);
                setError(err.message);
                // Try to load from cache as fallback
                const cached = await getCachedData('jobs');
                if (cached) {
                    console.log('📦 Using cached jobs due to error');
                    setJobs(cached);
                } else {
                    setJobs([]);
                }
            }
        } else {
            // OFFLINE: Load from cache
            try {
                const cached = await getCachedData('jobs');
                if (cached) {
                    setJobs(cached);
                    console.log('📦 Loaded jobs from cache (offline)');
                } else {
                    setJobs([]);
                    setError('No cached data available. Please connect to the internet.');
                }
            } catch (err) {
                setError('Failed to load cached data.');
                setJobs([]);
            }
        }

        setLoading(false);
    }, [isOnline, mapToCamelCase]);

    useEffect(() => {
        getJobs();
    }, [getJobs]);

    const addJob = useCallback(async (jobData) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot create jobs while offline. Please connect to the internet.');
            throw new Error('Cannot create jobs while offline');
        }

        const jobRecord = mapToSnakeCase(jobData);
        const { data, error } = await supabase
            .from('jobs')
            .insert([jobRecord])
            .select();

        if (error) {
             console.error('Error adding job:', error);
             alert(`Error adding job: ${error.message}`);
             return;
        }
        if (data) {
            setJobs(prev => [...prev, mapToCamelCase(data[0])]);
            // Update cache
            const updatedJobs = [...jobs, mapToCamelCase(data[0])];
            await cacheData('jobs', updatedJobs);
        }
    }, [isOnline, mapToSnakeCase, mapToCamelCase, jobs]);

    const updateJob = useCallback(async (updatedJob) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot update jobs while offline. Please connect to the internet.');
            throw new Error('Cannot update jobs while offline');
        }

        const jobRecord = mapToSnakeCase(updatedJob);
        const { data, error } = await supabase
            .from('jobs')
            .update(jobRecord)
            .eq('id', updatedJob.id)
            .select();

        if (error) {
            console.error('Error updating job:', error);
            alert(`Error updating job: ${error.message}`);
        } else if (data) {
            setJobs(prev => prev.map(j => (j.id === updatedJob.id ? mapToCamelCase(data[0]) : j)));
            // Update cache
            const updatedJobs = jobs.map(j => (j.id === updatedJob.id ? mapToCamelCase(data[0]) : j));
            await cacheData('jobs', updatedJobs);
        }
    }, [isOnline, mapToSnakeCase, mapToCamelCase, jobs]);

    const deleteJob = useCallback(async (jobId) => {
        // Block if offline
        if (!isOnline) {
            alert('Cannot delete jobs while offline. Please connect to the internet.');
            throw new Error('Cannot delete jobs while offline');
        }

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);

        if (error) {
            console.error('Error deleting job:', error);
            alert(`Error deleting job: ${error.message}`);
        } else {
            setJobs(prev => prev.filter(j => j.id !== jobId));
            // Update cache
            const updatedJobs = jobs.filter(j => j.id !== jobId);
            await cacheData('jobs', updatedJobs);
        }
    }, [isOnline, jobs]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        jobs,
        addJob,
        updateJob,
        deleteJob,
        loading,
        error,
        isOnline,
        lastSync
    }), [jobs, addJob, updateJob, deleteJob, loading, error, isOnline, lastSync]);

    return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
};

export const useJobs = () => {
    const context = useContext(JobContext);
    if (!context) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
};
