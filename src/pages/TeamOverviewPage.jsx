import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
    User as UserIcon,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { Button, Card, StatusBadge } from '../components/ui';
import MultiSelectFilter from '../components/ui/MultiSelectFilter';
import { getWeekStartDate, addDays, formatDateForDisplay, formatDateForKey } from '../utils/dateHelpers';
import TimesheetsPage from './TimesheetsPage';

const TeamOverviewPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [editingUserId, setEditingUserId] = useState(null);
    
    // Filters
    const [selectedDate, setSelectedDate] = useState(getWeekStartDate(new Date()));
    const [filterStatuses, setFilterStatuses] = useState([]);
    const [filterUsers, setFilterUsers] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    
    const weekStartStr = formatDateForKey(selectedDate);
    
    const fetchOverviewData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all active users, including their line managers
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select(`
                    id,
                    name,
                    email,
                    department,
                    line_manager_id
                `)
                .is('deleted_at', null)
                .order('name');
                
            if (usersError) throw usersError;
            
            // Map line managers in JS
            const usersWithManagers = usersData.map(u => ({
                ...u,
                line_manager: u.line_manager_id 
                    ? usersData.find(m => m.id === u.line_manager_id) 
                    : null
            }));
            setUsers(usersWithManagers || []);
            
            // Fetch timesheets for the selected week
            const { data: tsData, error: tsError } = await supabase
                .from('timesheets')
                .select('*')
                .eq('week_start_date', weekStartStr);
                
            if (tsError) throw tsError;
            setTimesheets(tsData || []);
            
        } catch (error) {
            console.error('Error fetching team overview:', error);
            showToast('Failed to load team overview', 'error');
        } finally {
            setLoading(false);
        }
    }, [weekStartStr, showToast]);
    
    useEffect(() => {
        fetchOverviewData();
    }, [fetchOverviewData]);

    // Calculate deadline: Friday of the next week
    // weekStartStr is Saturday. +13 days is next Friday.
    const deadlineDate = addDays(selectedDate, 13);
    // End of deadline date (23:59:59)
    deadlineDate.setHours(23, 59, 59, 999);
    const isPastDeadline = new Date() > deadlineDate;

    // Map users to their timesheet status
    const overviewData = useMemo(() => {
        return users.map(u => {
            const ts = timesheets.find(t => t.user_id === u.id);
            let status = ts?.status;
            let totalHours = ts?.total_hours || 0;
            
            if (!status) {
                status = isPastDeadline ? 'Overdue' : 'Not Started';
            } else if (status === 'Draft' || status === 'Rejected') {
                 if (isPastDeadline) {
                     status = 'Overdue';
                 }
            }
            
            return {
                user: u,
                timesheet: ts,
                status,
                totalHours,
                lineManagerName: u.line_manager ? u.line_manager.name : 'Unassigned'
            };
        });
    }, [users, timesheets, isPastDeadline]);

    const departments = useMemo(() => {
        const excludedDepartments = ['subcontractor', 'subcontractors', 'track handback', 'trackhand back', 'trackhandback'];
        const deps = new Set(
            users
                .map(u => u.department)
                .filter(Boolean)
                .filter(d => !excludedDepartments.includes(d.toLowerCase()))
        );
        return Array.from(deps).sort();
    }, [users]);
    
    // Final filtered data for the table, also excluding the specific departments
    const filteredData = useMemo(() => {
        const excludedDepartments = ['subcontractor', 'subcontractors', 'track handback', 'trackhand back', 'trackhandback'];
        return overviewData.filter(item => {
            const dept = (item.user.department || '').toLowerCase();
            if (excludedDepartments.includes(dept)) return false;
            
            if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;
            if (filterUsers.length > 0 && !filterUsers.includes(item.user.id)) return false;
            if (filterDepartments.length > 0 && !filterDepartments.includes(item.user.department)) return false;
            return true;
        });
    }, [overviewData, filterStatuses, filterUsers, filterDepartments]);
    
    const userOptions = useMemo(() => {
        const excludedDepartments = ['subcontractor', 'subcontractors', 'track handback', 'trackhand back', 'trackhandback'];
        const filteredUsers = users.filter(u => {
            const dept = (u.department || '').toLowerCase();
            return !excludedDepartments.includes(dept);
        });
        
        return filteredUsers.map(u => ({ value: u.id, label: u.name }));
    }, [users]);

    const handlePrevWeek = () => setSelectedDate(prev => addDays(prev, -7));
    const handleNextWeek = () => setSelectedDate(prev => addDays(prev, 7));
    const handleCurrentWeek = () => setSelectedDate(getWeekStartDate(new Date()));

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved': return <StatusBadge status="Approved" />;
            case 'Rejected': return <StatusBadge status="Rejected" />;
            case 'Submitted': return <StatusBadge status="Submitted" />;
            case 'Overdue': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
                        <AlertTriangle size={12} />
                        Overdue
                    </span>
                );
            case 'Draft': return <StatusBadge status="Draft" />;
            default: return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Not Started</span>;
        }
    };

    if (editingUserId) {
        return (
            <TimesheetsPage 
                userId={editingUserId} 
                externalDate={selectedDate}
                onBack={() => {
                    setEditingUserId(null);
                    fetchOverviewData();
                }} 
            />
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserIcon className="text-blue-600 dark:text-blue-400" />
                        Team Overview
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Monitor timesheet submissions and approvals</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Previous Week">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleCurrentWeek} className="px-3 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2">
                        <Calendar size={16} />
                        {formatDateForDisplay(selectedDate)}
                    </button>
                    <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Next Week">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MultiSelectFilter
                        label="Statuses"
                        options={['Approved', 'Submitted', 'Rejected', 'Overdue', 'Draft', 'Not Started']}
                        selectedValues={filterStatuses}
                        onChange={setFilterStatuses}
                    />
                    <MultiSelectFilter
                        label="Departments"
                        options={departments}
                        selectedValues={filterDepartments}
                        onChange={setFilterDepartments}
                    />
                    <MultiSelectFilter
                        label="Users"
                        options={userOptions}
                        selectedValues={filterUsers}
                        onChange={setFilterUsers}
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-4 font-semibold">User</th>
                                <th className="px-6 py-4 font-semibold">Department</th>
                                <th className="px-6 py-4 font-semibold">Line Manager</th>
                                <th className="px-6 py-4 font-semibold text-center">Total Hours</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                                        <p>Loading overview data...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No users match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {item.user.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.user.department || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.lineManagerName}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium">
                                            {item.totalHours ? item.totalHours.toFixed(1) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setEditingUserId(item.user.id)}
                                            >
                                                Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default TeamOverviewPage;
