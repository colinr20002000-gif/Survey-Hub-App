import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, Copy, Trash2, PlusCircle, ClipboardCheck, Filter, MoreVertical, Download, Package } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toPng } from 'html-to-image';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { getWeekStartDate, addDays, formatDateForDisplay, formatDateForKey, getFiscalWeek } from '../utils/dateHelpers';
import { getDepartmentColor, getAvatarText } from '../utils/avatarColors';
import { handleSupabaseError, isRLSError } from '../utils/rlsErrorHandler';
import { Button, Select, Modal, Input } from '../components/ui';

const EquipmentCalendarPage = () => {
    const { user: currentUser } = useAuth();
    const { canAllocateResources } = usePermissions();
    const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
    const { showPrivilegeError, showErrorModal } = useToast();

    const [equipment, setEquipment] = useState([]);
    const [equipmentLoading, setEquipmentLoading] = useState(true);
    const [allocations, setAllocations] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStartDate(new Date()));
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [visibleUserIds, setVisibleUserIds] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sortOrder, setSortOrder] = useState('department');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null });
    const filterRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const calendarRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch equipment
    const getEquipment = useCallback(async () => {
        setEquipmentLoading(true);
        try {
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching equipment:', error);
                setEquipment([]);
            } else {
                console.log('✅ Equipment loaded:', data?.length || 0, 'items');
                setEquipment(data || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setEquipment([]);
        } finally {
            setEquipmentLoading(false);
        }
    }, []);

    // Fetch departments
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
                    setDepartments([]);
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

    // Fetch equipment allocations
    const getEquipmentAllocations = useCallback(async (silent = false) => {
        if (silent) {
            scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
        }

        if (!silent) {
            setLoading(true);
        }
        setError(null);

        try {
            const { data, error } = await supabase
                .from('equipment_calendar')
                .select('*');

            if (error) {
                console.error('Error fetching equipment allocations:', error);
                setError('Failed to fetch allocations');
                setAllocations({});
                return;
            }

            const formattedAllocations = {};

            (data || []).forEach(allocation => {
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

                const assignmentData = {
                    equipmentId: allocation.equipment_id,
                    comment: allocation.comment || ''
                };

                if (dayIndex >= 0 && dayIndex < 7) {
                    const currentAssignment = formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex];

                    if (!currentAssignment) {
                        formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = assignmentData;
                    } else if (Array.isArray(currentAssignment)) {
                        currentAssignment.push(assignmentData);
                    } else {
                        formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = [currentAssignment, assignmentData];
                    }
                }
            });

            setAllocations(formattedAllocations);

            if (silent) {
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current);
                });
            }

        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Failed to load equipment allocations');
            setAllocations({});
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        getEquipment();
        getEquipmentAllocations();

        console.log('🔌 Setting up real-time subscriptions for equipment calendar...');

        const equipmentSubscription = supabase
            .channel('equipment-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment'
                },
                (payload) => {
                    console.log('🔧 Equipment changed:', payload.eventType);
                    getEquipment();
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment subscription status:', status);
            });

        const calendarSubscription = supabase
            .channel('equipment-calendar-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment_calendar'
                },
                (payload) => {
                    console.log('📅 Equipment calendar changed:', payload.eventType);
                    getEquipmentAllocations(true);
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment calendar subscription status:', status);
            });

        return () => {
            console.log('🔌 Unsubscribing from equipment calendar...');
            equipmentSubscription.unsubscribe();
            calendarSubscription.unsubscribe();
        };
    }, [getEquipment, getEquipmentAllocations]);

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
            setVisibleUserIds(allUsers.map(u => u.id));
        }
    }, [allUsers]);

    const displayedUsers = useMemo(() => {
        let usersToDisplay = allUsers;

        if (filterDepartments.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterDepartments.includes(user.department));
        }

        usersToDisplay = usersToDisplay.filter(user => visibleUserIds.includes(user.id));

        // Apply sorting
        if (sortOrder === 'alphabetical') {
            usersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'department') {
            const departmentOrder = ['Site team', 'Project team', 'Delivery team', 'Design team', 'Office staff', 'Subcontractor'];

            usersToDisplay.sort((a, b) => {
                const deptA = (a.department || '').trim();
                const deptB = (b.department || '').trim();
                const deptALower = deptA.toLowerCase();
                const deptBLower = deptB.toLowerCase();
                const indexA = departmentOrder.findIndex(dept => dept.toLowerCase() === deptALower);
                const indexB = departmentOrder.findIndex(dept => dept.toLowerCase() === deptBLower);

                if (indexA !== -1 && indexB !== -1) {
                    if (indexA !== indexB) {
                        return indexA - indexB;
                    }
                } else if (indexA !== -1) {
                    return -1;
                } else if (indexB !== -1) {
                    return 1;
                } else {
                    const deptComparison = deptA.localeCompare(deptB);
                    if (deptComparison !== 0) {
                        return deptComparison;
                    }
                }
                return a.name.localeCompare(b.name);
            });
        }

        return usersToDisplay;
    }, [allUsers, visibleUserIds, filterDepartments, sortOrder]);

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

    const handleSaveAllocation = async (allocationData, cellToUpdate = selectedCell, isSecondEquipment = false) => {
        const { userId } = cellToUpdate;
        const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
        const dayIndex = (cellToUpdate.date.getDay() + 1) % 7;

        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };

            const currentAssignment = newAllocations[weekKey][userId].assignments[dayIndex];

            if (allocationData === null) {
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else if (!allocationData.equipmentId && !allocationData.comment) {
                // If neither equipment nor comment is provided, clear the assignment
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else {
                const equipmentData = {
                    equipmentId: allocationData.equipmentId || null,
                    comment: allocationData.comment || ''
                };

                if (isSecondEquipment && currentAssignment) {
                    if (Array.isArray(currentAssignment)) {
                        newAllocations[weekKey][userId].assignments[dayIndex] = [...currentAssignment, equipmentData];
                    } else {
                        newAllocations[weekKey][userId].assignments[dayIndex] = [currentAssignment, equipmentData];
                    }
                } else {
                    newAllocations[weekKey][userId].assignments[dayIndex] = equipmentData;
                }
            }

            return newAllocations;
        });

        setIsAllocationModalOpen(false);

        let recordData = null;

        try {
            const allocationDate = cellToUpdate.date;
            const allocationDateString = formatDateForKey(allocationDate);

            const { data: existingRecords } = await supabase
                .from('equipment_calendar')
                .select('*')
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            const shouldDelete = allocationData === null || (!allocationData.equipmentId && !allocationData.comment);

            if (shouldDelete) {
                if (existingRecords && existingRecords.length > 0) {
                    const { error } = await supabase
                        .from('equipment_calendar')
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);
                    if (error) throw error;
                }
            } else if (isSecondEquipment) {
                recordData = {
                    user_id: userId,
                    equipment_id: allocationData.equipmentId || null,
                    allocation_date: allocationDateString,
                    comment: allocationData.comment || null
                };

                const { error } = await supabase
                    .from('equipment_calendar')
                    .insert([recordData]);

                if (error) throw error;
            } else {
                recordData = {
                    user_id: userId,
                    equipment_id: allocationData.equipmentId || null,
                    allocation_date: allocationDateString,
                    comment: allocationData.comment || null
                };

                if (existingRecords && existingRecords.length > 0) {
                    const { error: deleteError } = await supabase
                        .from('equipment_calendar')
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);

                    if (deleteError) throw deleteError;
                }

                const { error } = await supabase
                    .from('equipment_calendar')
                    .insert([recordData]);
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error saving allocation to Supabase:', err);
            const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'insert', recordData);
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
        } else if (action === 'addSecondEquipment') {
            setSelectedCell({ ...cellToUpdate, isSecondEquipment: true });
            setIsAllocationModalOpen(true);
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

    const handleDepartmentFilterChange = (department) => {
        setFilterDepartments(prev => prev.includes(department) ? prev.filter(d => d !== department) : [...prev, department]);
    };

    const handleSelectAllDepartments = () => {
        if (filterDepartments.length === departments.length) {
            setFilterDepartments([]);
        } else {
            setFilterDepartments([...departments]);
        }
    };

    const handleOnlyMe = () => {
        // Check if already showing only current user
        if (visibleUserIds.length === 1 && currentUser && visibleUserIds.includes(currentUser.id)) {
            // Show all users
            setVisibleUserIds(allUsers.map(u => u.id));
        } else {
            // Show only current user
            if (currentUser) {
                setVisibleUserIds([currentUser.id]);
            }
        }
    };

    const isShowingOnlyMe = visibleUserIds.length === 1 && currentUser && visibleUserIds.includes(currentUser.id);
    const isAllDepartmentsSelected = departments.length > 0 && filterDepartments.length === departments.length;

    const weekKey = formatDateForKey(currentWeekStart);
    const fiscalWeek = getFiscalWeek(currentWeekStart);
    const currentWeekAllocations = allocations[weekKey] || {};
    const selectedUser = selectedCell ? allUsers?.find(u => u.id === selectedCell.userId) : null;

    const handleExportImage = async () => {
        if (!calendarRef.current) return;
        setIsExporting(true);

        try {
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

            const title = document.createElement('div');
            title.style.marginBottom = '30px';
            title.style.textAlign = 'center';
            title.innerHTML = `
                <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">
                    Equipment Allocation Calendar
                </h1>
                <h2 style="font-size: 24px; font-weight: 600; color: #4b5563;">
                    Week ${fiscalWeek}: ${formatDateForDisplay(weekDates[0])} - ${formatDateForDisplay(weekDates[6])}, ${currentWeekStart.getFullYear()}
                </h2>
            `;
            exportWrapper.appendChild(title);

            const calendarClone = calendarRef.current.cloneNode(true);
            const buttons = calendarClone.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());

            calendarClone.style.maxHeight = 'none';
            calendarClone.style.overflow = 'visible';
            calendarClone.style.width = '100%';
            calendarClone.style.height = 'auto';

            const allElements = calendarClone.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    el.className = el.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
                }
            });

            if (calendarClone.className && typeof calendarClone.className === 'string') {
                calendarClone.className = calendarClone.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
            }

            exportWrapper.appendChild(calendarClone);
            await new Promise(resolve => setTimeout(resolve, 100));

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

            document.body.removeChild(exportWrapper);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Equipment-Calendar-Week-${fiscalWeek}-${formatDateForKey(currentWeekStart)}.png`;
            link.click();
            setIsExporting(false);

        } catch (error) {
            console.error('Error exporting calendar:', error);
            alert('Failed to export calendar image. Please try again.');
            setIsExporting(false);
        }
    };

    if (loading || usersLoading || equipmentLoading) {
        return (
            <div className="p-4 md:p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading Equipment Calendar...</p>
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
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Equipment Calendar</h1>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setCurrentWeekStart(getWeekStartDate(new Date()))}>This Week</Button>
                    <Button variant="outline" onClick={() => changeWeek(-1)}><ChevronLeft size={16} /></Button>
                    <Button variant="outline" onClick={() => changeWeek(1)}><ChevronRight size={16} /></Button>
                    <Button onClick={() => setIsManageUsersModalOpen(true)}><Users size={16} className="mr-2" />Show/Hide User</Button>
                    <Button
                        variant={isShowingOnlyMe ? "primary" : "outline"}
                        onClick={handleOnlyMe}
                    >
                        Only Me
                    </Button>
                    <Button
                        onClick={handleExportImage}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isExporting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download size={16} className="mr-2" />Export Image
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="relative" ref={filterRef}>
                        <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}><Filter size={16} className="mr-2" />Filter</Button>
                        {isFilterOpen && (
                            <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                {/* Departments Filter */}
                                <div>
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
                    Error loading equipment allocations from the database: {error}.
                </div>
            )}
            <div ref={calendarRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto">
                <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-[250px] bg-gray-50 dark:bg-gray-700">Staff Member</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="px-4 py-3 text-center w-52 bg-gray-50 dark:bg-gray-700">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br />
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
                                        </div>
                                    </div>
                                </td>
                                {weekDates.map((date, dayIndex) => {
                                    const assignment = currentWeekAllocations[user.id]?.assignments[dayIndex] || null;
                                    let cellContent;

                                    if (assignment) {
                                        if (Array.isArray(assignment)) {
                                            cellContent = (
                                                <div className="h-full flex flex-col gap-1 overflow-hidden">
                                                    {assignment.map((eq, index) => {
                                                        const equipmentItem = equipment.find(e => e.id === eq.equipmentId);
                                                        const isNoEquipmentRequired = eq.comment === 'No Equipment Required' || eq.comment?.startsWith('No Equipment Required:');
                                                        return (
                                                            <div key={index} className="p-2 rounded-md flex flex-col items-center justify-center text-center bg-blue-100 dark:bg-blue-900/40 flex-1">
                                                                {eq.equipmentId && (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <Package size={16} />
                                                                        <p className="font-bold text-sm truncate">{equipmentItem?.name || 'Unknown'}</p>
                                                                    </div>
                                                                )}
                                                                {eq.comment && <p className={`text-sm ${isNoEquipmentRequired ? 'font-semibold' : ''} ${eq.equipmentId ? 'truncate mt-1' : 'break-words'}`} title={eq.comment}>{eq.comment}</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else {
                                            const equipmentItem = equipment.find(e => e.id === assignment.equipmentId);
                                            const isNoEquipmentRequired = assignment.comment === 'No Equipment Required' || assignment.comment?.startsWith('No Equipment Required:');

                                            cellContent = (
                                                <div className="p-2 rounded-md h-full flex flex-col items-center justify-center text-center bg-blue-100 dark:bg-blue-900/40">
                                                    {assignment.equipmentId && (
                                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                                            <Package size={18} />
                                                            <p className="font-bold text-base whitespace-nowrap overflow-ellipsis overflow-hidden">{equipmentItem?.name || 'Unknown'}</p>
                                                        </div>
                                                    )}
                                                    {assignment.comment && (
                                                        <p className={`text-sm ${isNoEquipmentRequired ? 'font-semibold' : ''} ${assignment.equipmentId ? 'whitespace-nowrap overflow-ellipsis overflow-hidden' : 'break-words'}`} title={assignment.comment}>{assignment.comment}</p>
                                                    )}
                                                </div>
                                            );
                                        }
                                    }

                                    const showContextMenuButton = canAllocateResources || assignment;

                                    return (
                                        <td key={date.toISOString()} className="p-1 align-top h-32 relative group">
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
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={(allocationData) => handleSaveAllocation(allocationData, selectedCell, selectedCell.isSecondEquipment)}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                    equipment={equipment}
                    isSecondEquipment={selectedCell.isSecondEquipment}
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

const ContextMenu = ({ x, y, cellData, clipboard, onAction, onClose, canAllocate }) => {
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

    useEffect(() => {
        if (menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + menuRect.width > viewportWidth) {
                adjustedX = x - menuRect.width;
            }

            if (y + menuRect.height > viewportHeight) {
                adjustedY = viewportHeight - menuRect.height - 10;
            }

            setPosition({ top: adjustedY, left: adjustedX });
        }
    }, [x, y]);

    const hasAssignment = !!cellData.assignment;
    const canAddMoreEquipment = hasAssignment;

    if (!canAllocate && !hasAssignment) {
        return null;
    }

    return (
        <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="absolute z-50 w-44 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
        >
            {hasAssignment && (
                <>
                    {canAllocate && (
                        <>
                            <button onClick={() => onAction('copy')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2" />Copy</button>
                            <button onClick={() => onAction('cut')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <circle cx="6" cy="6" r="3"></circle>
                                    <circle cx="6" cy="18" r="3"></circle>
                                    <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                                    <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                                    <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
                                </svg>Cut
                            </button>
                            {canAddMoreEquipment && (
                                <button onClick={() => onAction('addSecondEquipment')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2" />Add More Equipment</button>
                            )}
                        </>
                    )}
                    {canAllocate && (
                        <button onClick={() => onAction('delete')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={14} className="mr-2" />Delete</button>
                    )}
                </>
            )}
            {!hasAssignment && (
                <>
                    {canAllocate && (
                        <button onClick={() => onAction('allocate')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2" />Assign Equipment</button>
                    )}
                    {canAllocate && clipboard.data && (
                        <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2" />Paste</button>
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
            setSelectedIds([]);
        } else {
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Select the staff members to display on the equipment calendar.</p>
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

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, equipment, isSecondEquipment = false }) => {
    const [formData, setFormData] = useState({
        equipmentId: '', comment: ''
    });

    useEffect(() => {
        if (currentAssignment && !Array.isArray(currentAssignment)) {
            const comment = currentAssignment.comment || '';
            const isNoEquipmentRequired = comment === 'No Equipment Required' || comment.startsWith('No Equipment Required:');

            if (isNoEquipmentRequired) {
                // Extract the actual user comment after "No Equipment Required: "
                const userComment = comment === 'No Equipment Required'
                    ? ''
                    : comment.replace('No Equipment Required: ', '');

                setFormData({
                    equipmentId: 'no-equipment-required',
                    comment: userComment
                });
            } else {
                setFormData({
                    equipmentId: currentAssignment.equipmentId || '',
                    comment: comment
                });
            }
        } else {
            setFormData({ equipmentId: '', comment: '' });
        }
    }, [currentAssignment, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        // Handle special "No Equipment Required" option
        if (formData.equipmentId === 'no-equipment-required') {
            const commentText = formData.comment.trim();
            const finalComment = commentText
                ? `No Equipment Required: ${commentText}`
                : 'No Equipment Required';
            onSave({ equipmentId: null, comment: finalComment });
        } else {
            onSave(formData);
        }
    };

    const handleClear = () => {
        onSave(null);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isSecondEquipment ? "Assign More Equipment" : "Assign Equipment"}>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                    <div>
                        <p><span className="font-semibold">Staff:</span> {user?.name}</p>
                        <p><span className="font-semibold">Date:</span> {date?.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <fieldset className="space-y-4">
                        <Select label="Equipment (Optional)" name="equipmentId" value={formData.equipmentId} onChange={handleInputChange}>
                            <option value="no-equipment-required">No Equipment Required</option>
                            <option value="">Comment Only</option>
                            {(equipment || []).map(eq => (
                                <option key={eq.id} value={eq.id}>
                                    {eq.name} {eq.serial_number ? `(${eq.serial_number})` : ''}
                                </option>
                            ))}
                        </Select>
                        <Input label="Comment (Optional)" name="comment" value={formData.comment} onChange={handleInputChange} placeholder="Add a comment..." />
                    </fieldset>
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

export default EquipmentCalendarPage;
