import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const useTimesheetTasks = (contextId = null, isDropdownItem = false) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!contextId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            
            let query = supabase.from('timesheet_tasks').select('*').eq('is_active', true);
            
            if (isDropdownItem) {
                // Fetch tasks linked to a specific dynamic dropdown item (Sick, PTO, etc.)
                query = query.eq('dropdown_item_id', contextId);
            } else {
                // Fetch tasks for a specific project
                query = query.eq('project_id', contextId);
            }

            const { data, error } = await query.order('name');
            if (error) throw error;

            setTasks(data || []);
        } catch (error) {
            console.error('Error fetching timesheet tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [contextId, isDropdownItem]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { tasks, loading, refresh: fetchData };
};
