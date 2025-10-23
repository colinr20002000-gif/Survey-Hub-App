import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Filter, X, Calendar, Search, ExternalLink, TrendingUp, Clock, AlertCircle, Users, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Button, Select, Input, Pagination, Modal } from '../components/ui';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ProjectLogsPage = () => {
    // Data state
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Filter states
    const [dateRange, setDateRange] = useState('last30');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [shiftType, setShiftType] = useState('all');
    const [cancelledFilter, setCancelledFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'shift_start_date', direction: 'descending' });

    // Fetch project logs from Supabase
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('project_logs')
                .select('*')
                .order('shift_start_date', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching project logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Get date range filter
    const getDateRange = () => {
        const today = new Date();
        let startDate, endDate = today;

        switch (dateRange) {
            case 'last7':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case 'last30':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisQuarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? new Date(customEndDate) : today;
                break;
            default:
                startDate = null;
        }

        return { startDate, endDate };
    };

    // Filtered logs
    const filteredLogs = useMemo(() => {
        const { startDate, endDate } = getDateRange();

        return logs.filter(log => {
            // Date filter
            if (startDate || endDate) {
                const logDate = new Date(log.shift_start_date);
                if (startDate && logDate < startDate) return false;
                if (endDate && logDate > endDate) return false;
            }

            // Project filter
            if (selectedProjects.length > 0 && !selectedProjects.includes(log.project_no)) return false;

            // Type filter
            if (selectedTypes.length > 0 && !selectedTypes.includes(log.type)) return false;

            // Client filter
            if (selectedClients.length > 0 && !selectedClients.includes(log.client)) return false;

            // Shift type filter
            if (shiftType !== 'all' && log.night_or_day_shift !== shiftType) return false;

            // Cancelled filter
            if (cancelledFilter === 'yes' && !log.was_shift_cancelled) return false;
            if (cancelledFilter === 'no' && log.was_shift_cancelled) return false;

            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    log.project_no?.toLowerCase().includes(search) ||
                    log.site_name?.toLowerCase().includes(search) ||
                    log.client?.toLowerCase().includes(search) ||
                    log.type?.toLowerCase().includes(search)
                );
            }

            return true;
        });
    }, [logs, selectedProjects, selectedTypes, selectedClients, shiftType, cancelledFilter, searchTerm, dateRange, customStartDate, customEndDate]);

    // Get unique values for filters
    const uniqueProjects = useMemo(() => [...new Set(logs.map(l => l.project_no).filter(Boolean))].sort(), [logs]);
    const uniqueTypes = useMemo(() => [...new Set(logs.map(l => l.type).filter(Boolean))].sort(), [logs]);
    const uniqueClients = useMemo(() => [...new Set(logs.map(l => l.client).filter(Boolean))].sort(), [logs]);

    // Convert interval to hours
    const intervalToHours = (intervalStr) => {
        if (!intervalStr) return 0;
        try {
            const parts = intervalStr.match(/(\d+):(\d+):(\d+)/);
            if (parts) {
                const hours = parseInt(parts[1]);
                const minutes = parseInt(parts[2]);
                const seconds = parseInt(parts[3]);
                return hours + minutes / 60 + seconds / 3600;
            }
        } catch (e) {
            console.error('Error parsing interval:', e);
        }
        return 0;
    };

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalShifts = filteredLogs.length;
        const totalHoursOnSite = filteredLogs.reduce((sum, log) => sum + intervalToHours(log.total_site_time), 0);
        const totalTravelTime = filteredLogs.reduce((sum, log) => sum + intervalToHours(log.total_travel_time), 0);
        const totalTimeLost = filteredLogs.reduce((sum, log) => {
            return sum +
                intervalToHours(log.time_lost) +
                intervalToHours(log.time_lost_2) +
                intervalToHours(log.time_lost_3) +
                intervalToHours(log.time_lost_4);
        }, 0);
        const cancelledShifts = filteredLogs.filter(log => log.was_shift_cancelled).length;
        const cancellationRate = totalShifts > 0 ? (cancelledShifts / totalShifts * 100) : 0;
        const avgStaffPerShift = totalShifts > 0 ? filteredLogs.reduce((sum, log) => sum + (log.staff_attended_count || 0), 0) / totalShifts : 0;

        return {
            totalShifts,
            totalHoursOnSite,
            totalTravelTime,
            totalTimeLost,
            cancellationRate,
            avgStaffPerShift
        };
    }, [filteredLogs]);

    // Shifts Over Time chart data
    const shiftsOverTimeData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const date = log.shift_start_date;
            if (!grouped[date]) {
                grouped[date] = { date, total: 0 };
            }
            grouped[date].total += 1;

            // Group by type
            const type = log.type || 'Unknown';
            grouped[date][type] = (grouped[date][type] || 0) + 1;
        });

        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [filteredLogs]);

    // Work Breakdown chart data
    const workBreakdownData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const type = log.type || 'Unknown';
            grouped[type] = (grouped[type] || 0) + 1;
        });

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [filteredLogs]);

    // Project Performance chart data
    const projectPerformanceData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const project = log.project_no || 'Unknown';
            if (!grouped[project]) {
                grouped[project] = { project, shifts: 0, hours: 0, timeLost: 0 };
            }
            grouped[project].shifts += 1;
            grouped[project].hours += intervalToHours(log.total_site_time);
            grouped[project].timeLost += intervalToHours(log.time_lost) +
                intervalToHours(log.time_lost_2) +
                intervalToHours(log.time_lost_3) +
                intervalToHours(log.time_lost_4);
        });

        return Object.values(grouped)
            .sort((a, b) => b.shifts - a.shifts)
            .slice(0, 10);
    }, [filteredLogs]);

    // Time Allocation Analysis chart data
    const timeAllocationData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const project = log.project_no || 'Unknown';
            if (!grouped[project]) {
                grouped[project] = {
                    project,
                    siteTime: 0,
                    travelTime: 0,
                    timeLost: 0
                };
            }
            grouped[project].siteTime += intervalToHours(log.total_site_time);
            grouped[project].travelTime += intervalToHours(log.total_travel_time);
            grouped[project].timeLost += intervalToHours(log.time_lost) +
                intervalToHours(log.time_lost_2) +
                intervalToHours(log.time_lost_3) +
                intervalToHours(log.time_lost_4);
        });

        return Object.values(grouped)
            .sort((a, b) => (b.siteTime + b.travelTime + b.timeLost) - (a.siteTime + a.travelTime + a.timeLost))
            .slice(0, 10);
    }, [filteredLogs]);

    // Shift Pattern heatmap data
    const shiftPatternData = useMemo(() => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const grouped = {};

        days.forEach(day => {
            grouped[day] = { day, Day: 0, Night: 0 };
        });

        filteredLogs.forEach(log => {
            const day = log.shift_start_day;
            const shift = log.night_or_day_shift || 'Day';
            if (day && grouped[day]) {
                grouped[day][shift] += 1;
            }
        });

        return days.map(day => grouped[day]);
    }, [filteredLogs]);

    // Handle CSV Import
    const handleCSVImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const text = await file.text();
            const rows = text.split('\n').filter(row => row.trim());
            const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

            const records = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const record = {};
                headers.forEach((header, index) => {
                    const value = values[index];
                    // Convert empty strings to null
                    record[header] = value === '' || value === undefined ? null : value;

                    // Convert boolean strings
                    if (value === 'TRUE' || value === 'true') record[header] = true;
                    if (value === 'FALSE' || value === 'false') record[header] = false;

                    // Convert numeric strings
                    if (header.includes('count') || header.includes('week') || header.includes('month') || header.includes('year') || header.includes('quarter')) {
                        const num = parseInt(value);
                        if (!isNaN(num)) record[header] = num;
                    }
                    if (header.includes('miles') || header.includes('yards') || header.includes('yardage')) {
                        const num = parseFloat(value);
                        if (!isNaN(num)) record[header] = num;
                    }
                });
                records.push(record);
            }

            // Truncate existing data
            const { error: deleteError } = await supabase
                .from('project_logs')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

            if (deleteError) throw deleteError;

            // Insert new data in batches
            const batchSize = 100;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const { error: insertError } = await supabase
                    .from('project_logs')
                    .insert(batch);

                if (insertError) throw insertError;
            }

            await fetchLogs();
            setIsImportModalOpen(false);
            alert('CSV imported successfully!');
        } catch (err) {
            console.error('Error importing CSV:', err);
            alert('Error importing CSV: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Sorting
    const sortedLogs = useMemo(() => {
        const sorted = [...filteredLogs];
        sorted.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredLogs, sortConfig]);

    // Pagination
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(start, start + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (!sortedLogs || sortedLogs.length === 0 || !itemsPerPage || itemsPerPage <= 0) return 0;
        return Math.ceil(sortedLogs.length / itemsPerPage);
    }, [sortedLogs, itemsPerPage]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Format time duration
    const formatDuration = (intervalStr) => {
        const hours = intervalToHours(intervalStr);
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const COLORS = ['#fb923c', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Project Logs...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Project Logs</h2>
                <p>There was a problem fetching data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Project Logs Analytics</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Comprehensive insights into project shifts, time allocation, and performance
                    </p>
                </div>
                <Button onClick={() => setIsImportModalOpen(true)}>
                    <Upload size={16} className="mr-2" />
                    Import CSV
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Filter size={18} className="mr-2" />
                    Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                        <Select
                            label="Date Range"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="last7">Last 7 Days</option>
                            <option value="last30">Last 30 Days</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="thisQuarter">This Quarter</option>
                            <option value="thisYear">This Year</option>
                            <option value="custom">Custom Range</option>
                        </Select>
                    </div>

                    {dateRange === 'custom' && (
                        <>
                            <Input
                                label="Start Date"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                            />
                        </>
                    )}

                    {/* Project Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Projects</label>
                        <select
                            multiple
                            value={selectedProjects}
                            onChange={(e) => setSelectedProjects(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {uniqueProjects.map(project => (
                                <option key={project} value={project}>{project}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Types</label>
                        <select
                            multiple
                            value={selectedTypes}
                            onChange={(e) => setSelectedTypes(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {uniqueTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Client Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clients</label>
                        <select
                            multiple
                            value={selectedClients}
                            onChange={(e) => setSelectedClients(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {uniqueClients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shift Type */}
                    <Select
                        label="Shift Type"
                        value={shiftType}
                        onChange={(e) => setShiftType(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="Day">Day</option>
                        <option value="Night">Night</option>
                    </Select>

                    {/* Cancelled Filter */}
                    <Select
                        label="Cancelled"
                        value={cancelledFilter}
                        onChange={(e) => setCancelledFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </Select>

                    {/* Search */}
                    <div className="lg:col-span-2">
                        <Input
                            label="Search"
                            type="text"
                            placeholder="Search projects, sites, clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Clear Filters */}
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setDateRange('last30');
                            setSelectedProjects([]);
                            setSelectedTypes([]);
                            setSelectedClients([]);
                            setShiftType('all');
                            setCancelledFilter('all');
                            setSearchTerm('');
                        }}
                    >
                        Clear All Filters
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.totalShifts}</p>
                        </div>
                        <TrendingUp className="text-orange-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Hours on Site</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.totalHoursOnSite.toFixed(1)}h</p>
                        </div>
                        <Clock className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Travel Time</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.totalTravelTime.toFixed(1)}h</p>
                        </div>
                        <Clock className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Time Lost</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.totalTimeLost.toFixed(1)}h</p>
                        </div>
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cancellation Rate</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.cancellationRate.toFixed(1)}%</p>
                        </div>
                        <XCircle className="text-purple-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Staff/Shift</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.avgStaffPerShift.toFixed(1)}</p>
                        </div>
                        <Users className="text-indigo-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Charts Section 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Shifts Over Time */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold mb-4">Shifts Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={shiftsOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#fb923c" strokeWidth={2} name="Total Shifts" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Work Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold mb-4">Shifts by Task Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={workBreakdownData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {workBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Section 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Project Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold mb-4">Top 10 Projects by Shifts</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={projectPerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="project" type="category" width={80} />
                            <Tooltip />
                            <Bar dataKey="shifts" fill="#fb923c" name="Shifts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Shift Pattern */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold mb-4">Shift Pattern (Day vs Night)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={shiftPatternData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Day" fill="#fb923c" name="Day Shifts" />
                            <Bar dataKey="Night" fill="#3b82f6" name="Night Shifts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Time Allocation Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Time Allocation by Project (Top 10)</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={timeAllocationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="project" />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="siteTime" stackId="a" fill="#10b981" name="Site Time" />
                        <Bar dataKey="travelTime" stackId="a" fill="#3b82f6" name="Travel Time" />
                        <Bar dataKey="timeLost" stackId="a" fill="#ef4444" name="Time Lost" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Raw Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Project Logs Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Showing {paginatedLogs.length} of {filteredLogs.length} filtered records
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('shift_start_date')}>
                                    <div className="flex items-center">Date {getSortIndicator('shift_start_date')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('project_no')}>
                                    <div className="flex items-center">Project {getSortIndicator('project_no')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3">Type</th>
                                <th scope="col" className="px-6 py-3">Client</th>
                                <th scope="col" className="px-6 py-3">Site</th>
                                <th scope="col" className="px-6 py-3">Site Time</th>
                                <th scope="col" className="px-6 py-3">Time Lost</th>
                                <th scope="col" className="px-6 py-3">Staff</th>
                                <th scope="col" className="px-6 py-3">Cancelled</th>
                                <th scope="col" className="px-6 py-3">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map((log) => (
                                <tr key={log.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-6 py-4 whitespace-nowrap">{log.shift_start_date}</td>
                                    <td className="px-6 py-4 font-mono">{log.project_no || 'N/A'}</td>
                                    <td className="px-6 py-4">{log.type}</td>
                                    <td className="px-6 py-4">{log.client || 'N/A'}</td>
                                    <td className="px-6 py-4">{log.site_name || 'N/A'}</td>
                                    <td className="px-6 py-4">{formatDuration(log.total_site_time)}</td>
                                    <td className="px-6 py-4">
                                        {formatDuration(log.time_lost)}
                                        {(log.time_lost_2 || log.time_lost_3 || log.time_lost_4) && '+'}
                                    </td>
                                    <td className="px-6 py-4">{log.staff_attended_count || 0}</td>
                                    <td className="px-6 py-4">
                                        {log.was_shift_cancelled ? (
                                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">Yes</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">No</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.project_log_link && (
                                            <a
                                                href={log.project_log_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-orange-500 hover:text-orange-600 flex items-center"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4">
                    <Pagination
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        totalItems={sortedLogs.length}
                    />
                </div>
            </div>

            {/* Import CSV Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Project Logs CSV">
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Upload a CSV file containing project logs. This will replace all existing data.
                        </p>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">Warning:</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                Importing will DELETE all existing project logs and replace them with the data from your CSV file.
                            </p>
                        </div>
                    </div>
                    <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVImport}
                        disabled={isUploading}
                    />
                    {isUploading && (
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading and processing CSV...</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ProjectLogsPage;
