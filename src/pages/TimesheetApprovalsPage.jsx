import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { 
    CheckCircle, 
    XCircle, 
    Clock, 
    Search, 
    Filter, 
    ChevronRight, 
    ChevronLeft, 
    Loader2, 
    AlertCircle,
    User,
    Calendar,
    Edit3,
    Send,
    AlertTriangle,
    Users
} from 'lucide-react';
import { Button, Card, StatusBadge, Combobox, Switch } from '../components/ui';
import { getWeekStartDate, addDays, formatDateForDisplay, formatDateForKey } from '../utils/dateHelpers';
import { sendFCMNotification } from '../utils/fcmNotifications';
import TimesheetsPage from './TimesheetsPage';

const TimesheetApprovalsPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { projects } = useProjects();
    const { can } = usePermissions();
    
    const [loading, setLoading] = useState(true);
    const [timesheets, setTimesheets] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getWeekStartDate(new Date()));
    const [filterStatus, setFilterStatus] = useState('Pending');
    const [editingUserId, setEditingUserId] = useState(null);
    
    const weekStartStr = formatDateForKey(selectedDate);

    const fetchPendingTimesheets = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch only managed staff (Real and Dummy)
            const staffQuery = supabase.from('users')
                .select('id, name, department, email, line_manager_id')
                .eq('line_manager_id', user.id)
                .is('deleted_at', null);
                
            const dummyStaffQuery = supabase.from('dummy_users')
                .select('id, name, team_role, email, line_manager_id')
                .eq('line_manager_id', user.id)
                .is('deleted_at', null);

            const [staffResult, dummyStaffResult] = await Promise.all([staffQuery, dummyStaffQuery]);
            
            if (staffResult.error) throw staffResult.error;
            if (dummyStaffResult.error) throw dummyStaffResult.error;

            const allStaff = [
                ...(staffResult.data || []).map(s => ({ ...s, is_dummy: false })),
                ...(dummyStaffResult.data || []).map(s => ({ ...s, is_dummy: true, department: s.team_role }))
            ];
            
            if (allStaff.length === 0) {
                setTimesheets([]);
                return;
            }

            // 2. Fetch all timesheets for these users for the selected week
            const staffIds = allStaff.map(s => s.id);
            
            const { data: tsData, error: tsError } = await supabase
                .from('timesheets')
                .select('*')
                .in('user_id', staffIds)
                .eq('week_start_date', weekStartStr);
            
            if (tsError) throw tsError;

            // 3. Combine staff data with timesheet data
            const statusData = allStaff.map(member => {
                const ts = tsData?.find(t => t.user_id === member.id);
                return {
                    id: ts?.id || `new-${member.id}`,
                    user_id: member.id,
                    user: member, 
                    status: ts?.status || 'Not Started',
                    total_hours: ts?.total_hours || 0,
                    week_start_date: weekStartStr,
                    is_placeholder: !ts,
                    rejection_comment: ts?.rejection_comment,
                    is_dummy: member.is_dummy
                };
            });
            
            // 4. Further filter by status
            const filtered = filterStatus === 'All' 
                ? statusData 
                : filterStatus === 'Pending'
                    ? statusData.filter(ts => ['Submitted', 'Draft', 'Not Started'].includes(ts.status))
                    : statusData.filter(ts => ts.status === filterStatus);

            // Sort by name
            filtered.sort((a, b) => a.user.name.localeCompare(b.user.name));

            setTimesheets(filtered);
        } catch (error) {
            console.error('Error fetching approvals:', error);
            showToast('Failed to load approvals', 'error');
        } finally {
            setLoading(false);
        }
    }, [weekStartStr, filterStatus, user, showToast]);

    useEffect(() => {
        if (user) fetchPendingTimesheets();
    }, [fetchPendingTimesheets, user]);

    const handleAction = async (tsId, action, comment = '') => {
        try {
            // Find the timesheet to get the user_id
            const tsToUpdate = timesheets.find(t => t.id === tsId);
            if (!tsToUpdate || tsToUpdate.is_placeholder) throw new Error('Timesheet not found or not started');

            const updates = {
                status: action === 'Approve' ? 'Approved' : 'Rejected',
                approved_at: action === 'Approve' ? new Date().toISOString() : null,
                rejection_comment: action === 'Reject' ? comment : null,
                last_modified_by: user.id
            };

            const { error } = await supabase
                .from('timesheets')
                .update(updates)
                .eq('id', tsId);

            if (error) throw error;

            // Notification Logic
            try {
                const notifType = action === 'Reject' ? 'timesheet_rejected' : 'timesheet_approved';
                const notifTitle = action === 'Reject' ? '❌ Timesheet Rejected' : '✅ Timesheet Approved';
                const notifMessage = action === 'Reject' 
                    ? `Your timesheet for week starting ${formatDateForDisplay(new Date(tsToUpdate.week_start_date))} was rejected: ${comment}`
                    : `Your timesheet for week starting ${formatDateForDisplay(new Date(tsToUpdate.week_start_date))} has been approved.`;

                // 1. Create in-app notification
                await supabase.from('notifications').insert({
                    user_id: tsToUpdate.user_id,
                    type: 'system', 
                    title: notifTitle,
                    message: notifMessage,
                    data: {
                        type: notifType,
                        timesheet_id: tsId,
                        week_start_date: tsToUpdate.week_start_date,
                        action_by: user.id,
                        comment: comment
                    }
                });

                // 2. Send Push Notification
                await sendFCMNotification(
                    {
                        title: notifTitle,
                        body: notifMessage,
                        data: {
                            type: notifType,
                            timesheetId: tsId,
                            url: '/timesheets'
                        }
                    },
                    {
                        targetUserIds: [tsToUpdate.user_id],
                        excludeAuthorId: null
                    }
                );
            } catch (notifErr) {
                console.error('Error sending notifications:', notifErr);
            }

            showToast(`Timesheet ${action === 'Approve' ? 'approved' : 'rejected'}`, 'success');
            fetchPendingTimesheets();
        } catch (error) {
            console.error('Action failed:', error);
            showToast('Action failed', 'error');
        }
    };

    if (editingUserId) {
        return (
            <TimesheetsPage 
                userId={editingUserId} 
                externalDate={selectedDate}
                onBack={() => {
                    setEditingUserId(null);
                    fetchPendingTimesheets();
                }} 
            />
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircle className="text-green-500" />
                        Timesheet Approvals
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review and manage timesheets for your assigned team.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <Button variant="ghost" size="xs" onClick={() => setSelectedDate(prev => addDays(prev, -7))}>
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-xs font-bold px-3 min-w-[120px] text-center">
                            Week: {formatDateForDisplay(selectedDate)}
                        </span>
                        <Button variant="ghost" size="xs" onClick={() => setSelectedDate(prev => addDays(prev, 7))}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>

                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="text-xs border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:ring-green-500"
                    >
                        <option value="Submitted">Pending (Submitted)</option>
                        <option value="Draft">Drafts</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Not Started">Not Started</option>
                        <option value="All">All Statuses</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-green-500" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {timesheets.map(ts => (
                        <ApprovalCard 
                            key={ts.id} 
                            timesheet={ts} 
                            onAction={handleAction}
                            onEdit={() => setEditingUserId(ts.user_id)}
                        />
                    ))}
                    
                    {timesheets.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No timesheets found</h3>
                            <p className="text-gray-500">There are no {filterStatus.toLowerCase()} timesheets for your team this week.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ApprovalCard = ({ timesheet, onAction, onEdit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [entries, setEntries] = useState([]);
    const [loadingEntries, setLoadingLoadingEntries] = useState(false);
    const [rejectionComment, setRejectionComment] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    const fetchEntries = async () => {
        if (timesheet.is_placeholder) return;
        setLoadingLoadingEntries(true);
        try {
            const { data, error } = await supabase
                .from('timesheet_entries')
                .select(`
                    *,
                    task:task_id(name),
                    project:projects(project_number, project_name)
                `)
                .eq('timesheet_id', timesheet.id)
                .order('entry_date');
            
            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLoadingEntries(false);
        }
    };

    useEffect(() => {
        if (isExpanded) fetchEntries();
    }, [isExpanded]);

    // Group entries for summary
    const groupedEntries = useMemo(() => {
        const groups = {};
        entries.forEach(e => {
            const key = e.project_number;
            if (!groups[key]) groups[key] = { name: e.project?.project_name || 'Internal', hours: 0 };
            groups[key].hours += Number(e.hours);
        });
        return Object.entries(groups);
    }, [entries]);

    const getStatusBadge = (status) => {
        if (status === 'Not Started') {
            return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Not Started</span>;
        }
        return <StatusBadge status={status} />;
    };

    return (
        <Card className={`overflow-hidden border-l-4 ${timesheet.status === 'Not Started' ? 'border-l-gray-300' : 'border-l-green-500'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                        <User size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{timesheet.user?.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {timesheet.user?.department || 'Staff'}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {timesheet.total_hours} Hours Total</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {getStatusBadge(timesheet.status)}
                    
                    {!timesheet.is_placeholder && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                        </Button>
                    )}

                    <div className="flex gap-2 ml-auto">
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={onEdit}
                        >
                            <Edit3 size={16} className="mr-1" /> Edit
                        </Button>

                        {timesheet.status === 'Submitted' && (
                            <>
                                <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => onAction(timesheet.id, 'Approve')}
                                >
                                    <CheckCircle size={16} className="mr-1" /> Approve
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => setShowRejectInput(true)}
                                >
                                    <XCircle size={16} className="mr-1" /> Reject
                                </Button>
                            </>
                        )}
                        
                        {timesheet.status === 'Approved' && (
                             <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setShowRejectInput(true)}
                            >
                                <XCircle size={16} className="mr-1" /> Reject
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {showRejectInput && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100">
                    <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-2">Reason for Rejection (Mandatory)</label>
                    <textarea 
                        className="w-full border-red-200 rounded-md p-3 text-sm focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]"
                        placeholder="Explain what needs to be fixed..."
                        value={rejectionComment}
                        onChange={(e) => setRejectionComment(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                        <Button variant="ghost" size="sm" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                        <Button 
                            size="sm" 
                            className="bg-red-600 text-white"
                            disabled={!rejectionComment.trim()}
                            onClick={() => onAction(timesheet.id, 'Reject', rejectionComment)}
                        >
                            Confirm Reject
                        </Button>
                    </div>
                </div>
            )}

            {isExpanded && !timesheet.is_placeholder && (
                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                    {loadingEntries ? (
                        <Loader2 className="animate-spin mx-auto text-gray-400" />
                    ) : (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupedEntries.map(([num, data]) => (
                                    <div key={num} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        <div>
                                            <span className="font-bold text-orange-600">{num}</span>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{data.name}</p>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">{data.hours.toFixed(1)} hrs</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                        <tr>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Project</th>
                                            <th className="p-2">Task</th>
                                            <th className="p-2">Subtask</th>
                                            <th className="p-2 text-right">Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {entries.map(e => (
                                            <tr key={e.id}>
                                                <td className="p-2 font-medium">{new Date(e.entry_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</td>
                                                <td className="p-2">{e.project_number}</td>
                                                <td className="p-2">{e.task?.name}</td>
                                                <td className="p-2">{e.subtask_id || '-'}</td>
                                                <td className="p-2 text-right font-bold">{Number(e.hours).toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default TimesheetApprovalsPage;
