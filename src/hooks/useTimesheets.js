import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendFCMNotification } from '../utils/fcmNotifications';
import { formatDateForDisplay } from '../utils/dateHelpers';

export const useTimesheets = (weekStartDate, targetUserId = null) => {
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [timesheet, setTimesheet] = useState(null);
    const [entries, setEntries] = useState([]);

    // Determine whose timesheet we are managing
    const userId = targetUserId || authUser?.id;

    const fetchTimesheet = useCallback(async () => {
        if (!userId || !weekStartDate) return;

        try {
            setLoading(true);
            
            // Get timesheet for this week
            let { data: ts, error: tsError } = await supabase
                .from('timesheets')
                .select('*')
                .eq('user_id', userId)
                .eq('week_start_date', weekStartDate)
                .maybeSingle();

            if (tsError) {
                console.error('❌ Error fetching timesheet:', tsError);
                throw tsError;
            }

            // If not found, use a virtual "Not Started" timesheet
            if (!ts) {
                setTimesheet({
                    user_id: userId,
                    week_start_date: weekStartDate,
                    status: 'Not Started',
                    isVirtual: true
                });
                setEntries([]);
            } else {
                setTimesheet(ts);

                // Fetch entries only if timesheet exists
                const { data: entryData, error: entryError } = await supabase
                    .from('timesheet_entries')
                    .select(`
                        *,
                        task:task_id(name),
                        project:projects(project_number, project_name)
                    `)
                    .eq('timesheet_id', ts.id);

                if (entryError) throw entryError;
                setEntries(entryData || []);
            }

        } catch (error) {
            console.error('Error fetching timesheet:', error);
            showToast('Failed to load timesheet', 'error');
        } finally {
            setLoading(false);
        }
    }, [userId, weekStartDate, showToast]);

    useEffect(() => {
        fetchTimesheet();
    }, [fetchTimesheet]);

    const saveEntry = async (entry) => {
        if (!entry) return;

        // Defensive guard: Don't save if it's a new entry with no hours
        if (!entry.id && (!entry.hours || entry.hours <= 0)) {
            console.log('🚫 Skipping save for empty new entry');
            return;
        }

        try {
            let currentTimesheet = timesheet;

            // If this is a virtual timesheet, create the real record first
            if (timesheet.isVirtual && !timesheet.id) {
                console.log('📝 Creating initial timesheet record for first entry...');
                const { data: newTs, error: createError } = await supabase
                    .from('timesheets')
                    .upsert([
                        { 
                            user_id: userId, 
                            week_start_date: weekStartDate, 
                            status: 'Draft' 
                        }
                    ], { onConflict: 'user_id, week_start_date' })
                    .select()
                    .single();

                if (createError) {
                    console.error('❌ Error creating timesheet:', createError);
                    throw createError;
                }
                currentTimesheet = newTs;
                setTimesheet(newTs);
            }

            const { data, error } = await supabase
                .from('timesheet_entries')
                .upsert({
                    ...entry,
                    timesheet_id: currentTimesheet.id
                })
                .select(`
                    *,
                    task:task_id(name),
                    project:projects(project_number, project_name)
                `)
                .single();

            if (error) throw error;
            
            setEntries(prev => {
                const index = prev.findIndex(e => e.id === data.id);
                if (index >= 0) {
                    const newEntries = [...prev];
                    newEntries[index] = data;
                    return newEntries;
                }
                return [...prev, data];
            });

            return data;
        } catch (error) {
            console.error('Error saving entry:', error);
            showToast('Failed to save entry', 'error');
            throw error;
        }
    };

    const deleteEntry = async (entryId) => {
        try {
            const { error } = await supabase
                .from('timesheet_entries')
                .delete()
                .eq('id', entryId);

            if (error) throw error;
            setEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (error) {
            console.error('Error deleting entry:', error);
            showToast('Failed to delete entry', 'error');
            throw error;
        }
    };

    const submitTimesheet = async () => {
        try {
            if (!timesheet || timesheet.isVirtual || entries.length === 0) {
                showToast('Cannot submit an empty timesheet', 'error');
                return;
            }

            const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
            const { error } = await supabase
                .from('timesheets')
                .update({ 
                    status: 'Submitted', 
                    submitted_at: new Date().toISOString(),
                    total_hours: totalHours
                })
                .eq('id', timesheet.id);

            if (error) throw error;
            setTimesheet(prev => ({ ...prev, status: 'Submitted' }));
            showToast('Timesheet submitted successfully', 'success');

            // --- Notification Logic for Line Manager ---
            try {
                // 1. Get user's line manager
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('line_manager_id, name')
                    .eq('id', userId)
                    .single();

                if (!userError && userData?.line_manager_id) {
                    const managerId = userData.line_manager_id;
                    const userName = userData.name || userId;
                    const weekDisplay = formatDateForDisplay(new Date(weekStartDate));

                    const notifTitle = '📝 Timesheet Submitted';
                    const notifMessage = `${userName} has submitted their timesheet for week starting ${weekDisplay} (${totalHours} hrs).`;

                    // 2. Create in-app notification for manager
                    // Use 'system' type to avoid 400 error from database check constraint
                    await supabase.from('notifications').insert({
                        user_id: managerId,
                        type: 'system', 
                        title: notifTitle,
                        message: notifMessage,
                        data: {
                            type: 'timesheet_submitted', // Keep original type in data for UI
                            timesheet_id: timesheet.id,
                            user_id: userId,
                            week_start_date: weekStartDate,
                            total_hours: totalHours
                        }
                    });

                    // 3. Send Push Notification to manager
                    await sendFCMNotification(
                        {
                            title: notifTitle,
                            body: notifMessage,
                            data: {
                                type: 'timesheet_submitted',
                                timesheetId: timesheet.id,
                                user_id: userId,
                                url: '/timesheet-approvals'
                            }
                        },
                        {
                            targetUserIds: [managerId],
                            excludeAuthorId: authUser?.id // Exclude the person who performed the action
                        }
                    );
                    console.log('✅ Line manager notified of timesheet submission');
                }
            } catch (notifErr) {
                console.error('Error sending submission notification:', notifErr);
                // Don't fail the submission if notification fails
            }

        } catch (error) {
            console.error('Error submitting timesheet:', error);
            showToast('Failed to submit timesheet', 'error');
            throw error;
        }
    };

    return {
        loading,
        timesheet,
        entries,
        saveEntry,
        deleteEntry,
        submitTimesheet,
        refresh: fetchTimesheet
    };
};
