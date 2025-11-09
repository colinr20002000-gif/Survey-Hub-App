import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Calendar, Download, Image as ImageIcon, User, TrendingUp, X, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Button, Select, Input } from '../components/ui';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { toPng } from 'html-to-image';

const ResourceAnalyticsPage = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef(null);

    // Refs for dropdowns
    const projectsRef = useRef(null);
    const clientsRef = useRef(null);
    const shiftsRef = useRef(null);
    const daysOfWeekRef = useRef(null);
    const monthsRef = useRef(null);
    const leaveTypesRef = useRef(null);
    const usersRef = useRef(null);
    const departmentsRef = useRef(null);

    // Filter states with localStorage persistence
    const [dateRange, setDateRange] = useState(() => {
        const saved = localStorage.getItem('resourceAnalytics_dateRange');
        return saved || 'last30';
    });
    const [customStartDate, setCustomStartDate] = useState(() => {
        return localStorage.getItem('resourceAnalytics_customStartDate') || '';
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        return localStorage.getItem('resourceAnalytics_customEndDate') || '';
    });
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);

    // Dropdown open states
    const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
    const [clientsDropdownOpen, setClientsDropdownOpen] = useState(false);
    const [shiftsDropdownOpen, setShiftsDropdownOpen] = useState(false);
    const [daysOfWeekDropdownOpen, setDaysOfWeekDropdownOpen] = useState(false);
    const [monthsDropdownOpen, setMonthsDropdownOpen] = useState(false);
    const [leaveTypesDropdownOpen, setLeaveTypesDropdownOpen] = useState(false);
    const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
    const [departmentsDropdownOpen, setDepartmentsDropdownOpen] = useState(false);

    // Table sorting state
    const [tableSortConfig, setTableSortConfig] = useState({ key: 'total', direction: 'descending' });

    // Colors for charts
    const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#06b6d4', '#84cc16'];
    const DAYS_OF_WEEK = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Fetch users
    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, name, privilege, avatar, email, department')
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setAllUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    // Fetch resource allocations
    useEffect(() => {
        fetchAllocations();
        fetchUsers();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectsRef.current && !projectsRef.current.contains(event.target)) {
                setProjectsDropdownOpen(false);
            }
            if (clientsRef.current && !clientsRef.current.contains(event.target)) {
                setClientsDropdownOpen(false);
            }
            if (shiftsRef.current && !shiftsRef.current.contains(event.target)) {
                setShiftsDropdownOpen(false);
            }
            if (daysOfWeekRef.current && !daysOfWeekRef.current.contains(event.target)) {
                setDaysOfWeekDropdownOpen(false);
            }
            if (monthsRef.current && !monthsRef.current.contains(event.target)) {
                setMonthsDropdownOpen(false);
            }
            if (leaveTypesRef.current && !leaveTypesRef.current.contains(event.target)) {
                setLeaveTypesDropdownOpen(false);
            }
            if (usersRef.current && !usersRef.current.contains(event.target)) {
                setUsersDropdownOpen(false);
            }
            if (departmentsRef.current && !departmentsRef.current.contains(event.target)) {
                setDepartmentsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchAllocations = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('resource_allocations')
                .select('*')
                .order('allocation_date', { ascending: false });

            if (error) throw error;

            setAllocations(data || []);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching resource allocations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Save filters to localStorage
    useEffect(() => {
        localStorage.setItem('resourceAnalytics_dateRange', dateRange);
    }, [dateRange]);

    useEffect(() => {
        localStorage.setItem('resourceAnalytics_customStartDate', customStartDate);
    }, [customStartDate]);

    useEffect(() => {
        localStorage.setItem('resourceAnalytics_customEndDate', customEndDate);
    }, [customEndDate]);

    // Get unique values for filters
    const uniqueProjects = useMemo(() => {
        const projects = new Set();
        allocations.forEach(a => {
            if (a.project_number) projects.add(a.project_number);
        });
        return Array.from(projects).sort();
    }, [allocations]);

    const uniqueClients = useMemo(() => {
        const clients = new Set();
        allocations.forEach(a => {
            if (a.client) clients.add(a.client);
        });
        return Array.from(clients).sort();
    }, [allocations]);

    const uniqueShifts = useMemo(() => {
        const shifts = new Set();
        allocations.forEach(a => {
            if (a.shift) shifts.add(a.shift);
        });
        return Array.from(shifts).sort();
    }, [allocations]);

    const uniqueLeaveTypes = useMemo(() => {
        const leaveTypes = new Set();
        allocations.forEach(a => {
            if (a.leave_type) leaveTypes.add(a.leave_type);
        });
        return Array.from(leaveTypes).sort();
    }, [allocations]);

    const uniqueDepartments = useMemo(() => {
        const departments = new Set();
        allUsers.forEach(user => {
            if (user.department) departments.add(user.department);
        });
        return Array.from(departments).sort();
    }, [allUsers]);

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set(['Available', 'Available (D)', 'Available (N)', 'Not Available']);
        return Array.from(statuses);
    }, []);

    // Dynamic users list based on other active filters (excluding user filter)
    const availableUsers = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDate, endDate;

        // Date range filter
        switch (dateRange) {
            case 'allTime':
                startDate = null;
                endDate = null;
                break;
            case 'last7':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                endDate = today;
                break;
            case 'last30':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                endDate = today;
                break;
            case 'last90':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 90);
                endDate = today;
                break;
            case 'thisWeek':
                // Week starts on Saturday (matching resource calendar)
                const currentDay = today.getDay();
                const diffToSaturday = (currentDay + 1) % 7; // Days since last Saturday
                startDate = new Date(today);
                startDate.setDate(today.getDate() - diffToSaturday);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday to Friday
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisQuarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                break;
            case 'next1Week':
                // Next week starting from next Saturday
                const currentDay1 = today.getDay();
                const daysUntilNextSat1 = (6 - currentDay1 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat1);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday to Friday
                break;
            case 'next2Weeks':
                // Next 2 weeks starting from next Saturday
                const currentDay2 = today.getDay();
                const daysUntilNextSat2 = (6 - currentDay2 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat2);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 13); // 2 weeks from Saturday
                break;
            case 'next3Weeks':
                // Next 3 weeks starting from next Saturday
                const currentDay3 = today.getDay();
                const daysUntilNextSat3 = (6 - currentDay3 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat3);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 20); // 3 weeks from Saturday
                break;
            case 'next4Weeks':
                // Next 4 weeks starting from next Saturday
                const currentDay4 = today.getDay();
                const daysUntilNextSat4 = (6 - currentDay4 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat4);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 27); // 4 weeks from Saturday
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? new Date(customEndDate) : null;
                break;
            default:
                startDate = null;
                endDate = null;
        }

        // Filter allocations based on non-user filters
        const filteredAllocs = allocations.filter(allocation => {
            const allocationDate = new Date(allocation.allocation_date);

            // Date filter
            if (startDate && allocationDate < startDate) return false;
            if (endDate && allocationDate > endDate) return false;

            // Project filter
            if (selectedProjects.length > 0 && !selectedProjects.includes(allocation.project_number)) return false;

            // Client filter
            if (selectedClients.length > 0 && !selectedClients.includes(allocation.client)) return false;

            // Shift filter
            if (selectedShifts.length > 0 && !selectedShifts.includes(allocation.shift)) return false;

            // Day of week filter
            if (selectedDaysOfWeek.length > 0) {
                const dayIndex = (allocationDate.getDay() + 1) % 7;
                if (!selectedDaysOfWeek.includes(DAYS_OF_WEEK[dayIndex])) return false;
            }

            // Month filter
            if (selectedMonths.length > 0) {
                const monthName = MONTHS[allocationDate.getMonth()];
                if (!selectedMonths.includes(monthName)) return false;
            }

            // Leave type filter
            if (selectedLeaveTypes.length > 0 && !selectedLeaveTypes.includes(allocation.leave_type)) return false;

            // Department filter
            if (selectedDepartments.length > 0) {
                const user = allUsers.find(u => u.id === allocation.user_id);
                if (!user || !selectedDepartments.includes(user.department)) return false;
            }

            return true;
        });

        // Get unique user IDs from filtered allocations
        const userIds = new Set(filteredAllocs.map(a => a.user_id).filter(Boolean));

        // Return users who have allocations
        return allUsers.filter(user => userIds.has(user.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [allocations, allUsers, dateRange, customStartDate, customEndDate, selectedProjects, selectedClients,
        selectedShifts, selectedDaysOfWeek, selectedMonths, selectedLeaveTypes, selectedDepartments]);

    // Clean up selected users that are no longer in availableUsers
    useEffect(() => {
        if (selectedUsers.length > 0) {
            const availableUserIds = new Set(availableUsers.map(u => u.id));
            const validSelectedUsers = selectedUsers.filter(userId => availableUserIds.has(userId));

            // Only update if there are actually users that need to be removed
            if (validSelectedUsers.length !== selectedUsers.length) {
                setSelectedUsers(validSelectedUsers);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableUsers]);

    // Filter allocations by all filters
    const filteredAllocations = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDate, endDate;

        // Date range filter
        switch (dateRange) {
            case 'allTime':
                startDate = null;
                endDate = null;
                break;
            case 'last7':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                endDate = today;
                break;
            case 'last30':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                endDate = today;
                break;
            case 'last90':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 90);
                endDate = today;
                break;
            case 'thisWeek':
                // Week starts on Saturday (matching resource calendar)
                const currentDay = today.getDay();
                const diffToSaturday = (currentDay + 1) % 7; // Days since last Saturday
                startDate = new Date(today);
                startDate.setDate(today.getDate() - diffToSaturday);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday to Friday
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisQuarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                break;
            case 'next1Week':
                // Next week starting from next Saturday
                const currentDay1 = today.getDay();
                const daysUntilNextSat1 = (6 - currentDay1 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat1);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday to Friday
                break;
            case 'next2Weeks':
                // Next 2 weeks starting from next Saturday
                const currentDay2 = today.getDay();
                const daysUntilNextSat2 = (6 - currentDay2 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat2);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 13); // 2 weeks from Saturday
                break;
            case 'next3Weeks':
                // Next 3 weeks starting from next Saturday
                const currentDay3 = today.getDay();
                const daysUntilNextSat3 = (6 - currentDay3 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat3);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 20); // 3 weeks from Saturday
                break;
            case 'next4Weeks':
                // Next 4 weeks starting from next Saturday
                const currentDay4 = today.getDay();
                const daysUntilNextSat4 = (6 - currentDay4 + 7) % 7 || 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntilNextSat4);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 27); // 4 weeks from Saturday
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? new Date(customEndDate) : null;
                break;
            default:
                startDate = null;
                endDate = null;
        }

        return allocations.filter(allocation => {
            const allocationDate = new Date(allocation.allocation_date);

            // Date filter
            if (startDate && allocationDate < startDate) return false;
            if (endDate && allocationDate > endDate) return false;

            // Project filter
            if (selectedProjects.length > 0 && !selectedProjects.includes(allocation.project_number)) return false;

            // Client filter
            if (selectedClients.length > 0 && !selectedClients.includes(allocation.client)) return false;

            // Shift filter
            if (selectedShifts.length > 0 && !selectedShifts.includes(allocation.shift)) return false;

            // Day of week filter
            if (selectedDaysOfWeek.length > 0) {
                const dayIndex = (allocationDate.getDay() + 1) % 7; // Convert to Sat=0, Sun=1, etc.
                if (!selectedDaysOfWeek.includes(DAYS_OF_WEEK[dayIndex])) return false;
            }

            // Month filter
            if (selectedMonths.length > 0) {
                const monthName = MONTHS[allocationDate.getMonth()];
                if (!selectedMonths.includes(monthName)) return false;
            }

            // Leave type filter
            if (selectedLeaveTypes.length > 0 && !selectedLeaveTypes.includes(allocation.leave_type)) return false;

            // User filter
            if (selectedUsers.length > 0 && !selectedUsers.includes(allocation.user_id)) return false;

            // Department filter
            if (selectedDepartments.length > 0) {
                const user = allUsers.find(u => u.id === allocation.user_id);
                if (!user || !selectedDepartments.includes(user.department)) return false;
            }

            // Status filter (for status assignments)
            if (selectedStatuses.length > 0 && allocation.assignment_type === 'status') {
                // Need to check the status from the assignment - for now skip this filter for status types
                // as the status value isn't stored directly in resource_allocations
            }

            return true;
        });
    }, [allocations, dateRange, customStartDate, customEndDate, selectedProjects, selectedClients,
        selectedShifts, selectedDaysOfWeek, selectedMonths, selectedLeaveTypes, selectedUsers, selectedDepartments, selectedStatuses, allUsers]);

    // Calculate comprehensive statistics
    const stats = useMemo(() => {
        const projectAssignments = filteredAllocations.filter(a => a.assignment_type === 'project');
        const statusAssignments = filteredAllocations.filter(a => a.assignment_type === 'status');
        const leaveAssignments = filteredAllocations.filter(a => a.assignment_type === 'leave');

        // Separate available and not available status (status is stored in comment field)
        const availableAssignments = statusAssignments.filter(a =>
            a.comment === 'Available' || a.comment === 'Available (D)' || a.comment === 'Available (N)'
        );
        const notAvailableAssignments = statusAssignments.filter(a => a.comment === 'Not Available');

        // Count each leave type separately
        // Count all annual leave types together (full day, am, pm)
        const annualLeave = leaveAssignments.filter(a =>
            a.leave_type === 'Annual Leave' ||
            a.leave_type === 'Annual Leave (am)' ||
            a.leave_type === 'Annual Leave (pm)'
        ).length;
        const officeHaydock = leaveAssignments.filter(a => a.leave_type === 'Office (Haydock)').length;
        const officeHome = leaveAssignments.filter(a => a.leave_type === 'Office (Home)').length;
        const restDay = leaveAssignments.filter(a => a.leave_type === 'Rest Day').length;
        const training = leaveAssignments.filter(a => a.leave_type === 'Training').length;
        const bankHoliday = leaveAssignments.filter(a => a.leave_type === 'Bank Holiday').length;
        const sick = leaveAssignments.filter(a => a.leave_type === 'Sick').length;
        const standDown = leaveAssignments.filter(a => a.leave_type === 'Stand Down').length;

        const uniqueProjects = new Set(projectAssignments.map(a => a.project_number).filter(Boolean));
        const uniqueUsers = new Set(filteredAllocations.map(a => a.user_id).filter(Boolean));
        const uniqueClients = new Set(projectAssignments.map(a => a.client).filter(Boolean));

        return {
            total: filteredAllocations.length,
            projects: projectAssignments.length,
            available: availableAssignments.length,
            notAvailable: notAvailableAssignments.length,
            annualLeave,
            officeHaydock,
            officeHome,
            restDay,
            training,
            bankHoliday,
            sick,
            standDown,
            uniqueProjects: uniqueProjects.size,
            uniqueUsers: uniqueUsers.size,
            uniqueClients: uniqueClients.size,
            avgPerUser: uniqueUsers.size > 0 ? (projectAssignments.length / uniqueUsers.size).toFixed(1) : 0
        };
    }, [filteredAllocations]);

    // Individual user breakdown with detailed stats
    const userBreakdown = useMemo(() => {
        const userStats = {};

        filteredAllocations.forEach(allocation => {
            const userId = allocation.user_id;
            if (!userId) return;

            if (!userStats[userId]) {
                userStats[userId] = {
                    userId,
                    name: 'Unknown',
                    total: 0,
                    projects: 0,
                    leave: 0,
                    available: 0,
                    notAvailable: 0,
                    projectList: new Set(),
                    clientList: new Set()
                };
            }

            userStats[userId].total++;

            if (allocation.assignment_type === 'project') {
                userStats[userId].projects++;
                if (allocation.project_number) userStats[userId].projectList.add(allocation.project_number);
                if (allocation.client) userStats[userId].clientList.add(allocation.client);
            } else if (allocation.assignment_type === 'leave') {
                userStats[userId].leave++;
            } else if (allocation.assignment_type === 'status') {
                // Status is stored in comment field
                if (allocation.comment === 'Available' || allocation.comment === 'Available (D)' || allocation.comment === 'Available (N)') {
                    userStats[userId].available++;
                } else if (allocation.comment === 'Not Available') {
                    userStats[userId].notAvailable++;
                }
            }
        });

        // Match user names
        Object.keys(userStats).forEach(userId => {
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                userStats[userId].name = user.name;
                userStats[userId].department = user.department;
            }
        });

        const users = Object.values(userStats)
            .map(user => ({
                ...user,
                projectList: Array.from(user.projectList),
                clientList: Array.from(user.clientList),
                uniqueProjects: user.projectList.size,
                uniqueClients: user.clientList.size,
                utilizationRate: user.total > 0 ? ((user.projects / user.total) * 100).toFixed(1) : 0
            }));

        // Apply sorting based on tableSortConfig
        return users.sort((a, b) => {
            let aVal = a[tableSortConfig.key];
            let bVal = b[tableSortConfig.key];

            // Special handling for utilizationRate (stored as string but should sort as number)
            if (tableSortConfig.key === 'utilizationRate') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            // Handle numeric values
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return tableSortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
            }

            // Handle string values (name, department)
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return tableSortConfig.direction === 'ascending'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            // Handle null/undefined values
            if (!aVal) return 1;
            if (!bVal) return -1;

            return 0;
        });
    }, [filteredAllocations, allUsers, tableSortConfig]);

    // Top 10 users by allocations (sorted by project count)
    const topUsersData = useMemo(() => {
        return [...userBreakdown]
            .sort((a, b) => b.projects - a.projects)
            .slice(0, 10)
            .map(user => ({
                name: user.name,
                total: user.total,
                projects: user.projects,
                leave: user.leave
            }));
    }, [userBreakdown]);

    // Assignment type breakdown
    const assignmentTypeData = useMemo(() => {
        return [
            { name: 'Project Assignments', value: stats.projects },
            { name: 'Status Entries', value: stats.status },
            { name: 'Leave', value: stats.leave }
        ].filter(item => item.value > 0);
    }, [stats]);

    // Top projects by allocation
    const topProjectsData = useMemo(() => {
        const projectCounts = {};
        filteredAllocations
            .filter(a => a.assignment_type === 'project' && a.project_number)
            .forEach(allocation => {
                const key = allocation.project_number;
                projectCounts[key] = (projectCounts[key] || 0) + 1;
            });

        return Object.entries(projectCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredAllocations]);

    // Client breakdown (top 10)
    const clientData = useMemo(() => {
        const clientCounts = {};
        filteredAllocations
            .filter(a => a.assignment_type === 'project' && a.client)
            .forEach(allocation => {
                clientCounts[allocation.client] = (clientCounts[allocation.client] || 0) + 1;
            });

        return Object.entries(clientCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredAllocations]);

    // Leave type breakdown
    const leaveTypeData = useMemo(() => {
        const leaveCounts = {};
        filteredAllocations
            .filter(a => a.assignment_type === 'leave' && a.leave_type)
            .forEach(allocation => {
                leaveCounts[allocation.leave_type] = (leaveCounts[allocation.leave_type] || 0) + 1;
            });

        return Object.entries(leaveCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAllocations]);

    // Shift breakdown with better categorization
    const shiftData = useMemo(() => {
        const shiftCounts = {};
        filteredAllocations
            .filter(a => a.assignment_type === 'project' && a.shift)
            .forEach(allocation => {
                shiftCounts[allocation.shift] = (shiftCounts[allocation.shift] || 0) + 1;
            });

        return Object.entries(shiftCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAllocations]);

    // Day of week breakdown (project allocations only)
    const dayOfWeekData = useMemo(() => {
        const dayCounts = {};
        DAYS_OF_WEEK.forEach(day => dayCounts[day] = 0);

        filteredAllocations
            .filter(a => a.assignment_type === 'project')
            .forEach(allocation => {
                const date = new Date(allocation.allocation_date);
                const dayIndex = (date.getDay() + 1) % 7; // Convert to Sat=0
                dayCounts[DAYS_OF_WEEK[dayIndex]]++;
            });

        return DAYS_OF_WEEK.map(day => ({
            day,
            count: dayCounts[day]
        }));
    }, [filteredAllocations]);

    // Monthly trend
    const monthlyTrendData = useMemo(() => {
        const monthCounts = {};

        filteredAllocations.forEach(allocation => {
            const date = new Date(allocation.allocation_date);
            const monthYear = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

            if (!monthCounts[monthYear]) {
                monthCounts[monthYear] = {
                    month: monthYear,
                    total: 0,
                    projects: 0,
                    leave: 0,
                    status: 0
                };
            }

            monthCounts[monthYear].total++;
            if (allocation.assignment_type === 'project') monthCounts[monthYear].projects++;
            else if (allocation.assignment_type === 'leave') monthCounts[monthYear].leave++;
            else if (allocation.assignment_type === 'status') monthCounts[monthYear].status++;
        });

        return Object.values(monthCounts).sort((a, b) => {
            const [monthA, yearA] = a.month.split(' ');
            const [monthB, yearB] = b.month.split(' ');
            const dateA = new Date(`${monthA} 1, ${yearA}`);
            const dateB = new Date(`${monthB} 1, ${yearB}`);
            return dateA - dateB;
        });
    }, [filteredAllocations]);

    // Month of the year distribution (all 12 months, project allocations only)
    const monthOfYearData = useMemo(() => {
        // Initialize all 12 months with 0
        const monthCounts = {};
        MONTHS.forEach(month => {
            monthCounts[month] = 0;
        });

        // Count project allocations by month
        filteredAllocations
            .filter(a => a.assignment_type === 'project')
            .forEach(allocation => {
                const date = new Date(allocation.allocation_date);
                const monthName = MONTHS[date.getMonth()];
                monthCounts[monthName]++;
            });

        // Return all 12 months in order
        return MONTHS.map(month => ({
            month,
            count: monthCounts[month]
        }));
    }, [filteredAllocations]);

    // Export dashboard as image
    const handleExportDashboard = async () => {
        if (!dashboardRef.current) return;

        setIsExporting(true);
        try {
            const dataUrl = await toPng(dashboardRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff'
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            const dateRangeText = dateRange.replace(/([A-Z])/g, '-$1').toLowerCase();
            link.download = `Resource-Analytics-${dateRangeText}-${new Date().toISOString().split('T')[0]}.png`;
            link.click();
        } catch (err) {
            console.error('Error exporting dashboard:', err);
            alert('Error exporting dashboard. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedProjects([]);
        setSelectedClients([]);
        setSelectedShifts([]);
        setSelectedDaysOfWeek([]);
        setSelectedMonths([]);
        setSelectedLeaveTypes([]);
        setSelectedUsers([]);
        setSelectedDepartments([]);
        setSelectedStatuses([]);
    };

    const hasActiveFilters = selectedProjects.length > 0 || selectedClients.length > 0 ||
        selectedShifts.length > 0 || selectedDaysOfWeek.length > 0 || selectedMonths.length > 0 ||
        selectedLeaveTypes.length > 0 || selectedUsers.length > 0 || selectedDepartments.length > 0 || selectedStatuses.length > 0;

    // Table sorting functions
    const requestTableSort = (key) => {
        let direction = 'ascending';
        if (tableSortConfig.key === key && tableSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setTableSortConfig({ key, direction });
    };

    const getTableSortIndicator = (key) => {
        if (tableSortConfig.key !== key) return '↕';
        return tableSortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="text-xl font-semibold">Loading Resource Analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Resource Analytics</h2>
                <p>There was a problem fetching data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 dark:bg-red-900/50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resource Analytics</h1>
                    {lastUpdated && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Last updated: {lastUpdated.toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchAllocations} variant="outline">
                        Refresh Data
                    </Button>
                    <Button onClick={handleExportDashboard} disabled={isExporting}>
                        <ImageIcon size={16} className="mr-2" />
                        {isExporting ? 'Exporting...' : 'Export as Image'}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Filter size={20} className="mr-2 text-orange-500" />
                        <h2 className="text-lg font-semibold">Filters</h2>
                        {hasActiveFilters && (
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                                Active
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <Button onClick={clearAllFilters} variant="outline" size="sm">
                            <X size={14} className="mr-1" />
                            Clear All Filters
                        </Button>
                    )}
                </div>

                {/* Date Range Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Date Range</label>
                        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                            <option value="last7">Last 7 Days</option>
                            <option value="last30">Last 30 Days</option>
                            <option value="last90">Last 3 Months</option>
                            <option value="thisWeek">This Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="thisQuarter">This Quarter</option>
                            <option value="thisYear">This Year</option>
                            <option value="next1Week">Next 1 Week</option>
                            <option value="next2Weeks">Next 2 Weeks</option>
                            <option value="next3Weeks">Next 3 Weeks</option>
                            <option value="next4Weeks">Next 4 Weeks</option>
                            <option value="allTime">All Time</option>
                            <option value="custom">Custom Range</option>
                        </Select>
                    </div>
                    {dateRange === 'custom' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">Start Date</label>
                                <Input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">End Date</label>
                                <Input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    {/* Shift Type Filter */}
                    <div className="relative" ref={shiftsRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Shift Type {selectedShifts.length > 0 && `(${selectedShifts.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setShiftsDropdownOpen(!shiftsDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedShifts.length === 0 ? 'Select shifts...' : `${selectedShifts.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${shiftsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {shiftsDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedShifts(uniqueShifts)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedShifts([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueShifts.map(shift => (
                                    <label
                                        key={shift}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedShifts.includes(shift)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedShifts([...selectedShifts, shift]);
                                                } else {
                                                    setSelectedShifts(selectedShifts.filter(s => s !== shift));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{shift}</span>
                                        {selectedShifts.includes(shift) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

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
                                        onClick={() => setSelectedDaysOfWeek(DAYS_OF_WEEK)}
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
                                {DAYS_OF_WEEK.map(day => (
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
                                        onClick={() => setSelectedMonths(MONTHS)}
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
                                {MONTHS.map(month => (
                                    <label
                                        key={month}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMonths.includes(month)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMonths([...selectedMonths, month]);
                                                } else {
                                                    setSelectedMonths(selectedMonths.filter(m => m !== month));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{month}</span>
                                        {selectedMonths.includes(month) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Leave Type Filter */}
                    <div className="relative" ref={leaveTypesRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Leave Type {selectedLeaveTypes.length > 0 && `(${selectedLeaveTypes.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setLeaveTypesDropdownOpen(!leaveTypesDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedLeaveTypes.length === 0 ? 'Select leave types...' : `${selectedLeaveTypes.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${leaveTypesDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {leaveTypesDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLeaveTypes(uniqueLeaveTypes)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLeaveTypes([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueLeaveTypes.map(leaveType => (
                                    <label
                                        key={leaveType}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedLeaveTypes.includes(leaveType)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedLeaveTypes([...selectedLeaveTypes, leaveType]);
                                                } else {
                                                    setSelectedLeaveTypes(selectedLeaveTypes.filter(lt => lt !== leaveType));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{leaveType}</span>
                                        {selectedLeaveTypes.includes(leaveType) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Department Filter */}
                    <div className="relative" ref={departmentsRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Department {selectedDepartments.length > 0 && `(${selectedDepartments.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setDepartmentsDropdownOpen(!departmentsDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedDepartments.length === 0 ? 'Select departments...' : `${selectedDepartments.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${departmentsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {departmentsDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDepartments(uniqueDepartments)}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDepartments([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {uniqueDepartments.map(department => (
                                    <label
                                        key={department}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.includes(department)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedDepartments([...selectedDepartments, department]);
                                                } else {
                                                    setSelectedDepartments(selectedDepartments.filter(d => d !== department));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{department}</span>
                                        {selectedDepartments.includes(department) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* User Filter */}
                    <div className="relative" ref={usersRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            User {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                        </label>
                        <button
                            type="button"
                            onClick={() => setUsersDropdownOpen(!usersDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
                        >
                            <span className="truncate">
                                {selectedUsers.length === 0 ? 'Select users...' : `${selectedUsers.length} selected`}
                            </span>
                            <ChevronDown size={16} className={`transition-transform ${usersDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {usersDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUsers(availableUsers.map(u => u.id))}
                                        className="flex-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUsers([])}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {availableUsers.map(user => (
                                    <label
                                        key={user.id}
                                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                } else {
                                                    setSelectedUsers(selectedUsers.filter(u => u !== user.id));
                                                }
                                            }}
                                            className="mr-2 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{user.name}</span>
                                        {selectedUsers.includes(user.id) && (
                                            <Check size={14} className="ml-auto text-orange-500" />
                                        )}
                                    </label>
                                ))}
                                {availableUsers.length === 0 && (
                                    <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No users match the current filters
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboard */}
            <div ref={dashboardRef} className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {/* 1. Project Allocations */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Project Allocations</div>
                        <div className="text-2xl font-bold text-blue-500">{stats.projects}</div>
                    </div>
                    {/* 2. Unique Projects */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Unique Projects</div>
                        <div className="text-2xl font-bold text-yellow-500">{stats.uniqueProjects}</div>
                    </div>
                    {/* 3. Team Members */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Team Members</div>
                        <div className="text-2xl font-bold text-pink-500">{stats.uniqueUsers}</div>
                    </div>
                    {/* 4. Clients */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Clients</div>
                        <div className="text-2xl font-bold text-teal-500">{stats.uniqueClients}</div>
                    </div>
                    {/* 5. Available */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
                        <div className="text-2xl font-bold text-green-500">{stats.available}</div>
                    </div>
                    {/* 6. Not Available */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Not Available</div>
                        <div className="text-2xl font-bold text-red-500">{stats.notAvailable}</div>
                    </div>
                    {/* 7. Avg Per User */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg Per User</div>
                        <div className="text-2xl font-bold text-indigo-500">{stats.avgPerUser}</div>
                    </div>
                </div>

                {/* Charts Row 1 - Projects & Users */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Projects */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Top 10 Projects by Allocations</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topProjectsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#3b82f6" name="Allocations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Users */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Top 10 Users by Allocations</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topUsersData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={120} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="projects" fill="#3b82f6" name="Projects" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Charts Row 2 - Time Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Day of Week Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Day of Week Distribution (Project Allocations)</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={dayOfWeekData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#10b981" name="Allocations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Shift Distribution */}
                    {shiftData.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold mb-4">Shift Type Distribution</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={shiftData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={130}
                                        innerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {shiftData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Charts Row 3 - Leave & Clients */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leave Type Breakdown */}
                    {leaveTypeData.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold mb-4">Non-Project Type Breakdown</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={leaveTypeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={130}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {leaveTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Client Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Top 10 Clients by Allocations</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={clientData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={130}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {clientData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Month of the Year Distribution - Full Width */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold mb-4">Month of the Year Distribution (Project Allocations)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={monthOfYearData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#f97316" name="Allocations" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Individual User Statistics Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <User size={20} className="mr-2 text-orange-500" />
                        Individual User Statistics
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('name')}
                                    >
                                        Name {getTableSortIndicator('name')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('department')}
                                    >
                                        Department {getTableSortIndicator('department')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('projects')}
                                    >
                                        Projects {getTableSortIndicator('projects')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('leave')}
                                    >
                                        Non-Project {getTableSortIndicator('leave')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('available')}
                                    >
                                        Available {getTableSortIndicator('available')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('uniqueProjects')}
                                    >
                                        Unique Projects {getTableSortIndicator('uniqueProjects')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('uniqueClients')}
                                    >
                                        Unique Clients {getTableSortIndicator('uniqueClients')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                        onClick={() => requestTableSort('utilizationRate')}
                                    >
                                        Utilization % {getTableSortIndicator('utilizationRate')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {userBreakdown.map((user, index) => (
                                    <tr key={user.userId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                        <td className="px-4 py-3 font-medium">{user.name}</td>
                                        <td className="px-4 py-3">{user.department || '-'}</td>
                                        <td className="px-4 py-3 text-center text-blue-500">{user.projects}</td>
                                        <td className="px-4 py-3 text-center text-purple-500">{user.leave}</td>
                                        <td className="px-4 py-3 text-center text-green-500">{user.available}</td>
                                        <td className="px-4 py-3 text-center">{user.uniqueProjects}</td>
                                        <td className="px-4 py-3 text-center">{user.uniqueClients}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-bold ${
                                                user.utilizationRate >= 70 ? 'text-green-500' :
                                                user.utilizationRate >= 40 ? 'text-yellow-500' :
                                                'text-red-500'
                                            }`}>
                                                {user.utilizationRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {userBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No user data available for the selected filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceAnalyticsPage;
