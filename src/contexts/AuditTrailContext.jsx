import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuditTrailContext = createContext(null);

// Mock data fallback if database table doesn't exist
const mockAuditTrail = [
    { id: 1, timestamp: '2025-10-23T09:15:00', user: 'Colin Rogers', action: 'User Logged In', details: 'Colin Rogers logged into the system', category: 'Authentication' },
    { id: 2, timestamp: '2025-10-23T09:30:00', user: 'Sarah Johnson', action: 'User Accessed Site', details: 'Sarah Johnson accessed the system with existing session', category: 'Authentication' },
    { id: 3, timestamp: '2025-10-23T10:00:00', user: 'Mike Chen', action: 'User Logged In', details: 'Mike Chen logged into the system', category: 'Authentication' },
    { id: 4, timestamp: '2025-10-23T11:45:00', user: 'Emma Wilson', action: 'User Logged In', details: 'Emma Wilson logged into the system', category: 'Authentication' },
    { id: 5, timestamp: '2025-10-23T12:30:00', user: 'Colin Rogers', action: 'User Logged Out', details: 'Colin Rogers logged out of the system', category: 'Authentication' },
    { id: 6, timestamp: '2025-10-23T13:00:00', user: 'Sarah Johnson', action: 'User Accessed Site', details: 'Sarah Johnson accessed the system with existing session', category: 'Authentication' },
    { id: 7, timestamp: '2025-10-23T14:15:00', user: 'Mike Chen', action: 'User Logged Out', details: 'Mike Chen logged out of the system', category: 'Authentication' },
    { id: 8, timestamp: '2025-10-23T15:00:00', user: 'Emma Wilson', action: 'User Accessed Site', details: 'Emma Wilson accessed the system with existing session', category: 'Authentication' },
    { id: 9, timestamp: '2025-10-23T15:45:00', user: 'Colin Rogers', action: 'User Logged In', details: 'Colin Rogers logged into the system', category: 'Authentication' },
    { id: 10, timestamp: '2025-10-23T16:30:00', user: 'Sarah Johnson', action: 'User Logged Out', details: 'Sarah Johnson logged out of the system', category: 'Authentication' },
    { id: 11, timestamp: '2025-10-23T17:00:00', user: 'Emma Wilson', action: 'User Logged Out', details: 'Emma Wilson logged out of the system', category: 'Authentication' },
    { id: 12, timestamp: '2025-10-23T17:15:00', user: 'Mike Chen', action: 'User Logged In', details: 'Mike Chen logged into the system', category: 'Authentication' }
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
