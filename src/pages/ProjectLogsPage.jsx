import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Upload, Filter, X, Calendar, ExternalLink, TrendingUp, Clock, AlertCircle, Users, XCircle, ChevronDown, Check, Download, Eye, FileSpreadsheet, Image } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Button, Input, Pagination, Combobox, Modal } from '../components/ui';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadialBarChart, RadialBar
} from 'recharts';
import { toPng } from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const ProjectLogsPage = () => {
    // Permissions
    const { user } = useAuth();
    const { can } = usePermissions();

    // Check if user has permission to view Project Logs
    const canViewProjectLogs = can('VIEW_PROJECT_LOGS');
    const canImportCSV = can('IMPORT_PROJECT_LOGS_CSV');
    // Colors for charts
    const COLORS = ['#fb923c', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    // Data state
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Modal states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Ref for dashboard export
    const dashboardRef = useRef(null);

    // Ref to track if data has been loaded (prevents refetch on tab switch)
    const hasLoadedData = useRef(false);

    // Ref to track if this is the initial mount (prevents filter clearing on first load)
    const isInitialMount = useRef(true);

    // Filter states with localStorage persistence
    const [dateRange, setDateRange] = useState(() => {
        const saved = localStorage.getItem('projectLogs_dateRange');
        return saved || 'last30';
    });
    const [customStartDate, setCustomStartDate] = useState(() => {
        return localStorage.getItem('projectLogs_customStartDate') || '';
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        return localStorage.getItem('projectLogs_customEndDate') || '';
    });
    const [selectedProjects, setSelectedProjects] = useState(() => {
        const saved = localStorage.getItem('projectLogs_selectedProjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedTypes, setSelectedTypes] = useState(() => {
        const saved = localStorage.getItem('projectLogs_selectedTypes');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedClients, setSelectedClients] = useState(() => {
        const saved = localStorage.getItem('projectLogs_selectedClients');
        return saved ? JSON.parse(saved) : [];
    });
    const [shiftType, setShiftType] = useState(() => {
        return localStorage.getItem('projectLogs_shiftType') || 'all';
    });
    const [cancelledFilter, setCancelledFilter] = useState(() => {
        return localStorage.getItem('projectLogs_cancelledFilter') || 'all';
    });
    const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState(() => {
        const saved = localStorage.getItem('projectLogs_selectedDaysOfWeek');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedMonths, setSelectedMonths] = useState(() => {
        const saved = localStorage.getItem('projectLogs_selectedMonths');
        return saved ? JSON.parse(saved) : [];
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'shift_start_date', direction: 'descending' });

    // Dropdown states
    const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
    const [typesDropdownOpen, setTypesDropdownOpen] = useState(false);
    const [clientsDropdownOpen, setClientsDropdownOpen] = useState(false);
    const [daysOfWeekDropdownOpen, setDaysOfWeekDropdownOpen] = useState(false);
    const [monthsDropdownOpen, setMonthsDropdownOpen] = useState(false);

    // Refs for click outside
    const projectsRef = useRef(null);
    const typesRef = useRef(null);
    const clientsRef = useRef(null);
    const daysOfWeekRef = useRef(null);
    const monthsRef = useRef(null);

    // Fetch project logs from Supabase
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('project_logs')
                .select('*')
                .order('shift_start_date', { ascending: false })
                .limit(3000);

            if (error) throw error;
            setLogs(data || []);

            // Get the most recent created_at timestamp to show when data was last imported
            if (data && data.length > 0) {
                const timestamps = data.map(log => new Date(log.created_at)).filter(d => !isNaN(d.getTime()));
                if (timestamps.length > 0) {
                    const mostRecent = new Date(Math.max(...timestamps));
                    setLastUpdated(mostRecent);
                }
            }

            hasLoadedData.current = true; // Mark that data has been loaded
        } catch (err) {
            console.error('Error fetching project logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only fetch logs once on mount - prevents refetching when switching browser tabs
        if (!hasLoadedData.current) {
            fetchLogs();
        }
    }, [fetchLogs]);

    // Save scroll position when leaving the page
    useEffect(() => {
        const saveScrollPosition = () => {
            sessionStorage.setItem('projectLogsScrollPosition', window.scrollY.toString());
        };

        // Save scroll position periodically and on component unmount
        const scrollInterval = setInterval(saveScrollPosition, 1000);

        return () => {
            clearInterval(scrollInterval);
            saveScrollPosition();
        };
    }, []);

    // Restore scroll position when returning to the page
    useEffect(() => {
        const savedScrollPosition = sessionStorage.getItem('projectLogsScrollPosition');
        if (savedScrollPosition && !loading) {
            // Wait for content to render before scrolling
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScrollPosition));
            }, 100);
        }
    }, [loading]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectsRef.current && !projectsRef.current.contains(event.target)) {
                setProjectsDropdownOpen(false);
            }
            if (typesRef.current && !typesRef.current.contains(event.target)) {
                setTypesDropdownOpen(false);
            }
            if (clientsRef.current && !clientsRef.current.contains(event.target)) {
                setClientsDropdownOpen(false);
            }
            if (daysOfWeekRef.current && !daysOfWeekRef.current.contains(event.target)) {
                setDaysOfWeekDropdownOpen(false);
            }
            if (monthsRef.current && !monthsRef.current.contains(event.target)) {
                setMonthsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('projectLogs_dateRange', dateRange);
    }, [dateRange]);

    useEffect(() => {
        localStorage.setItem('projectLogs_customStartDate', customStartDate);
    }, [customStartDate]);

    useEffect(() => {
        localStorage.setItem('projectLogs_customEndDate', customEndDate);
    }, [customEndDate]);

    useEffect(() => {
        localStorage.setItem('projectLogs_selectedProjects', JSON.stringify(selectedProjects));
    }, [selectedProjects]);

    useEffect(() => {
        localStorage.setItem('projectLogs_selectedTypes', JSON.stringify(selectedTypes));
    }, [selectedTypes]);

    useEffect(() => {
        localStorage.setItem('projectLogs_selectedClients', JSON.stringify(selectedClients));
    }, [selectedClients]);

    useEffect(() => {
        localStorage.setItem('projectLogs_shiftType', shiftType);
    }, [shiftType]);

    useEffect(() => {
        localStorage.setItem('projectLogs_cancelledFilter', cancelledFilter);
    }, [cancelledFilter]);

    useEffect(() => {
        localStorage.setItem('projectLogs_selectedDaysOfWeek', JSON.stringify(selectedDaysOfWeek));
    }, [selectedDaysOfWeek]);

    useEffect(() => {
        localStorage.setItem('projectLogs_selectedMonths', JSON.stringify(selectedMonths));
    }, [selectedMonths]);

    // Clean up selected filters when date range changes
    useEffect(() => {
        // Skip on initial mount to preserve filters loaded from localStorage
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Get the current unique values based on date range
        const { startDate, endDate } = getDateRange();

        if (!startDate && !endDate) return; // No date filter, keep all selections

        const dateFiltered = logs.filter(log => {
            const logDate = new Date(log.shift_start_date);
            if (startDate && logDate < startDate) return false;
            if (endDate && logDate > endDate) return false;
            return true;
        });

        const currentProjects = [...new Set(dateFiltered.map(l => l.project_no).filter(Boolean))];
        const currentTypes = [...new Set(dateFiltered.map(l => l.type).filter(Boolean))];
        const currentClients = [...new Set(dateFiltered.map(l => l.client).filter(Boolean))];
        const currentMonths = [...new Set(dateFiltered.map(l => {
            if (!l.shift_start_date) return null;
            const date = new Date(l.shift_start_date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }).filter(Boolean))];

        // Remove selected items that are no longer in the date range
        setSelectedProjects(prev => prev.filter(p => currentProjects.includes(p)));
        setSelectedTypes(prev => prev.filter(t => currentTypes.includes(t)));
        setSelectedClients(prev => prev.filter(c => currentClients.includes(c)));
        setSelectedMonths(prev => prev.filter(m => currentMonths.includes(m)));
    }, [dateRange, customStartDate, customEndDate, logs]);

    // Get date range filter
    const getDateRange = () => {
        const today = new Date();
        let startDate, endDate = today;

        switch (dateRange) {
            case 'allTime':
                startDate = null;
                endDate = null;
                break;
            case 'last7':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case 'last30':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                break;
            case 'last90':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 90);
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

            // Day of week filter
            if (selectedDaysOfWeek.length > 0) {
                const logDate = new Date(log.shift_start_date);
                const dayOfWeek = logDate.toLocaleDateString('en-US', { weekday: 'long' });
                if (!selectedDaysOfWeek.includes(dayOfWeek)) return false;
            }

            // Month filter
            if (selectedMonths.length > 0) {
                const logDate = new Date(log.shift_start_date);
                const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                if (!selectedMonths.includes(monthKey)) return false;
            }

            return true;
        });
    }, [logs, selectedProjects, selectedTypes, selectedClients, shiftType, cancelledFilter, selectedDaysOfWeek, selectedMonths, dateRange, customStartDate, customEndDate]);

    // Get date-filtered logs for dynamic filter options
    const dateFilteredLogs = useMemo(() => {
        const { startDate, endDate } = getDateRange();

        if (!startDate && !endDate) {
            return logs; // No date filtering, return all
        }

        return logs.filter(log => {
            const logDate = new Date(log.shift_start_date);
            if (startDate && logDate < startDate) return false;
            if (endDate && logDate > endDate) return false;
            return true;
        });
    }, [logs, dateRange, customStartDate, customEndDate]);

    // Get unique values for filters (based on date-filtered logs)
    const uniqueProjects = useMemo(() => [...new Set(dateFilteredLogs.map(l => l.project_no).filter(Boolean))].sort(), [dateFilteredLogs]);
    const uniqueTypes = useMemo(() => [...new Set(dateFilteredLogs.map(l => l.type).filter(Boolean))].sort(), [dateFilteredLogs]);
    const uniqueClients = useMemo(() => [...new Set(dateFilteredLogs.map(l => l.client).filter(Boolean))].sort(), [dateFilteredLogs]);
    const uniqueMonths = useMemo(() => {
        const months = dateFilteredLogs.map(l => {
            if (!l.shift_start_date) return null;
            const date = new Date(l.shift_start_date);
            return {
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            };
        }).filter(Boolean);

        // Remove duplicates based on key
        const uniqueMap = new Map();
        months.forEach(m => uniqueMap.set(m.key, m.label));

        // Sort by key (year-month) in descending order
        return Array.from(uniqueMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, label]) => ({ key, label }));
    }, [dateFilteredLogs]);

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
        const nightShifts = filteredLogs.filter(log => log.night_or_day_shift === 'Night').length;
        const nightShiftPercentage = totalShifts > 0 ? (nightShifts / totalShifts * 100) : 0;
        const cancelledShifts = filteredLogs.filter(log => log.was_shift_cancelled).length;
        const cancellationRate = totalShifts > 0 ? (cancelledShifts / totalShifts * 100) : 0;
        const avgStaffPerShift = totalShifts > 0 ? filteredLogs.reduce((sum, log) => sum + (log.staff_attended_count || 0), 0) / totalShifts : 0;

        return {
            totalShifts,
            totalHoursOnSite,
            totalTravelTime,
            nightShiftPercentage,
            cancellationRate,
            avgStaffPerShift
        };
    }, [filteredLogs]);

    // Shifts Over Time chart data
    const shiftsOverTimeData = useMemo(() => {
        const grouped = {};

        // First, group existing shifts by date
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

        // Get the date range to fill in missing dates
        const { startDate, endDate } = getDateRange();

        // Fill in all dates in the range (except for "All Time" to avoid too many data points)
        if (dateRange !== 'allTime') {
            let rangeStart = startDate;
            let rangeEnd = endDate || new Date();

            // Ensure we have a valid start date
            if (!rangeStart && Object.keys(grouped).length > 0) {
                const sortedDates = Object.keys(grouped).sort();
                rangeStart = new Date(sortedDates[0]);
            } else if (!rangeStart) {
                // If still no start date and no logs, use today
                rangeStart = new Date();
            }

            // Normalize dates to start of day for proper comparison
            const normalizeDate = (date) => {
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            const currentDate = normalizeDate(rangeStart);
            const endDateNormalized = normalizeDate(rangeEnd);

            // Fill in all dates in the range
            while (currentDate <= endDateNormalized) {
                const dateStr = currentDate.toISOString().split('T')[0];
                if (!grouped[dateStr]) {
                    grouped[dateStr] = { date: dateStr, total: 0 };
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [filteredLogs, dateRange, customStartDate, customEndDate]);

    // Work Breakdown chart data
    const workBreakdownData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const type = log.type || 'Unknown';
            grouped[type] = (grouped[type] || 0) + 1;
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0 && item.name !== 'Unknown'); // Filter out Unknown and zero values
    }, [filteredLogs]);

    // Client Breakdown chart data - formatted for donut chart
    const clientBreakdownData = useMemo(() => {
        const grouped = {};
        filteredLogs.forEach(log => {
            const client = log.client || 'Unknown';
            grouped[client] = (grouped[client] || 0) + 1;
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Show top 10 clients
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
            .sort((a, b) => (b.siteTime + b.travelTime) - (a.siteTime + a.travelTime))
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

    // Shift Pattern by Month data
    const shiftPatternByMonthData = useMemo(() => {
        // Generate the last 12 months
        const months = [];
        const today = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

            months.push({
                month: monthLabel,
                monthKey,
                Day: 0,
                Night: 0
            });
        }

        // Fill in data from logs
        filteredLogs.forEach(log => {
            if (!log.shift_start_date) return;

            const date = new Date(log.shift_start_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const monthData = months.find(m => m.monthKey === monthKey);
            if (monthData) {
                const shift = log.night_or_day_shift || 'Day';
                monthData[shift] += 1;
            }
        });

        return months;
    }, [filteredLogs]);

    // CSV parsing helper - handles quoted fields with commas
    const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        // Add last field
        result.push(current.trim());
        return result;
    };

    // Date parsing helper - converts various date formats to YYYY-MM-DD
    const parseDate = (dateStr) => {
        if (!dateStr || dateStr.trim() === '') return null;

        // Trim whitespace
        dateStr = dateStr.trim();

        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Try parsing various date formats
        let date = null;

        // Excel serial date number (e.g., 45123)
        if (/^\d{5}$/.test(dateStr)) {
            const excelDate = parseInt(dateStr);
            // Excel dates start from 1900-01-01 (but with a bug treating 1900 as leap year)
            const baseDate = new Date(1900, 0, 1);
            date = new Date(baseDate.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
        }
        // MM/DD/YYYY or M/D/YYYY (US format)
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/').map(Number);
            date = new Date(year, month - 1, day);
        }
        // DD/MM/YYYY or D/M/YYYY (UK format) - try this if US format creates invalid date
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('/').map(Number);
            // Try US format first
            let tempDate = new Date(parts[2], parts[0] - 1, parts[1]);
            if (isNaN(tempDate.getTime()) || parts[0] > 12) {
                // If invalid or month > 12, try UK format (DD/MM/YYYY)
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                date = tempDate;
            }
        }
        // YYYY/MM/DD or YYYY/M/D
        else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('/').map(Number);
            date = new Date(year, month - 1, day);
        }
        // MM-DD-YYYY or M-D-YYYY
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('-').map(Number);
            date = new Date(year, month - 1, day);
        }
        // DD-MM-YYYY or D-M-YYYY
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('-').map(Number);
            // Try US format first
            let tempDate = new Date(parts[2], parts[0] - 1, parts[1]);
            if (isNaN(tempDate.getTime()) || parts[0] > 12) {
                // If invalid or month > 12, try UK format
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                date = tempDate;
            }
        }
        // ISO 8601 with time (YYYY-MM-DDTHH:mm:ss)
        else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
            date = new Date(dateStr);
        }
        // Try native Date parsing as last resort
        else {
            date = new Date(dateStr);
        }

        // Validate the date
        if (!date || isNaN(date.getTime())) {
            console.warn(`Unable to parse date: "${dateStr}"`);
            return null;
        }

        // Format as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Handle CSV Import
    const handleCSVImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            let text = await file.text();

            // Remove BOM if present (common in CSV exports from Windows/Power Automate)
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.substring(1);
            }

            let rows = text.split('\n').filter(row => row.trim());

            // Check if first line is a separator declaration (sep=,) - common in Power Automate/Excel exports
            let headerRowIndex = 0;
            if (rows[0] && rows[0].trim().toLowerCase().startsWith('sep=')) {
                console.log('Detected separator declaration:', rows[0].trim());
                headerRowIndex = 1; // Skip the sep= line
            }

            const rawHeaders = parseCSVLine(rows[headerRowIndex]);

            // Clean headers and filter out empty ones
            const headers = rawHeaders.map(h => h.trim()).filter(h => h !== '');

            console.log('CSV Headers:', headers);
            console.log('Total columns:', headers.length);

            const records = [];

            // Start from the row after headers
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const rawValues = parseCSVLine(rows[i]);
                const record = {};

                // Create a mapping of cleaned headers to their values
                // Skip empty headers by checking the rawHeaders array
                let validColumnIndex = 0;
                rawHeaders.forEach((rawHeader, index) => {
                    const cleanHeader = rawHeader.trim();

                    // Skip empty headers
                    if (cleanHeader === '') return;

                    const header = headers[validColumnIndex];
                    let value = rawValues[index];
                    validColumnIndex++;

                    // Trim whitespace from value
                    if (typeof value === 'string') {
                        value = value.trim();
                    }

                    // Convert empty strings to null
                    record[header] = value === '' || value === undefined ? null : value;

                    // Parse and normalize date fields
                    if (header === 'shift_start_date' && value) {
                        const parsedDate = parseDate(value);
                        if (parsedDate) {
                            record[header] = parsedDate;
                            console.log(`Row ${i}: Parsed date "${value}" → "${parsedDate}"`);
                        } else {
                            console.error(`Row ${i}: Failed to parse date "${value}"`);
                        }
                        return; // Skip other conversions for this field
                    }

                    // Convert was_shift_cancelled field (Yes/No/N/A to boolean)
                    if (header === 'was_shift_cancelled') {
                        const upperValue = (value || '').toString().trim().toUpperCase();

                        // Debug logging for first 5 rows
                        if (i <= 5) {
                            console.log(`Row ${i} - was_shift_cancelled:`, {
                                original: rawValues[index],
                                trimmed: value,
                                upper: upperValue
                            });
                        }

                        if (upperValue === 'YES' || upperValue === 'TRUE' || upperValue === 'Y') {
                            record[header] = true;
                        } else if (upperValue === 'NO' || upperValue === 'FALSE' || upperValue === 'N') {
                            record[header] = false;
                        } else {
                            // N/A, blank, or any other value becomes null
                            record[header] = null;
                        }
                        return; // Skip other conversions for this field
                    }

                    // Convert boolean strings
                    if (value === 'TRUE' || value === 'true') record[header] = true;
                    if (value === 'FALSE' || value === 'false') record[header] = false;

                    // Convert integer fields (smallint in database)
                    const integerFields = [
                        'week_no', 'fiscal_week', 'fiscal_month', 'fiscal_quarter', 'fiscal_year',
                        'calendar_week', 'calendar_year', 'staff_attended_count', 'subcontractors_attended_count'
                    ];
                    if (integerFields.includes(header) && value) {
                        // Handle N/A, TBC, or other non-numeric text
                        const upperVal = value.toString().toUpperCase();
                        if (['N/A', 'TBC', 'NONE', '-'].includes(upperVal)) {
                            record[header] = null;
                        } else {
                            const num = parseInt(value);
                            // Ensure valid number, otherwise null
                            record[header] = isNaN(num) ? null : num;
                        }
                    }

                    // Convert decimal/numeric fields
                    const decimalFields = ['miles_from', 'yards_from', 'miles_to', 'yards_to', 'total_yardage'];
                    if (decimalFields.includes(header) && value) {
                        // Handle N/A, TBC, or other non-numeric text
                        const upperVal = value.toString().toUpperCase();
                        if (['N/A', 'TBC', 'NONE', '-'].includes(upperVal)) {
                            record[header] = null;
                        } else {
                            const num = parseFloat(value);
                            // Ensure valid number, otherwise null
                            record[header] = isNaN(num) ? null : num;
                        }
                    }
                });

                // Validate record - ensure no empty keys
                const validRecord = {};
                Object.keys(record).forEach(key => {
                    if (key && key.trim() !== '') {
                        validRecord[key] = record[key];
                    }
                });

                records.push(validRecord);
            }

            console.log('Sample record (first):', records[0]);
            console.log('Total records to import:', records.length);

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
                console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (rows ${i + 1} to ${Math.min(i + batchSize, records.length)})`);

                const { error: insertError } = await supabase
                    .from('project_logs')
                    .insert(batch);

                if (insertError) {
                    console.error('Insert error details:', insertError);
                    console.error('Problematic batch sample:', batch[0]);
                    console.error('Batch column keys:', Object.keys(batch[0]));
                    throw new Error(`Database insert failed at rows ${i + 1}-${Math.min(i + batchSize, records.length)}: ${insertError.message}`);
                }
            }

            await fetchLogs();
            setIsImportModalOpen(false);

            // Custom success message
            const message = `✅ CSV Import Successful!\n\n` +
                `📊 ${records.length} project log records have been imported.\n\n` +
                `All previous data has been replaced with the new data.\n` +
                `The dashboard and charts have been updated.`;
            alert(message);
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
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Handle time interval fields - convert to hours for proper numerical sorting
            if (['total_site_time', 'total_travel_time', 'time_lost'].includes(sortConfig.key)) {
                aVal = intervalToHours(aVal);
                bVal = intervalToHours(bVal);
            }

            // Handle project_no - convert to number for proper numerical sorting
            if (sortConfig.key === 'project_no') {
                aVal = aVal ? parseInt(aVal.toString().replace(/\D/g, '')) || 0 : 0;
                bVal = bVal ? parseInt(bVal.toString().replace(/\D/g, '')) || 0 : 0;
            }

            // Handle null values - push them to the end
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            // For boolean values (was_shift_cancelled), convert to number
            if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
            if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;

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

    // Handle file viewing (open in browser)
    const handleView = (url) => {
        // Check if it's a SharePoint link
        if (url.includes('sharepoint.com') || url.includes('.sharepoint.')) {
            // Remove download parameter if present
            let viewUrl = url.replace(/[\?&]download=1/gi, '');

            // For SharePoint, add web=1 parameter to force browser view
            const separator = viewUrl.includes('?') ? '&' : '?';
            viewUrl = `${viewUrl}${separator}web=1`;

            window.open(viewUrl, '_blank', 'noopener,noreferrer');
        }
        // Check if it's a PDF
        else if (url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')) {
            // Open PDF in browser viewer
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        // Check if it's an Office file (Excel, Word, PowerPoint)
        else if (url.toLowerCase().match(/\.(xlsx?m?|docx?m?|pptx?m?)$/i)) {
            // Try to use Office Online viewer for Office files
            const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
            window.open(viewerUrl, '_blank', 'noopener,noreferrer');
        }
        else {
            // For other files, just open directly
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Handle file download
    const handleDownload = async (url, projectNo) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            // Extract filename from URL or use project number
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `project-log-${projectNo || 'file'}.pdf`;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    // Handle CSV Export with filters
    const handleCSVExport = () => {
        try {
            // Get all column headers from filteredLogs
            const headers = filteredLogs.length > 0 ? Object.keys(filteredLogs[0]) : [];

            // Create CSV content
            const csvContent = [
                // Header row
                headers.join(','),
                // Data rows
                ...filteredLogs.map(log =>
                    headers.map(header => {
                        let value = log[header];

                        // Convert boolean to Yes/No for was_shift_cancelled
                        if (header === 'was_shift_cancelled') {
                            if (value === true) return 'Yes';
                            if (value === false) return 'No';
                            return 'N/A';
                        }

                        // Handle null/undefined
                        if (value === null || value === undefined) return '';
                        // Escape commas and quotes in values
                        const stringValue = String(value);
                        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                            return `"${stringValue.replace(/"/g, '""')}"`;
                        }
                        return stringValue;
                    }).join(',')
                )
            ].join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `project-logs-export-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show custom success message
            const activeFilters = [];
            if (dateRange !== 'allTime') activeFilters.push('Date Range');
            if (selectedProjects.length > 0) activeFilters.push('Projects');
            if (selectedClients.length > 0) activeFilters.push('Clients');
            if (selectedTypes.length > 0) activeFilters.push('Types');
            if (shiftType !== 'all') activeFilters.push('Shift Type');
            if (cancelledFilter !== 'all') activeFilters.push('Cancelled Status');
            if (selectedDaysOfWeek.length > 0) activeFilters.push('Days of Week');
            if (selectedMonths.length > 0) activeFilters.push('Months');

            const filterMessage = activeFilters.length > 0
                ? `\n\n🔍 Active Filters: ${activeFilters.join(', ')}`
                : '\n\n🔍 No filters applied - exported all data';

            alert(`✅ CSV Export Successful!\n\n📊 Exported Records: ${filteredLogs.length}\n📁 File Name: project-logs-export-${new Date().toISOString().split('T')[0]}.csv${filterMessage}\n\n💡 The exported data reflects your current filter settings.`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('❌ Error exporting CSV. Please try again.');
        }
    };

    // Handle Export Image
    const handleExportImage = async () => {
        if (!dashboardRef.current) return;

        setIsExporting(true);

        try {
            // Get date range text for display and filename
            const getDateRangeText = () => {
                switch (dateRange) {
                    case 'allTime':
                        return { display: 'All Time', filename: 'All-Time' };
                    case 'last7':
                        return { display: 'Last 7 Days', filename: 'Last-7-Days' };
                    case 'last30':
                        return { display: 'Last 30 Days', filename: 'Last-30-Days' };
                    case 'last90':
                        return { display: 'Last 3 Months', filename: 'Last-3-Months' };
                    case 'thisMonth':
                        return { display: 'This Month', filename: 'This-Month' };
                    case 'lastMonth':
                        return { display: 'Last Month', filename: 'Last-Month' };
                    case 'thisQuarter':
                        return { display: 'This Quarter', filename: 'This-Quarter' };
                    case 'thisYear':
                        return { display: 'This Year', filename: 'This-Year' };
                    case 'custom':
                        if (customStartDate && customEndDate) {
                            const start = new Date(customStartDate).toLocaleDateString('en-GB');
                            const end = new Date(customEndDate).toLocaleDateString('en-GB');
                            return {
                                display: `${start} to ${end}`,
                                filename: `${customStartDate}-to-${customEndDate}`
                            };
                        } else if (customStartDate) {
                            const start = new Date(customStartDate).toLocaleDateString('en-GB');
                            return {
                                display: `From ${start}`,
                                filename: `From-${customStartDate}`
                            };
                        } else if (customEndDate) {
                            const end = new Date(customEndDate).toLocaleDateString('en-GB');
                            return {
                                display: `Up to ${end}`,
                                filename: `Up-to-${customEndDate}`
                            };
                        }
                        return { display: 'Custom Range', filename: 'Custom-Range' };
                    default:
                        return { display: 'All Time', filename: 'All-Time' };
                }
            };

            const dateRangeInfo = getDateRangeText();

            // Create wrapper with fixed width for consistent export
            const exportWrapper = document.createElement('div');
            exportWrapper.style.position = 'fixed';
            exportWrapper.style.top = '0';
            exportWrapper.style.left = '0';
            exportWrapper.style.width = '2560px';
            exportWrapper.style.minHeight = '100vh';
            exportWrapper.style.zIndex = '99999';
            exportWrapper.style.backgroundColor = '#ffffff';
            exportWrapper.style.padding = '40px';
            exportWrapper.style.boxSizing = 'border-box';
            document.body.appendChild(exportWrapper);

            // Add title
            const title = document.createElement('div');
            title.style.marginBottom = '30px';
            title.style.textAlign = 'center';
            title.innerHTML = `
                <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">
                    Project Logs Analytics Dashboard
                </h1>
                <h2 style="font-size: 24px; font-weight: 600; color: #4b5563;">
                    ${dateRangeInfo.display}
                </h2>
                <h3 style="font-size: 18px; font-weight: 500; color: #6b7280; margin-top: 8px;">
                    Exported on ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
            `;
            exportWrapper.appendChild(title);

            // Clone dashboard
            const dashboardClone = dashboardRef.current.cloneNode(true);

            // Remove interactive elements
            const buttons = dashboardClone.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());

            // Remove scroll constraints and set to full display
            dashboardClone.style.maxHeight = 'none';
            dashboardClone.style.overflow = 'visible';
            dashboardClone.style.width = '100%';
            dashboardClone.style.height = 'auto';

            // Remove all dark mode classes from clone
            const allElements = dashboardClone.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    el.className = el.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
                }
            });

            if (dashboardClone.className && typeof dashboardClone.className === 'string') {
                dashboardClone.className = dashboardClone.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
            }

            exportWrapper.appendChild(dashboardClone);

            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture with html-to-image at full width
            const dataUrl = await toPng(exportWrapper, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                width: 2560,
                cacheBust: true,
                filter: (node) => {
                    return node.tagName !== 'BUTTON';
                }
            });

            // Cleanup
            document.body.removeChild(exportWrapper);

            // Download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Project-Logs-Analytics-${dateRangeInfo.filename}-${new Date().toISOString().split('T')[0]}.png`;
            link.click();
            setIsExporting(false);

        } catch (error) {
            console.error('Error exporting dashboard:', error);
            alert('Failed to export dashboard image. Please try again.');
            setIsExporting(false);
        }
    };

    // Handle opening in Excel
    const handleOpenInExcel = (url) => {
        // For SharePoint files, use ms-excel protocol to open directly in Excel desktop app
        if (url.includes('sharepoint.com') || url.includes('.sharepoint.')) {
            // Use ms-excel:ofe|u| protocol for SharePoint
            const excelUrl = `ms-excel:ofe|u|${url}`;
            window.location.href = excelUrl;
        } else {
            // For non-SharePoint files, try the same protocol
            const excelUrl = `ms-excel:ofe|u|${url}`;
            window.location.href = excelUrl;
        }
    };

    // Format time duration
    const formatDuration = (intervalStr) => {
        const hours = intervalToHours(intervalStr);
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    // Format project number with leading zeros to 6 digits
    const formatProjectNo = (projectNo) => {
        if (!projectNo) return 'N/A';
        // Convert to string and remove any non-numeric characters
        const numericOnly = projectNo.toString().replace(/\D/g, '');
        // Pad with leading zeros to 6 digits
        return numericOnly.padStart(6, '0');
    };

    // Custom tooltip for shift pattern charts
    const ShiftPatternTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dayShifts = payload.find(p => p.dataKey === 'Day')?.value || 0;
            const nightShifts = payload.find(p => p.dataKey === 'Night')?.value || 0;
            const total = dayShifts + nightShifts;

            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                            Day Shifts: <span className="font-semibold">{dayShifts}</span>
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            Night Shifts: <span className="font-semibold">{nightShifts}</span>
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                            Total Shifts: <span className="font-semibold">{total}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

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

    if (!canViewProjectLogs) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Access Denied</h3>
                            <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                You don't have permission to view Project Logs. Please contact an administrator if you need access.
                            </p>
                        </div>
                    </div>
                </div>
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
                    {lastUpdated && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center">
                            <Clock size={12} className="mr-1" />
                            Last updated: {lastUpdated.toLocaleString('en-GB', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportImage} disabled={isExporting}>
                        <Image size={16} className="mr-2" />
                        {isExporting ? 'Exporting...' : 'Export Image'}
                    </Button>
                    <Button variant="outline" onClick={handleCSVExport}>
                        <Download size={16} className="mr-2" />
                        Export CSV
                    </Button>
                    {canImportCSV && (
                        <Button onClick={() => setIsImportModalOpen(true)}>
                            <Upload size={16} className="mr-2" />
                            Import CSV
                        </Button>
                    )}
                </div>
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
                        <Combobox
                            label="Date Range"
                            value={{
                                'last7': 'Last 7 Days',
                                'last30': 'Last 30 Days',
                                'last90': 'Last 3 Months',
                                'thisMonth': 'This Month',
                                'lastMonth': 'Last Month',
                                'thisQuarter': 'This Quarter',
                                'thisYear': 'This Year',
                                'allTime': 'All Time',
                                'custom': 'Custom Range'
                            }[dateRange] || 'Last 7 Days'}
                            onChange={(e) => {
                                const map = {
                                    'Last 7 Days': 'last7',
                                    'Last 30 Days': 'last30',
                                    'Last 3 Months': 'last90',
                                    'This Month': 'thisMonth',
                                    'Last Month': 'lastMonth',
                                    'This Quarter': 'thisQuarter',
                                    'This Year': 'thisYear',
                                    'All Time': 'allTime',
                                    'Custom Range': 'custom'
                                };
                                setDateRange(map[e.target.value] || 'last7');
                            }}
                            options={['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'This Month', 'Last Month', 'This Quarter', 'This Year', 'All Time', 'Custom Range']}
                        />
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
                    <div className="relative" ref={projectsRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Projects {selectedProjects.length > 0 && `(${selectedProjects.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedProjects.length === 0 ? 'Select projects...' : `${selectedProjects.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${projectsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {projectsDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProjects(uniqueProjects)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProjects([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueProjects.map(project => (
                                    <label
                                        key={project}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedProjects.includes(project)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProjects([...selectedProjects, project]);
                                                } else {
                                                    setSelectedProjects(selectedProjects.filter(p => p !== project));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{project}</span>
                                        {selectedProjects.includes(project) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Type Filter */}
                    <div className="relative" ref={typesRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Task Types {selectedTypes.length > 0 && `(${selectedTypes.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setTypesDropdownOpen(!typesDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedTypes.length === 0 ? 'Select types...' : `${selectedTypes.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${typesDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {typesDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTypes(uniqueTypes)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTypes([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueTypes.map(type => (
                                    <label
                                        key={type}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedTypes([...selectedTypes, type]);
                                                } else {
                                                    setSelectedTypes(selectedTypes.filter(t => t !== type));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{type}</span>
                                        {selectedTypes.includes(type) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Client Filter */}
                    <div className="relative" ref={clientsRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Clients {selectedClients.length > 0 && `(${selectedClients.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setClientsDropdownOpen(!clientsDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedClients.length === 0 ? 'Select clients...' : `${selectedClients.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${clientsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {clientsDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedClients(uniqueClients)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedClients([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueClients.map(client => (
                                    <label
                                        key={client}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClients.includes(client)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedClients([...selectedClients, client]);
                                                } else {
                                                    setSelectedClients(selectedClients.filter(c => c !== client));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{client}</span>
                                        {selectedClients.includes(client) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Shift Type */}
                    <Combobox
                        label="Shift Type"
                        value={shiftType === 'all' ? 'All' : shiftType}
                        onChange={(e) => setShiftType(e.target.value === 'All' ? 'all' : e.target.value)}
                        options={['All', 'Day', 'Night']}
                    />

                    {/* Cancelled Filter */}
                    <Combobox
                        label="Cancelled"
                        value={cancelledFilter === 'all' ? 'All' : (cancelledFilter === 'yes' ? 'Yes' : 'No')}
                        onChange={(e) => {
                            const map = { 'All': 'all', 'Yes': 'yes', 'No': 'no' };
                            setCancelledFilter(map[e.target.value] || 'all');
                        }}
                        options={['All', 'Yes', 'No']}
                    />

                    {/* Day of Week Filter */}
                    <div className="relative" ref={daysOfWeekRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Day of Week {selectedDaysOfWeek.length > 0 && `(${selectedDaysOfWeek.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setDaysOfWeekDropdownOpen(!daysOfWeekDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedDaysOfWeek.length === 0 ? 'Select days...' : `${selectedDaysOfWeek.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${daysOfWeekDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {daysOfWeekDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDaysOfWeek(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDaysOfWeek([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <label
                                        key={day}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDaysOfWeek.includes(day)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedDaysOfWeek([...selectedDaysOfWeek, day]);
                                                } else {
                                                    setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== day));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{day}</span>
                                        {selectedDaysOfWeek.includes(day) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Month Filter */}
                    <div className="relative" ref={monthsRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Month {selectedMonths.length > 0 && `(${selectedMonths.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setMonthsDropdownOpen(!monthsDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedMonths.length === 0 ? 'Select months...' : `${selectedMonths.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${monthsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {monthsDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMonths(uniqueMonths.map(m => m.key))}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMonths([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueMonths.map(month => (
                                    <label
                                        key={month.key}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMonths.includes(month.key)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMonths([...selectedMonths, month.key]);
                                                } else {
                                                    setSelectedMonths(selectedMonths.filter(m => m !== month.key));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{month.label}</span>
                                        {selectedMonths.includes(month.key) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Clear Filters */}
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            // Reset all filter states
                            setDateRange('last30');
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setSelectedProjects([]);
                            setSelectedTypes([]);
                            setSelectedClients([]);
                            setShiftType('all');
                            setCancelledFilter('all');
                            setSelectedDaysOfWeek([]);
                            setSelectedMonths([]);

                            // Clear localStorage
                            localStorage.removeItem('projectLogs_dateRange');
                            localStorage.removeItem('projectLogs_customStartDate');
                            localStorage.removeItem('projectLogs_customEndDate');
                            localStorage.removeItem('projectLogs_selectedProjects');
                            localStorage.removeItem('projectLogs_selectedTypes');
                            localStorage.removeItem('projectLogs_selectedClients');
                            localStorage.removeItem('projectLogs_shiftType');
                            localStorage.removeItem('projectLogs_cancelledFilter');
                            localStorage.removeItem('projectLogs_selectedDaysOfWeek');
                            localStorage.removeItem('projectLogs_selectedMonths');
                        }}
                    >
                        Clear All Filters
                    </Button>
                </div>
            </div>

            {/* Dashboard Content - Wrapped for Export */}
            <div ref={dashboardRef}>
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
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Math.round(kpis.totalHoursOnSite)}h</p>
                        </div>
                        <Clock className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Travel Time</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Math.round(kpis.totalTravelTime)}h</p>
                        </div>
                        <Clock className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Night Shift %</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpis.nightShiftPercentage.toFixed(1)}%</p>
                        </div>
                        <Clock className="text-indigo-500" size={32} />
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
                {/* Time Allocation Analysis */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-semibold mb-4">Time Allocation by Project (Top 10)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timeAllocationData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="project" />
                            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => `${Math.round(value)} hours`} />
                            <Legend />
                            <Bar dataKey="siteTime" stackId="a" fill="#10b981" name="Site Time" />
                            <Bar dataKey="travelTime" stackId="a" fill="#3b82f6" name="Travel Time" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Work Breakdown & Client Breakdown - Side by Side */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Task Type Pie Chart */}
                        <div>
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

                        {/* Client Donut Chart */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Shifts by Client (Top 10)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={clientBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        labelLine={false}
                                        label={({ name }) => name}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {clientBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const total = clientBreakdownData.reduce((sum, item) => sum + item.value, 0);
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            return [`${value} shifts (${percentage}%)`, name];
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
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
                            <YAxis dataKey="project" type="category" width={120} interval={0} />
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
                            <Tooltip content={<ShiftPatternTooltip />} />
                            <Legend />
                            <Bar dataKey="Day" fill="#fb923c" name="Day Shifts" />
                            <Bar dataKey="Night" fill="#3b82f6" name="Night Shifts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Shift Pattern by Month (Day vs Night) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Shift Pattern by Month (Day vs Night)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={shiftPatternByMonthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<ShiftPatternTooltip />} />
                        <Legend />
                        <Bar dataKey="Day" fill="#fb923c" name="Day Shifts" />
                        <Bar dataKey="Night" fill="#3b82f6" name="Night Shifts" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Shifts Over Time */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Shifts Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={shiftsOverTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 'auto']} allowDataOverflow={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#fb923c" strokeWidth={2} name="Total Shifts" dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            </div>
            {/* End Dashboard Content */}

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
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('type')}>
                                    <div className="flex items-center">Type {getSortIndicator('type')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('client')}>
                                    <div className="flex items-center">Client {getSortIndicator('client')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('site_name')}>
                                    <div className="flex items-center">Site {getSortIndicator('site_name')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('total_site_time')}>
                                    <div className="flex items-center">Site Time {getSortIndicator('total_site_time')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('total_travel_time')}>
                                    <div className="flex items-center">Travel Time {getSortIndicator('total_travel_time')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('time_lost')}>
                                    <div className="flex items-center">Time Lost {getSortIndicator('time_lost')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('staff_attended_count')}>
                                    <div className="flex items-center">Staff {getSortIndicator('staff_attended_count')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('was_shift_cancelled')}>
                                    <div className="flex items-center">Cancelled {getSortIndicator('was_shift_cancelled')}</div>
                                </th>
                                <th scope="col" className="px-6 py-3">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map((log) => (
                                <tr key={log.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-6 py-4 whitespace-nowrap">{log.shift_start_date}</td>
                                    <td className="px-6 py-4 font-mono">{formatProjectNo(log.project_no)}</td>
                                    <td className="px-6 py-4">{log.type}</td>
                                    <td className="px-6 py-4">{log.client || 'N/A'}</td>
                                    <td className="px-6 py-4">{log.site_name || 'N/A'}</td>
                                    <td className="px-6 py-4">{formatDuration(log.total_site_time)}</td>
                                    <td className="px-6 py-4">{formatDuration(log.total_travel_time)}</td>
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
                                        {log.project_log_link ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleView(log.project_log_link);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Open in browser viewer"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDownload(log.project_log_link, log.project_no);
                                                    }}
                                                    className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                    title="Download file"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleOpenInExcel(log.project_log_link);
                                                    }}
                                                    className="p-1.5 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                                                    title="Open in Excel"
                                                >
                                                    <FileSpreadsheet size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">N/A</span>
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
