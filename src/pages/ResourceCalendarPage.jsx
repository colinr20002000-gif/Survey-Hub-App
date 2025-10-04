import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, Copy, Trash2, PlusCircle, FolderKanban, ClipboardCheck, Check, X, Filter, MoreVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { useJobs } from '../contexts/JobContext';
import { useUsers } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { getWeekStartDate, getFiscalWeek, addDays, formatDateForDisplay, formatDateForKey } from '../utils/dateHelpers';
import { getDepartmentColor, getAvatarText, getAvatarProps } from '../utils/avatarColors';
import { handleSupabaseError, isRLSError } from '../utils/rlsErrorHandler';
import { shiftColors, leaveColors } from '../constants';
import { Button, Select, Modal, Input } from '../components/ui';

const ResourceCalendarPage = ({ onViewProject }) => {
    const { user: currentUser } = useAuth();
    const { canAllocateResources, canSetAvailabilityStatus } = usePermissions();
    const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
    const { projects } = useProjects();
    const { showPrivilegeError, showErrorModal } = useToast();
    const [teamRoles, setTeamRoles] = useState([]);
    const [teamRolesLoading, setTeamRolesLoading] = useState(true);
    const [teamRolesError, setTeamRolesError] = useState(null);

    // Fetch team roles directly from dropdown_items table
    useEffect(() => {
        const fetchTeamRoles = async () => {
            setTeamRolesLoading(true);
            setTeamRolesError(null);
            try {
                // First get the team_role category ID
                const { data: categoryData, error: categoryError } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .eq('name', 'team_role')
                    .single();

                if (categoryError) {
                    console.error('Error fetching team role category:', categoryError);
                    setTeamRolesError(categoryError.message);
                    setTeamRoles([]);
                    return;
                }

                // Then get the team role items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('dropdown_items')
                    .select('value, display_text, sort_order')
                    .eq('category_id', categoryData.id)
                    .eq('is_active', true)
                    .order('sort_order');

                if (itemsError) {
                    console.error('Error fetching team role items:', itemsError);
                    setTeamRolesError(itemsError.message);
                    setTeamRoles([]);
                } else {
                    console.log('Successfully fetched team roles:', itemsData);
                    setTeamRoles(itemsData || []);
                }
            } catch (error) {
                console.error('Error in fetchTeamRoles:', error);
                setTeamRolesError(error.message);
                setTeamRoles([]);
            } finally {
                setTeamRolesLoading(false);
            }
        };

        fetchTeamRoles();
    }, []);

    // Fetch departments for filtering
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', 'department')
                    .eq('is_active', true)
                    .order('sort_order');

                if (error) {
                    console.error('Error fetching departments:', error);
                    // Try with capitalized name as fallback
                    const { data: capitalData, error: capitalError } = await supabase
                        .from('dropdown_items')
                        .select(`
                            display_text,
                            dropdown_categories!inner(name)
                        `)
                        .eq('dropdown_categories.name', 'Department')
                        .eq('is_active', true)
                        .order('sort_order');

                    if (!capitalError && capitalData && capitalData.length > 0) {
                        setDepartments(capitalData.map(dept => dept.display_text));
                    } else {
                        setDepartments([]);
                    }
                    return;
                }

                if (data && data.length > 0) {
                    setDepartments(data.map(dept => dept.display_text));
                } else {
                    setDepartments([]);
                }
            } catch (error) {
                console.error('Error fetching departments:', error);
                setDepartments([]);
            }
        };

        fetchDepartments();
    }, []);

    const getTeamRoleDisplayText = (roleValue) => {
        const role = teamRoles.find(r => r.value === roleValue);
        return role ? role.display_text : roleValue;
    };

    // Get only team roles that are actually assigned to users
    const activeTeamRoles = useMemo(() => {
        if (!allUsers || allUsers.length === 0 || !teamRoles || teamRoles.length === 0) {
            return [];
        }

        // Get unique team roles from all users
        const userRoles = new Set(allUsers.map(user => user.team_role).filter(Boolean));

        // Filter teamRoles to only include roles that have users assigned
        return teamRoles.filter(role => userRoles.has(role.display_text));
    }, [allUsers, teamRoles]);

    const [allocations, setAllocations] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStartDate(new Date()));
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [visibleUserIds, setVisibleUserIds] = useState([]);
    const [filterRoles, setFilterRoles] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sortOrder, setSortOrder] = useState('department');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null });
    const filterRef = useRef(null);
    const scrollPositionRef = useRef(0);

    // shiftColors and leaveColors imported from src/constants/index.js

    const getResourceAllocations = useCallback(async (silent = false) => {
        // Save scroll position before updating if in silent mode
        if (silent) {
            scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
        }

        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            // Fetch allocations from both real users and dummy users tables
            const [realAllocationsResult, dummyAllocationsResult] = await Promise.all([
                supabase.from('resource_allocations').select('*'),
                supabase.from('dummy_resource_allocations').select('*')
            ]);

            const { data: realData, error: realError } = realAllocationsResult;
            const { data: dummyData, error: dummyError } = dummyAllocationsResult;

                if (realError && dummyError) {
                    console.error('Error fetching resource allocations:', realError, dummyError);
                    setError('Failed to fetch allocations');
                    setAllocations({});
                    return;
                }

                // Combine data from both tables
                const allData = [
                    ...(realData || []),
                    ...(dummyData || [])
                ];

                const formattedAllocations = {};

                allData.forEach(allocation => {
                    if (!allocation.allocation_date) {
                        return;
                    }
                    const dateParts = allocation.allocation_date.split('-').map(Number);
                    const allocationDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                    const weekStart = getWeekStartDate(allocationDate);
                    const weekKey = formatDateForKey(weekStart);

                    if (!formattedAllocations[weekKey]) {
                        formattedAllocations[weekKey] = {};
                    }
                    if (!formattedAllocations[weekKey][allocation.user_id]) {
                        formattedAllocations[weekKey][allocation.user_id] = {
                            assignments: Array(7).fill(null)
                        };
                    }

                    const dayIndex = (allocationDate.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, etc.

                    let assignmentData = null;
                    if (allocation.leave_type) {
                        assignmentData = {
                            type: 'leave',
                            leaveType: allocation.leave_type,
                            comment: allocation.comment || ''
                        };
                    } else if (allocation.assignment_type === 'status') {
                        assignmentData = {
                            type: 'status',
                            status: allocation.comment || ''
                        };
                    } else if (allocation.assignment_type === 'project') {
                        assignmentData = {
                            type: 'project',
                            projectNumber: allocation.project_number || '',
                            projectName: allocation.project_name || '',
                            client: allocation.client || '',
                            task: allocation.task || '',
                            shift: allocation.shift || '',
                            time: allocation.time || '',
                            comment: allocation.comment || '',
                            projectId: allocation.project_id || null
                        };
                    }

                    if (dayIndex >= 0 && dayIndex < 7) {
                        const currentAssignment = formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex];

                        if (!currentAssignment) {
                            // First assignment for this day
                            formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = assignmentData;
                        } else if (assignmentData && assignmentData.type === 'project' && currentAssignment.type === 'project') {
                            // Multiple projects - convert to array
                            if (Array.isArray(currentAssignment)) {
                                currentAssignment.push(assignmentData);
                            } else {
                                formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = [currentAssignment, assignmentData];
                            }
                        } else if (assignmentData && assignmentData.type === 'leave') {
                            // Leave overwrites any project assignments
                            formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = assignmentData;
                        }
                    }
                });

            setAllocations(formattedAllocations);

            // Restore scroll position after state update if in silent mode
            if (silent) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current);
                });
            }

        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Failed to load resource allocations');
            setAllocations({});
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []); // Empty dependency array - function is stable

    useEffect(() => {
        getResourceAllocations();

        console.log('🔌 Setting up real-time subscriptions for resource allocations...');

        // Set up real-time subscriptions for resource allocations
        const realAllocationsSubscription = supabase
            .channel('resource-allocations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resource_allocations'
                },
                (payload) => {
                    console.log('📅 Resource allocations changed:', payload.eventType, payload);
                    console.log('🔄 Reloading resource allocations (silent)...');
                    getResourceAllocations(true); // Reload all allocations silently without showing loading state
                }
            )
            .subscribe((status) => {
                console.log('📡 Resource allocations subscription status:', status);
            });

        const dummyAllocationsSubscription = supabase
            .channel('dummy-resource-allocations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dummy_resource_allocations'
                },
                (payload) => {
                    console.log('📅 Dummy resource allocations changed:', payload.eventType, payload);
                    console.log('🔄 Reloading dummy resource allocations (silent)...');
                    getResourceAllocations(true); // Reload all allocations silently without showing loading state
                }
            )
            .subscribe((status) => {
                console.log('📡 Dummy resource allocations subscription status:', status);
            });

        return () => {
            console.log('🔌 Unsubscribing from resource allocations...');
            realAllocationsSubscription.unsubscribe();
            dummyAllocationsSubscription.unsubscribe();
        };
    }, [getResourceAllocations]); // Now depends on the memoized function

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
             if (contextMenu.visible) {
                setContextMenu({ visible: false });
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

        useEffect(() => {
        if (allUsers.length > 0) {
            // This line runs whenever the allUsers list changes.
            // It gets all the current user IDs and sets them as visible.
            setVisibleUserIds((allUsers || []).map(u => u.id));
        }
    }, [allUsers]);

    const displayedUsers = useMemo(() => {
        let usersToDisplay = allUsers;

        if (filterRoles.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterRoles.includes(user.team_role));
        }

        if (filterDepartments.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterDepartments.includes(user.department));
        }

        usersToDisplay = usersToDisplay.filter(user => visibleUserIds.includes(user.id));

        // Apply sorting based on sortOrder
        if (sortOrder === 'alphabetical') {
            usersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'department') {
            // Custom department order
            const departmentOrder = ['Site team', 'Project team', 'Delivery team', 'Design team', 'Office staff', 'Subcontractor'];

            usersToDisplay.sort((a, b) => {
                const deptA = (a.department || '').trim();
                const deptB = (b.department || '').trim();

                // Normalize department names to handle case variations
                const deptALower = deptA.toLowerCase();
                const deptBLower = deptB.toLowerCase();

                // Get the index in the custom order (case-insensitive)
                const indexA = departmentOrder.findIndex(dept => dept.toLowerCase() === deptALower);
                const indexB = departmentOrder.findIndex(dept => dept.toLowerCase() === deptBLower);

                // If both departments are in the custom order, sort by their index
                if (indexA !== -1 && indexB !== -1) {
                    if (indexA !== indexB) {
                        return indexA - indexB;
                    }
                } else if (indexA !== -1) {
                    // A is in custom order, B is not - A comes first
                    return -1;
                } else if (indexB !== -1) {
                    // B is in custom order, A is not - B comes first
                    return 1;
                } else {
                    // Neither is in custom order, sort alphabetically by department
                    const deptComparison = deptA.localeCompare(deptB);
                    if (deptComparison !== 0) {
                        return deptComparison;
                    }
                }

                // Same department (or both missing), sort by name
                return a.name.localeCompare(b.name);
            });
        }

        return usersToDisplay;
    }, [allUsers, visibleUserIds, filterRoles, filterDepartments, sortOrder]);

    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handleCellClick = (userId, date, dayIndex) => {
        if (!canAllocateResources) return;
        setSelectedCell({ userId, date, dayIndex });
        setIsAllocationModalOpen(true);
    };

    const handleActionClick = (e, userId, dayIndex, assignment) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment, date: weekDates[dayIndex] }
        });
    };

    const handleSaveAllocation = async (allocationData, cellToUpdate = selectedCell, isSecondProject = false) => {
        const { userId } = cellToUpdate;
        const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
        const dayIndex = (cellToUpdate.date.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, etc.

        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };

            const currentAssignment = newAllocations[weekKey][userId].assignments[dayIndex];

            if (allocationData === null) {
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else if (allocationData.type === 'leave') {
                newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
            } else if (allocationData.type === 'status') {
                newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
            } else if (!Object.values(allocationData).some(val => val !== '' && val !== 'Days' && val !== null)) {
                 newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else {
                const projectData = {...allocationData, type: 'project'};

                // Handle multiple projects per day
                if (isSecondProject && currentAssignment) {
                    if (Array.isArray(currentAssignment)) {
                        // Already have multiple projects, add another
                        newAllocations[weekKey][userId].assignments[dayIndex] = [...currentAssignment, projectData];
                    } else if (currentAssignment.type === 'project') {
                        // Convert single project to array
                        newAllocations[weekKey][userId].assignments[dayIndex] = [currentAssignment, projectData];
                    } else {
                        // Replace leave with project
                        newAllocations[weekKey][userId].assignments[dayIndex] = projectData;
                    }
                } else {
                    // First/only project for the day
                    newAllocations[weekKey][userId].assignments[dayIndex] = projectData;
                }
            }

            return newAllocations;
        });

        setIsAllocationModalOpen(false);

        // Determine if this is a dummy user and select the appropriate table
        const user = allUsers.find(u => u.id === userId);
        const isDummyUser = user?.isDummy === true;
        const tableName = isDummyUser ? 'dummy_resource_allocations' : 'resource_allocations';

        let recordData = null; // For error handling

        try {
            const allocationDate = cellToUpdate.date;
            const allocationDateString = formatDateForKey(allocationDate);

            // Get all existing records for this user and date
            const { data: existingRecords } = await supabase
                .from(tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            const shouldDelete = allocationData === null ||
                                (allocationData.type !== 'leave' &&
                                 !Object.values(allocationData).some(val => val !== '' && val !== 'Days' && val !== null));

            if (shouldDelete) {
                // Delete all existing records for this day
                if (existingRecords && existingRecords.length > 0) {
                    const { error } = await supabase
                        .from(tableName)
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);
                    if (error) throw error;
                }
            } else if (isSecondProject) {
                // Adding a second project - insert new record
                recordData = {
                    user_id: userId,
                    allocation_date: allocationDateString,
                    assignment_type: 'project',
                    project_id: allocationData.projectId,
                    project_number: allocationData.projectNumber || null,
                    project_name: allocationData.projectName || null,
                    client: allocationData.client || null,
                    task: allocationData.task || null,
                    shift: allocationData.shift || 'Nights',
                    time: allocationData.time || null,
                    comment: allocationData.comment || null,
                    leave_type: null
                };

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);

                if (error) throw error;
            } else {
                recordData = {
                    user_id: userId,
                    allocation_date: allocationDateString,
                };

                if (allocationData.type === 'leave') {
                    recordData = {
                        ...recordData,
                        assignment_type: 'leave',
                        leave_type: allocationData.leaveType,
                        comment: allocationData.comment || null,
                        project_id: null, project_number: null, project_name: null, client: null, task: null, shift: null, time: null
                    };
                } else if (allocationData.type === 'status') {
                    recordData = {
                        ...recordData,
                        assignment_type: 'status',
                        comment: allocationData.status,
                        leave_type: null,
                        project_id: null, project_number: null, project_name: null, client: null, task: null, shift: null, time: null
                    };
                } else {
                    recordData = {
                        ...recordData,
                        assignment_type: 'project',
                        project_id: allocationData.projectId || null,
                        project_number: allocationData.projectNumber || null,
                        project_name: allocationData.projectName || null,
                        client: allocationData.client || null,
                        task: allocationData.task || null,
                        shift: allocationData.shift || null,
                        time: allocationData.time || null,
                        comment: allocationData.comment || null,
                        leave_type: null,
                    };
                }

                // For single project/leave, replace existing record if any
                if (existingRecords && existingRecords.length > 0) {
                    // Delete all existing records first, then insert new one
                    const { error: deleteError } = await supabase
                        .from(tableName)
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);

                    if (deleteError) throw deleteError;
                }

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error saving allocation to Supabase:', err);
            const errorMessage = handleSupabaseError(err, tableName, 'insert', recordData);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Save Allocation');
            }
        }
    };

    const handleContextMenuAction = (action) => {
        const { cellData } = contextMenu;
        if (!cellData) return;
        const cellToUpdate = { userId: cellData.userId, dayIndex: cellData.dayIndex, date: cellData.date };

        if (action === 'goToProject') {
            const projectToView = projects?.find(p => p.project_number === cellData.assignment.projectNumber);
            if (projectToView) {
                onViewProject(projectToView);
            }
            setContextMenu({ visible: false });
            return;
        }

        if (action === 'copy' || action === 'cut') {
            setClipboard({ type: action, data: cellData.assignment, sourceCell: cellToUpdate });
        } else if (action === 'delete') {
            handleSaveAllocation(null, cellToUpdate);
        } else if (action === 'paste') {
            handleSaveAllocation(clipboard.data, cellToUpdate);
            if (clipboard.type === 'cut') {
                handleSaveAllocation(null, clipboard.sourceCell);
                setClipboard({ type: null, data: null, sourceCell: null });
            }
        } else if (action === 'allocate') {
            setSelectedCell(cellToUpdate);
            setIsAllocationModalOpen(true);
        } else if (action === 'addSecondProject') {
            setSelectedCell({...cellToUpdate, isSecondProject: true});
            setIsAllocationModalOpen(true);
        } else if (action === 'setAvailable') {
            handleSaveAllocation({ type: 'status', status: 'Available' }, cellToUpdate);
        } else if (action === 'setNotAvailable') {
            handleSaveAllocation({ type: 'status', status: 'Not Available' }, cellToUpdate);
        }
        setContextMenu({ visible: false });
    };

    const handleUpdateVisibleUsers = (newUserIds) => {
        setVisibleUserIds(newUserIds);
        setIsManageUsersModalOpen(false);
    };

    const changeWeek = (offset) => {
        setCurrentWeekStart(prev => addDays(prev, offset * 7));
    };

    const handleRoleFilterChange = (role) => {
        setFilterRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handleSelectAllRoles = () => {
        if (filterRoles.length === activeTeamRoles.length) {
            // If all are selected, deselect all
            setFilterRoles([]);
        } else {
            // Select all active team roles
            setFilterRoles(activeTeamRoles.map(role => role.display_text));
        }
    };

    const isAllRolesSelected = activeTeamRoles.length > 0 && filterRoles.length === activeTeamRoles.length;

    const handleDepartmentFilterChange = (department) => {
        setFilterDepartments(prev => prev.includes(department) ? prev.filter(d => d !== department) : [...prev, department]);
    };

    const handleSelectAllDepartments = () => {
        if (filterDepartments.length === departments.length) {
            // If all are selected, deselect all
            setFilterDepartments([]);
        } else {
            // Select all departments
            setFilterDepartments([...departments]);
        }
    };

    const isAllDepartmentsSelected = departments.length > 0 && filterDepartments.length === departments.length;

    const weekKey = formatDateForKey(currentWeekStart);
    const fiscalWeek = getFiscalWeek(currentWeekStart);
    const currentWeekAllocations = allocations[weekKey] || {};
    const selectedUser = selectedCell ? allUsers?.find(u => u.id === selectedCell.userId) : null;

    if (loading || usersLoading) {
        return (
            <div className="p-4 md:p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading Resource Allocations...</p>
                </div>
            </div>
        );
    }

    if (usersError) {
        return (
            <div className="p-4 md:p-6 flex items-center justify-center min-h-96">
                <div className="text-center text-red-600">
                    <p>Error loading users: {usersError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resource Allocation</h1>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setCurrentWeekStart(getWeekStartDate(new Date()))}>This Week</Button>
                    <Button variant="outline" onClick={() => changeWeek(-1)}><ChevronLeft size={16}/></Button>
                    <Button variant="outline" onClick={() => changeWeek(1)}><ChevronRight size={16}/></Button>
                    <Button onClick={() => setIsManageUsersModalOpen(true)}><Users size={16} className="mr-2"/>Show/Hide User</Button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                 <div className="flex items-center gap-2">
                    <div className="relative" ref={filterRef}>
                         <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}><Filter size={16} className="mr-2"/>Filter</Button>
                         {isFilterOpen && (
                             <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                 {/* Roles Filter */}
                                 <div>
                                     <h4 className="font-semibold mb-2 text-sm">Roles</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto">
                                         {teamRolesLoading || usersLoading ? (
                                             <div className="text-sm text-gray-500">Loading team roles...</div>
                                         ) : teamRolesError ? (
                                             <div className="text-sm text-red-500">Error loading roles: {teamRolesError}</div>
                                         ) : activeTeamRoles.length === 0 ? (
                                             <div className="text-sm text-gray-500">No team roles assigned to users</div>
                                         ) : (
                                             <>
                                                 <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                                     <input
                                                         type="checkbox"
                                                         checked={isAllRolesSelected}
                                                         onChange={handleSelectAllRoles}
                                                         className="rounded text-orange-500 focus:ring-orange-500"
                                                     />
                                                     <span>All Roles</span>
                                                 </label>
                                                 {activeTeamRoles.map(role => (
                                                     <label key={role.value} className="flex items-center space-x-2 text-sm">
                                                         <input type="checkbox" checked={filterRoles.includes(role.display_text)} onChange={() => handleRoleFilterChange(role.display_text)} className="rounded text-orange-500 focus:ring-orange-500"/>
                                                         <span>{role.display_text}</span>
                                                     </label>
                                                 ))}
                                             </>
                                         )}
                                     </div>
                                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setFilterRoles([])}>Clear Roles</Button>
                                 </div>

                                 {/* Departments Filter */}
                                 <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                     <h4 className="font-semibold mb-2 text-sm">Departments</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto">
                                         {departments.length === 0 ? (
                                             <div className="text-sm text-gray-500">No departments found</div>
                                         ) : (
                                             <>
                                                 <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                                     <input
                                                         type="checkbox"
                                                         checked={isAllDepartmentsSelected}
                                                         onChange={handleSelectAllDepartments}
                                                         className="rounded text-orange-500 focus:ring-orange-500"
                                                     />
                                                     <span>All Departments</span>
                                                 </label>
                                                 {departments.map(department => (
                                                     <label key={department} className="flex items-center space-x-2 text-sm">
                                                         <input
                                                             type="checkbox"
                                                             checked={filterDepartments.includes(department)}
                                                             onChange={() => handleDepartmentFilterChange(department)}
                                                             className="rounded text-orange-500 focus:ring-orange-500"
                                                         />
                                                         <span>{department}</span>
                                                     </label>
                                                 ))}
                                             </>
                                         )}
                                     </div>
                                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setFilterDepartments([])}>Clear Departments</Button>
                                 </div>
                             </div>
                         )}
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="sort-by" className="text-sm mr-2">Sort by:</label>
                        <Select id="sort-by" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="!py-1.5">
                            <option value="alphabetical">Alphabetical</option>
                            <option value="department">Department</option>
                        </Select>
                    </div>
                </div>
                <h2 className="text-lg font-semibold text-center">Week {fiscalWeek}: {formatDateForDisplay(weekDates[0])} - {formatDateForDisplay(weekDates[6])}, {currentWeekStart.getFullYear()}</h2>
            </div>
            {error && (
                 <div className="p-4 mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
                    Error loading resource allocations from the database: {error}.
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-[250px] bg-gray-50 dark:bg-gray-700">Staff Member</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="px-4 py-3 text-center w-52 bg-gray-50 dark:bg-gray-700">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br/>
                                    {formatDateForDisplay(date)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-2 font-medium">
                                    <div className="flex items-center min-w-0">
                                        <div className={`w-8 h-8 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0`}>{getAvatarText(user)}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.department || 'No Department'}</p>
                                            {user.competencies && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5" title={user.competencies}>
                                                    {user.competencies}
                                                </p>
                                            )}
                                            {user.pts_number && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    <span className="font-medium">PTS:</span> {user.pts_number}
                                                </p>
                                            )}
                                            {user.mobile_number && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    <span className="font-medium">Mobile:</span> {user.mobile_number}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                {weekDates.map((date, dayIndex) => {
                                    const assignment = currentWeekAllocations[user.id]?.assignments[dayIndex] || null;
                                    let cellContent;
                                    let cellColor = '';

                                    if (assignment) {
                                        if (Array.isArray(assignment)) {
                                            // Multiple projects
                                            cellContent = (
                                                <div className="h-full flex flex-col gap-1 overflow-hidden">
                                                    {assignment.map((proj, index) => {
                                                        const projColor = shiftColors[proj.shift] || '';
                                                        return (
                                                            <div key={index} className={`p-1 rounded-md text-xs flex flex-col text-center ${projColor} flex-1`}>
                                                                <p className="font-bold text-[10px] truncate">{proj.projectNumber}</p>
                                                                <p className="text-[10px] truncate" title={proj.projectName}>{proj.projectName}</p>
                                                                <p className="text-[10px] truncate" title={proj.task}>{proj.task}</p>
                                                                <p className="font-semibold text-[10px]">{proj.shift}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else if (assignment.type === 'leave') {
                                            cellColor = leaveColors[assignment.leaveType] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs h-full flex flex-col justify-center font-semibold ${cellColor}`}>
                                                    <div className="text-center">{assignment.leaveType}</div>
                                                    {assignment.comment && (
                                                        <div className="text-center text-[10px] font-normal mt-1 opacity-90" title={assignment.comment}>
                                                            {assignment.comment.length > 20 ? assignment.comment.substring(0, 20) + '...' : assignment.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else if (assignment.type === 'status') {
                                            const statusColor = assignment.status === 'Available'
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs h-full flex items-center justify-center font-semibold ${statusColor}`}>
                                                    <div className="text-center">{assignment.status}</div>
                                                </div>
                                            );
                                        } else if (assignment.type === 'project') {
                                            cellColor = shiftColors[assignment.shift] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs space-y-1 h-full flex flex-col overflow-hidden text-center ${cellColor}`}>
                                                    <p className="font-bold whitespace-nowrap overflow-ellipsis overflow-hidden">{assignment.projectNumber}</p>
                                                    <p className="flex-grow min-w-0 break-words" title={assignment.projectName}>{assignment.projectName}</p>
                                                    <p className="whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.client}>{assignment.client}</p>
                                                    <p className="font-semibold">{assignment.task}</p>
                                                    <p className="font-semibold">{assignment.shift}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.comment}>{assignment.comment}</p>
                                                </div>
                                            );
                                        }
                                    }

                                    const isStatusAssignment = assignment && assignment.type === 'status';
                                    const isLeaveAssignment = assignment && assignment.type === 'leave';
                                    const hasProjectAssignmentInCell = assignment && (
                                        (Array.isArray(assignment) && assignment.some(a => a.type === 'project' && a.projectNumber)) ||
                                        (assignment.type === 'project' && assignment.projectNumber)
                                    );
                                    // Show button if: user can allocate resources, OR it's a status assignment and user can set status, OR it's a project and user wants to navigate, OR it's blank and user can set status
                                    const showContextMenuButton = canAllocateResources ||
                                                                  (isStatusAssignment && canSetAvailabilityStatus) ||
                                                                  hasProjectAssignmentInCell ||
                                                                  (!assignment && canSetAvailabilityStatus);

                                    return (
                                        <td key={date.toISOString()} className="p-1 align-top h-40 relative group">
                                            <div
                                                onClick={() => handleCellClick(user.id, date, dayIndex)}
                                                className={`w-full h-full text-left rounded-md ${canAllocateResources ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {cellContent}
                                            </div>
                                            {showContextMenuButton && (
                                                <button
                                                    onClick={(e) => handleActionClick(e, user.id, dayIndex, assignment)}
                                                    className="absolute top-1 right-1 p-1 rounded-full bg-gray-300/20 dark:bg-gray-900/20 hover:bg-gray-400/50 dark:hover:bg-gray-700/50"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cellData={contextMenu.cellData}
                    clipboard={clipboard}
                    onAction={handleContextMenuAction}
                    onClose={() => setContextMenu({ visible: false })}
                    canAllocate={canAllocateResources}
                    canSetStatus={canSetAvailabilityStatus}
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={(allocationData) => handleSaveAllocation(allocationData, selectedCell, selectedCell.isSecondProject)}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                    projects={projects}
                    isSecondProject={selectedCell.isSecondProject}
                />
            )}
            <ShowHideUsersModal
                isOpen={isManageUsersModalOpen}
                onClose={() => setIsManageUsersModalOpen(false)}
                onSave={handleUpdateVisibleUsers}
                allUsers={allUsers}
                visibleUserIds={visibleUserIds}
            />
        </div>
    );
};


const ContextMenu = ({ x, y, cellData, clipboard, onAction, onClose, canAllocate, canSetStatus }) => {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ top: y, left: x });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Adjust position to prevent menu from going off screen
    useEffect(() => {
        if (menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            // Check if menu overflows right edge
            if (x + menuRect.width > viewportWidth) {
                adjustedX = x - menuRect.width;
            }

            // Check if menu overflows bottom edge
            if (y + menuRect.height > viewportHeight) {
                adjustedY = viewportHeight - menuRect.height - 10;
            }

            setPosition({ top: adjustedY, left: adjustedX });
        }
    }, [x, y]);

    const hasAssignment = !!cellData.assignment;
    const isStatusAssignment = hasAssignment && cellData.assignment.type === 'status';
    const hasProjectAssignment = hasAssignment && (
        (Array.isArray(cellData.assignment) && cellData.assignment.some(a => a.type === 'project' && a.projectNumber)) ||
        (cellData.assignment.type === 'project' && cellData.assignment.projectNumber)
    );
    const canAddSecondProject = hasAssignment && (
        (!Array.isArray(cellData.assignment) && cellData.assignment.type === 'project') ||
        (Array.isArray(cellData.assignment) && cellData.assignment.length === 1 && cellData.assignment[0].type === 'project')
    );

    // Show context menu for viewers if there's a project to navigate to
    const canViewProject = hasProjectAssignment;
    if (!canAllocate && !canSetStatus && !canViewProject) {
        return null;
    }

    return (
        <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="absolute z-50 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
        >
            {hasAssignment && (
                <>
                    {!isStatusAssignment && canAllocate && (
                        <>
                            <button onClick={() => onAction('copy')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Copy</button>
                            <button onClick={() => onAction('cut')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>Cut</button>
                            {canAddSecondProject && (
                                <button onClick={() => onAction('addSecondProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Add Second Project</button>
                            )}
                        </>
                    )}
                    {hasProjectAssignment && (
                        <button onClick={() => onAction('goToProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><FolderKanban size={14} className="mr-2"/>Go to Project</button>
                    )}
                    {(canAllocate || (isStatusAssignment && canSetStatus)) && (
                        <button onClick={() => onAction('delete')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={14} className="mr-2"/>Delete</button>
                    )}
                </>
            )}
            {!hasAssignment && (
                <>
                    {canAllocate && (
                        <button onClick={() => onAction('allocate')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Allocate Resource</button>
                    )}
                    {canAllocate && clipboard.data && (
                        <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste</button>
                    )}
                    {canSetStatus && (
                        <>
                            <button onClick={() => onAction('setAvailable')} className="w-full text-left flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Check size={14} className="mr-2"/>Available</button>
                            <button onClick={() => onAction('setNotAvailable')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} className="mr-2"/>Not Available</button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

const ShowHideUsersModal = ({ isOpen, onClose, onSave, allUsers, visibleUserIds }) => {
    const [selectedIds, setSelectedIds] = useState(visibleUserIds);

    useEffect(() => {
        setSelectedIds(visibleUserIds);
    }, [visibleUserIds, isOpen]);

    const handleToggleUser = (userId) => {
        setSelectedIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === allUsers.length) {
            // If all are selected, deselect all
            setSelectedIds([]);
        } else {
            // Select all users
            setSelectedIds(allUsers.map(user => user.id));
        }
    };

    const handleSave = () => {
        onSave(selectedIds);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Show/Hide Staff">
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Select the staff members to display on the resource planner.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-xs"
                        >
                            {selectedIds.length === allUsers.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600">
                        {(allUsers || []).map(user => (
                            <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                    className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500"
                                />
                                <span>{user.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, projects, isSecondProject = false }) => {
    const [isManual, setIsManual] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [formData, setFormData] = useState({
        projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null
    });

    useEffect(() => {
        if (currentAssignment) {
            if (currentAssignment.type === 'leave') {
                setLeaveType(currentAssignment.leaveType);
                setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: currentAssignment.comment || '', shift: 'Nights', projectId: null });
                setIsManual(false);
            } else {
                setLeaveType('');
                setFormData({
                    projectNumber: currentAssignment.projectNumber || '',
                    projectName: currentAssignment.projectName || '',
                    client: currentAssignment.client || '',
                    time: currentAssignment.time || '',
                    task: currentAssignment.task || '',
                    comment: currentAssignment.comment || '',
                    shift: currentAssignment.shift || 'Nights',
                    projectId: currentAssignment.projectId || null
                });
                const isProjectInList = projects?.some(p => p.project_number === currentAssignment.projectNumber) || false;
                setIsManual(!isProjectInList && !!currentAssignment.projectNumber);
            }
        } else {
            setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null });
            setIsManual(false);
            setLeaveType('');
        }
    }, [currentAssignment, isOpen]);

    const handleProjectSelect = (e) => {
        const selectedProjectNumber = e.target.value;
        const project = projects?.find(p => p.project_number === selectedProjectNumber);
        if (project) {
            setFormData(prev => ({ ...prev, projectNumber: project.project_number, projectName: project.project_name, client: project.client, projectId: project.id }));
        } else {
            setFormData(prev => ({...prev, projectNumber: '', projectName: '', client: '', projectId: null}));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (leaveType) {
            onSave({ type: 'leave', leaveType: leaveType, comment: formData.comment || '' });
        } else {
            onSave(formData);
        }
    };

    const handleClear = () => {
        onSave(null);
    }
    
    const handleLeaveChange = (type) => {
        setLeaveType(prev => prev === type ? '' : type);
    };

    const projectFieldsDisabled = !!leaveType;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isSecondProject ? "Add Second Project" : "Allocate Resource"}>
             <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                    <div>
                        <p><span className="font-semibold">Staff:</span> {user?.name}</p>
                        <p><span className="font-semibold">Date:</span> {date?.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    {!isSecondProject && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave'} onChange={() => handleLeaveChange('Annual Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Bank Holiday'} onChange={() => handleLeaveChange('Bank Holiday')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Bank Holiday</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Haydock)'} onChange={() => handleLeaveChange('Office (Haydock)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Haydock)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Home)'} onChange={() => handleLeaveChange('Office (Home)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Home)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Training'} onChange={() => handleLeaveChange('Training')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Training</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Stand Down'} onChange={() => handleLeaveChange('Stand Down')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Stand Down</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Sick Day'} onChange={() => handleLeaveChange('Sick Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Sick Day</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Rest Day'} onChange={() => handleLeaveChange('Rest Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Rest Day</span></label>
                        </div>
                    )}

                    <fieldset disabled={projectFieldsDisabled} className={`space-y-4 ${!isSecondProject ? 'border-t pt-4 mt-4 border-gray-200 dark:border-gray-700' : ''} disabled:opacity-40`}>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="manual-entry" checked={isManual} onChange={(e) => setIsManual(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500"/>
                            <label htmlFor="manual-entry" className="text-sm">Enter Manually</label>
                        </div>

                        {!isManual ? (
                            <Select label="Project" value={formData.projectNumber} onChange={handleProjectSelect}>
                                <option value="">Select Project</option>
                                {(projects || []).map(p => (
                                    <option key={p.id} value={p.project_number}>{p.project_number} - {p.project_name}</option>
                                ))}
                            </Select>
                        ) : (
                            <Input label="Project Number" name="projectNumber" value={formData.projectNumber} onChange={handleInputChange} />
                        )}
                        
                        <Input label="Project Name" name="projectName" value={formData.projectName} onChange={handleInputChange} disabled={!isManual} />
                        <Input label="Client" name="client" value={formData.client} onChange={handleInputChange} disabled={!isManual} />
                        
                        <Select label="Shift" name="shift" value={formData.shift} onChange={handleInputChange}>
                            <option>Nights</option>
                            <option>Days</option>
                            <option>Evening</option>
                        </Select>

                        <Input label="Task" name="task" value={formData.task} onChange={handleInputChange} placeholder="e.g., Survey, Monitoring..."/>
                        
                        <Input label="Start/End Time" name="time" value={formData.time} onChange={handleInputChange} placeholder="e.g., 09:00 - 17:00"/>
                        <Input label="Comment" name="comment" value={formData.comment} onChange={handleInputChange} placeholder="Add a comment..."/>
                    </fieldset>

                    {!isSecondProject && leaveType && (
                        <div className="space-y-2 pt-4">
                            <Input
                                label="Comment (Optional)"
                                name="comment"
                                value={formData.comment}
                                onChange={handleInputChange}
                                placeholder="Add a comment for this leave type..."
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="danger" onClick={handleClear}>Clear Assignment</Button>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </Modal>
    );
};


export default ResourceCalendarPage;
