import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuditTrailContext = createContext(null);

// Mock data fallback if database table doesn't exist
const mockAuditTrail = [
    { id: 1, timestamp: '2024-01-15T10:30:00', user: 'Colin Rogers', action: 'Project Created', details: 'Created new project: Manchester Metro Expansion', category: 'Project' },
    { id: 2, timestamp: '2024-01-15T11:45:00', user: 'Sarah Johnson', action: 'Task Updated', details: 'Changed status of "Site Survey" to completed', category: 'Task' },
    { id: 3, timestamp: '2024-01-15T14:20:00', user: 'Mike Chen', action: 'User Added', details: 'Added new team member: Emma Wilson', category: 'User Management' },
    { id: 4, timestamp: '2024-01-16T09:15:00', user: 'Colin Rogers', action: 'Project Modified', details: 'Updated budget for Birmingham Station Project', category: 'Project' },
    { id: 5, timestamp: '2024-01-16T10:00:00', user: 'Emma Wilson', action: 'Task Created', details: 'Created task: "Review architectural drawings"', category: 'Task' },
    { id: 6, timestamp: '2024-01-16T13:30:00', user: 'Sarah Johnson', action: 'Document Uploaded', details: 'Uploaded safety compliance certificate', category: 'Document' },
    { id: 7, timestamp: '2024-01-17T08:45:00', user: 'Mike Chen', action: 'Project Status Changed', details: 'Changed Leeds Bridge Renovation to "In Progress"', category: 'Project' },
    { id: 8, timestamp: '2024-01-17T11:20:00', user: 'Colin Rogers', action: 'Task Assigned', details: 'Assigned "Quality Control Review" to Mike Chen', category: 'Task' },
    { id: 9, timestamp: '2024-01-17T15:00:00', user: 'Emma Wilson', action: 'Settings Modified', details: 'Updated notification preferences', category: 'Settings' },
    { id: 10, timestamp: '2024-01-18T09:00:00', user: 'Sarah Johnson', action: 'Project Archived', details: 'Archived completed project: Liverpool Tunnel Assessment', category: 'Project' },
    { id: 11, timestamp: '2024-01-18T10:30:00', user: 'Mike Chen', action: 'User Role Updated', details: 'Changed Emma Wilson role to Project Manager', category: 'User Management' },
    { id: 12, timestamp: '2024-01-18T14:15:00', user: 'Colin Rogers', action: 'Task Completed', details: 'Marked "Environmental Impact Study" as complete', category: 'Task' },
    { id: 13, timestamp: '2024-01-19T08:30:00', user: 'Emma Wilson', action: 'Project Created', details: 'Created new project: Sheffield Tram Extension', category: 'Project' },
    { id: 14, timestamp: '2024-01-19T11:00:00', user: 'Sarah Johnson', action: 'Document Deleted', details: 'Removed outdated design specification v1.2', category: 'Document' },
    { id: 15, timestamp: '2024-01-19T15:45:00', user: 'Mike Chen', action: 'Task Priority Changed', details: 'Set "Safety Inspection" to high priority', category: 'Task' },
    { id: 16, timestamp: '2024-01-20T09:20:00', user: 'Colin Rogers', action: 'User Removed', details: 'Removed inactive user: John Smith', category: 'User Management' },
    { id: 17, timestamp: '2024-01-20T12:00:00', user: 'Emma Wilson', action: 'Project Budget Updated', details: 'Adjusted Newcastle Metro budget to £2.5M', category: 'Project' },
    { id: 18, timestamp: '2024-01-20T14:30:00', user: 'Sarah Johnson', action: 'Task Reassigned', details: 'Reassigned "Client Presentation" to Colin Rogers', category: 'Task' },
    { id: 19, timestamp: '2024-01-21T10:15:00', user: 'Mike Chen', action: 'System Backup', details: 'Initiated scheduled database backup', category: 'System' },
    { id: 20, timestamp: '2024-01-21T16:00:00', user: 'Colin Rogers', action: 'Project Milestone', details: 'Completed Phase 1 of Manchester Metro Expansion', category: 'Project' }
];

export const AuditTrailProvider = ({ children }) => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getAuditLogs = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .order('timestamp', { ascending: false });

                if (fetchError) {
                    // If table doesn't exist, fall back to mock data
                    if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
                        console.warn('audit_logs table not found, using mock data');
                        setAuditLogs(mockAuditTrail);
                    } else {
                        setError(fetchError.message);
                        setAuditLogs([]);
                    }
                } else {
                    setAuditLogs(data || []);
                }
            } catch (e) {
                console.warn('Error fetching audit logs, using mock data:', e);
                setAuditLogs(mockAuditTrail);
            } finally {
                setLoading(false);
            }
        };

        getAuditLogs();
    }, []);

    const addAuditLog = async (logData) => {
        try {
            // Create timestamp in UK timezone
            const ukTimestamp = new Date().toLocaleString("en-CA", {
                timeZone: "Europe/London",
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(', ', 'T') + '+01:00';

            const { data, error } = await supabase
                .from('audit_logs')
                .insert([{
                    ...logData,
                    timestamp: ukTimestamp
                }])
                .select();

            if (error) {
                console.error('Error adding audit log:', error);
                return;
            }

            if (data) {
                setAuditLogs(prev => [data[0], ...prev]);
            }
        } catch (e) {
            console.error('Error adding audit log:', e);
        }
    };

    const value = { auditLogs, addAuditLog, loading, error };

    return <AuditTrailContext.Provider value={value}>{children}</AuditTrailContext.Provider>;
};

export const useAuditTrail = () => {
    const context = useContext(AuditTrailContext);
    if (!context) {
        throw new Error('useAuditTrail must be used within an AuditTrailProvider');
    }
    return context;
};
