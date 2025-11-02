import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, Copy, Trash2, PlusCircle, FolderKanban, ClipboardCheck, Check, X, Filter, MoreVertical, Download } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { toPng } from 'html-to-image';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { useJobs } from '../contexts/JobContext';
import { useUsers } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { useLongPress } from '../hooks/useLongPress';
import { getWeekStartDate, getFiscalWeek, addDays, formatDateForDisplay, formatDateForKey } from '../utils/dateHelpers';
import { getDepartmentColor, getAvatarText, getAvatarProps } from '../utils/avatarColors';
import { handleSupabaseError, isRLSError } from '../utils/rlsErrorHandler';
import { shiftColors, leaveColors } from '../constants';
import { Button, Select, Modal, Input } from '../components/ui';

// Draggable wrapper component for resource assignments
const DraggableResourceItem = ({ id, children, disabled }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        disabled: disabled,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'grab',
    } : {
        cursor: disabled ? 'default' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="flex-1 flex flex-col">
            {children}
        </div>
    );
};

// Droppable wrapper component for calendar cells
const DroppableCell = ({ id, children, disabled }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        disabled: disabled,
    });

    const style = {
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="w-full h-[200px]">
            {children}
        </div>
    );
};

// Multi-project tile component with long press support
const MultiProjectTile = ({ proj, projColor, projInlineStyle, isDesktop, canAllocateResources, onContextMenu, onClick }) => {
    const longPressHandlers = useLongPress(
        (e) => {
            // On long press, show context menu
            if (!isDesktop) {
                onContextMenu(e);
            }
        },
        {
            threshold: 500, // 500ms for long press
        }
    );

    return (
        <div
            className={`p-1.5 rounded text-center ${projColor} relative group overflow-hidden h-full flex flex-col justify-center`}
            onContextMenu={isDesktop ? onContextMenu : undefined}
            onClick={onClick}
            style={{
                cursor: canAllocateResources ? 'pointer' : 'default',
                touchAction: !isDesktop ? 'none' : undefined,
                ...projInlineStyle
            }}
            {...(!isDesktop ? longPressHandlers : {})}
        >
            <p className="text-sm mb-0.5 font-bold leading-tight line-clamp-1" title={proj.projectName}>{proj.projectName}</p>
            <p className="font-semibold text-xs mb-0.5 truncate">{proj.projectNumber}</p>
            {proj.task && <p className="text-xs mb-0.5 leading-tight line-clamp-1" title={proj.task}>{proj.task}</p>}
            <p className="font-semibold text-xs mb-0.5 leading-tight truncate">{typeof proj.shift === 'string' ? proj.shift : String(proj.shift || '')}</p>
            {proj.time && <p className="text-xs leading-tight font-semibold truncate">{proj.time}</p>}
        </div>
    );
};

// Calendar cell component with long press support
const ResourceCalendarCell = ({
    user,
    date,
    dayIndex,
    assignment,
    cellContent,
    isDesktop,
    canAllocateResources,
    showContextMenuButton,
    handleCellClick,
    handleActionClick
}) => {
    const longPressHandlers = useLongPress(
        (e) => {
            // On long press, show context menu
            if (!isDesktop && showContextMenuButton) {
                handleActionClick(e, user.id, dayIndex, assignment);
            }
        },
        {
            threshold: 500, // 500ms for long press
        }
    );

    return (
        <td className="p-2 relative group">
            <DroppableCell id={`drop::${user.id}::${dayIndex}`} disabled={!isDesktop}>
                <div
                    onClick={() => handleCellClick(user.id, date, dayIndex)}
                    onContextMenu={isDesktop && showContextMenuButton ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                    className={`w-full h-full text-left rounded-md flex flex-col overflow-hidden ${canAllocateResources ? 'cursor-pointer' : 'cursor-default'}`}
                    style={!isDesktop && showContextMenuButton ? { touchAction: 'none' } : undefined}
                    {...(!isDesktop && showContextMenuButton ? longPressHandlers : {})}
                >
                    {cellContent}
                </div>
            </DroppableCell>
        </td>
    );
};

const ResourceCalendarPage = ({ onViewProject }) => {
    const { user: currentUser } = useAuth();
    const { canAllocateResources, canSetAvailabilityStatus, can } = usePermissions();
    const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
    const { projects } = useProjects();
    const { showPrivilegeError, showErrorModal } = useToast();

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
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [customShiftColors, setCustomShiftColors] = useState({});
    const [customLeaveColors, setCustomLeaveColors] = useState({});

    // Detect desktop mode for drag and drop (768px is md breakpoint in Tailwind)
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Set up drag and drop sensors (only PointerSensor, not TouchSensor, to exclude mobile)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        })
    );

    // Fetch custom colours for Resource Calendar
    const fetchCalendarColours = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('calendar_colours')
                .select('*')
                .eq('calendar_type', 'resource');

            if (error) {
                console.error('Error fetching calendar colours:', error);
                return;
            }

            const shifts = {};
            const leaves = {};

            (data || []).forEach(colour => {
                if (colour.category_type === 'shift') {
                    shifts[colour.category_value] = colour.colour;
                } else if (colour.category_type === 'leave') {
                    leaves[colour.category_value] = colour.colour;
                }
            });

            setCustomShiftColors(shifts);
            setCustomLeaveColors(leaves);
        } catch (err) {
            console.error('Error fetching calendar colours:', err);
        }
    }, []);

    useEffect(() => {
        fetchCalendarColours();

        // Set up real-time subscription for colour changes
        const colourSubscription = supabase
            .channel('calendar-colours-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_colours',
                    filter: 'calendar_type=eq.resource'
                },
                () => {
                    console.log('🎨 Calendar colours changed, reloading...');
                    fetchCalendarColours();
                }
            )
            .subscribe();

        return () => {
            colourSubscription.unsubscribe();
        };
    }, [fetchCalendarColours]);

    // Helper function to get colour with fallback
    const getShiftColor = useCallback((shift) => {
        if (customShiftColors[shift]) {
            return { backgroundColor: customShiftColors[shift] };
        }
        // Fallback to constants if no custom colour
        return shiftColors[shift] || '';
    }, [customShiftColors]);

    const getLeaveColor = useCallback((leaveType) => {
        if (customLeaveColors[leaveType]) {
            return { backgroundColor: customLeaveColors[leaveType] };
        }
        // Fallback to constants if no custom colour
        return leaveColors[leaveType] || '';
    }, [customLeaveColors]);

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
    }, [allUsers, visibleUserIds, filterDepartments, sortOrder]);

    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handleCellClick = (userId, date, dayIndex) => {
        if (!canAllocateResources) return;
        setSelectedCell({ userId, date, dayIndex });
        setIsAllocationModalOpen(true);
    };

    const handleActionClick = (e, userId, dayIndex, assignment, itemIndex = null) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment, date: weekDates[dayIndex], itemIndex }
        });
    };

    const handleItemClick = (e, userId, date, dayIndex, assignment, itemIndex) => {
        if (!canAllocateResources) return;
        e.stopPropagation();
        // Extract the specific item from the array
        const specificItem = Array.isArray(assignment) ? assignment[itemIndex] : assignment;
        setSelectedCell({ userId, date, dayIndex, editItemIndex: itemIndex, editingSpecificItem: specificItem });
        setIsAllocationModalOpen(true);
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

                // Check if we're editing a specific item in a multi-item array
                if (cellToUpdate.editItemIndex !== null && cellToUpdate.editItemIndex !== undefined && Array.isArray(currentAssignment)) {
                    // Replace the specific item in the array
                    const updatedArray = [...currentAssignment];
                    updatedArray[cellToUpdate.editItemIndex] = projectData;
                    newAllocations[weekKey][userId].assignments[dayIndex] = updatedArray;
                }
                // Handle multiple projects per day
                else if (isSecondProject && currentAssignment) {
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
            } else if (cellToUpdate.editItemIndex !== null && cellToUpdate.editItemIndex !== undefined && existingRecords && existingRecords.length > 1) {
                // Editing a specific item in a multi-item cell
                // Build the updated array from existing records, replacing the edited item
                const recordsToInsert = existingRecords.map((record, idx) => {
                    // If this is the item being edited, use the new data
                    if (idx === cellToUpdate.editItemIndex) {
                        if (allocationData.type === 'leave') {
                            return {
                                user_id: userId,
                                allocation_date: allocationDateString,
                                assignment_type: 'leave',
                                leave_type: allocationData.leaveType,
                                comment: allocationData.comment || null,
                                project_id: null,
                                project_number: null,
                                project_name: null,
                                client: null,
                                task: null,
                                shift: null,
                                time: null
                            };
                        } else {
                            return {
                                user_id: userId,
                                allocation_date: allocationDateString,
                                assignment_type: 'project',
                                project_id: allocationData.projectId || null,
                                project_number: allocationData.projectNumber || null,
                                project_name: allocationData.projectName || null,
                                client: allocationData.client || null,
                                task: allocationData.task || null,
                                shift: allocationData.shift || null,
                                time: allocationData.time || null,
                                comment: allocationData.comment || null,
                                leave_type: null
                            };
                        }
                    } else {
                        // Keep the existing record as is
                        return {
                            user_id: record.user_id,
                            allocation_date: record.allocation_date,
                            assignment_type: record.assignment_type,
                            project_id: record.project_id,
                            project_number: record.project_number,
                            project_name: record.project_name,
                            client: record.client,
                            task: record.task,
                            shift: record.shift,
                            time: record.time,
                            comment: record.comment,
                            leave_type: record.leave_type
                        };
                    }
                });

                // Delete all existing records
                const { error: deleteError } = await supabase
                    .from(tableName)
                    .delete()
                    .eq('user_id', userId)
                    .eq('allocation_date', allocationDateString);

                if (deleteError) throw deleteError;

                // Re-insert all items with the updated one
                const { error: insertError } = await supabase
                    .from(tableName)
                    .insert(recordsToInsert);

                if (insertError) throw insertError;
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

    const handleDeleteIndividualItem = async (userId, dayIndex, itemIndex, date) => {
        const weekKey = formatDateForKey(getWeekStartDate(date));
        const assignment = allocations[weekKey]?.[userId]?.assignments[dayIndex];

        if (!assignment || !Array.isArray(assignment)) return;

        // Determine table name
        const user = allUsers.find(u => u.id === userId);
        const isDummyUser = user?.isDummy === true;
        const tableName = isDummyUser ? 'dummy_resource_allocations' : 'resource_allocations';
        const allocationDateString = formatDateForKey(date);

        try {
            // Get remaining items after removing the specific one
            const remainingItems = assignment.filter((_, idx) => idx !== itemIndex);

            // Delete all existing records for this day
            const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            if (deleteError) throw deleteError;

            // If there are remaining items, re-insert them
            if (remainingItems.length > 0) {
                const recordsToInsert = remainingItems.map(item => {
                    if (item.type === 'leave') {
                        return {
                            user_id: userId,
                            allocation_date: allocationDateString,
                            assignment_type: 'leave',
                            leave_type: item.leaveType,
                            comment: item.comment || null,
                            project_id: null,
                            project_number: null,
                            project_name: null,
                            client: null,
                            task: null,
                            shift: null,
                            time: null
                        };
                    } else {
                        return {
                            user_id: userId,
                            allocation_date: allocationDateString,
                            assignment_type: 'project',
                            project_id: item.projectId || null,
                            project_number: item.projectNumber || null,
                            project_name: item.projectName || null,
                            client: item.client || null,
                            task: item.task || null,
                            shift: item.shift || null,
                            time: item.time || null,
                            comment: item.comment || null,
                            leave_type: null
                        };
                    }
                });

                const { error: insertError } = await supabase
                    .from(tableName)
                    .insert(recordsToInsert);

                if (insertError) throw insertError;
            }
        } catch (err) {
            console.error('Error deleting individual item:', err);
            const errorMessage = handleSupabaseError(err, tableName, 'delete', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Delete Item');
            }
            // Refresh allocations to revert UI changes
            getResourceAllocations(true);
        }
    };

    const handleContextMenuAction = (action) => {
        const { cellData } = contextMenu;
        if (!cellData) return;
        const cellToUpdate = { userId: cellData.userId, dayIndex: cellData.dayIndex, date: cellData.date };

        if (action === 'goToProject') {
            let projectNumber;
            // If we have an array and an itemIndex, get the specific item's project number
            if (Array.isArray(cellData.assignment) && cellData.itemIndex !== null && cellData.itemIndex !== undefined) {
                projectNumber = cellData.assignment[cellData.itemIndex].projectNumber;
            } else {
                projectNumber = cellData.assignment.projectNumber;
            }
            const projectToView = projects?.find(p => p.project_number === projectNumber);
            if (projectToView) {
                onViewProject(projectToView);
            }
            setContextMenu({ visible: false });
            return;
        }

        if (action === 'copy' || action === 'cut') {
            // If itemIndex is provided, copy only that specific item
            let dataToCopy;
            if (cellData.itemIndex !== null && cellData.itemIndex !== undefined && Array.isArray(cellData.assignment)) {
                dataToCopy = cellData.assignment[cellData.itemIndex];
            } else {
                dataToCopy = cellData.assignment;
            }
            setClipboard({ type: action, data: dataToCopy, sourceCell: cellToUpdate });
        } else if (action === 'delete') {
            // If itemIndex is provided, delete only that specific item from multi-item array
            if (cellData.itemIndex !== null && cellData.itemIndex !== undefined) {
                handleDeleteIndividualItem(cellData.userId, cellData.dayIndex, cellData.itemIndex, cellData.date);
            } else {
                // Delete the entire cell
                handleSaveAllocation(null, cellToUpdate);
            }
        } else if (action === 'paste') {
            // Check if the target cell already has a project assignment
            const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
            const currentAssignment = allocations[weekKey]?.[cellToUpdate.userId]?.assignments[cellToUpdate.dayIndex];
            const hasExistingProject = currentAssignment && (
                (Array.isArray(currentAssignment) && currentAssignment.some(a => a.type === 'project')) ||
                (currentAssignment.type === 'project')
            );

            // If pasting a project and there's already a project, add as second project
            const shouldAddAsSecondProject = hasExistingProject && clipboard.data?.type === 'project';

            handleSaveAllocation(clipboard.data, cellToUpdate, shouldAddAsSecondProject);
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
                    Resource Allocation Calendar
                </h1>
                <h2 style="font-size: 24px; font-weight: 600; color: #4b5563;">
                    Week ${fiscalWeek}: ${formatDateForDisplay(weekDates[0])} - ${formatDateForDisplay(weekDates[6])}, ${currentWeekStart.getFullYear()}
                </h2>
            `;
            exportWrapper.appendChild(title);

            // Clone calendar
            const calendarClone = calendarRef.current.cloneNode(true);

            // Remove interactive elements
            const buttons = calendarClone.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());

            // Remove scroll constraints and set to full display
            calendarClone.style.maxHeight = 'none';
            calendarClone.style.overflow = 'visible';
            calendarClone.style.width = '100%';
            calendarClone.style.height = 'auto';

            // Remove all dark mode classes from clone
            const allElements = calendarClone.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    // Remove dark: prefixed classes
                    el.className = el.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
                }
            });

            // Also remove from calendarClone itself
            if (calendarClone.className && typeof calendarClone.className === 'string') {
                calendarClone.className = calendarClone.className.split(' ').filter(cls => !cls.startsWith('dark:')).join(' ');
            }

            exportWrapper.appendChild(calendarClone);

            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture with html-to-image at full width
            const dataUrl = await toPng(exportWrapper, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                width: 2560,
                cacheBust: true,
                filter: (node) => {
                    // Filter out any remaining buttons or interactive elements
                    return node.tagName !== 'BUTTON';
                }
            });

            // Cleanup
            document.body.removeChild(exportWrapper);

            // Download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Resource-Calendar-Week-${fiscalWeek}-${formatDateForKey(currentWeekStart)}.png`;
            link.click();
            setIsExporting(false);

        } catch (error) {
            console.error('Error exporting calendar:', error);
            alert('Failed to export calendar image. Please try again.');
            setIsExporting(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        console.log('🎯 Drag end event:', { active: active?.id, over: over?.id });

        if (!over || !active) {
            console.log('❌ No over or active');
            return;
        }

        // Parse the draggable ID: "userId::dayIndex::assignmentIndex"
        const [sourceUserId, sourceDayIndex, sourceAssignmentIndex] = active.id.split('::');
        // Parse the droppable ID: "drop::userId::dayIndex"
        const [, targetUserId, targetDayIndex] = over.id.split('::');

        console.log('📍 Source:', { sourceUserId, sourceDayIndex, sourceAssignmentIndex });
        console.log('📍 Target:', { targetUserId, targetDayIndex });

        const sourceDayIndexNum = parseInt(sourceDayIndex);
        const targetDayIndexNum = parseInt(targetDayIndex);
        const sourceAssignmentIndexNum = parseInt(sourceAssignmentIndex);

        // Don't do anything if dropped on the same cell
        if (sourceUserId === targetUserId && sourceDayIndexNum === targetDayIndexNum) {
            console.log('⏭️ Dropped on same cell, ignoring');
            return;
        }

        const weekKey = formatDateForKey(currentWeekStart);
        const sourceDate = weekDates[sourceDayIndexNum];
        const targetDate = weekDates[targetDayIndexNum];

        console.log('📅 Dates:', { weekKey, sourceDate, targetDate });

        try {
            // Get the assignment being dragged
            const sourceAssignment = allocations[weekKey]?.[sourceUserId]?.assignments[sourceDayIndexNum];
            console.log('📦 Source assignment:', sourceAssignment);

            if (!sourceAssignment) {
                console.log('❌ No source assignment');
                return;
            }

            let draggedAssignment;
            if (Array.isArray(sourceAssignment)) {
                draggedAssignment = sourceAssignment[sourceAssignmentIndexNum];
            } else {
                draggedAssignment = sourceAssignment;
            }

            console.log('🎒 Dragged assignment:', draggedAssignment);

            if (!draggedAssignment || (draggedAssignment.type !== 'project' && draggedAssignment.type !== 'leave')) {
                console.log('❌ No dragged assignment or not a project/leave');
                return;
            }

            const targetDateString = formatDateForKey(targetDate);
            const sourceDateString = formatDateForKey(sourceDate);

            console.log('📅 Date strings:', { targetDateString, sourceDateString });

            // Determine if the users are dummy users and select appropriate tables
            const sourceUser = allUsers.find(u => u.id === sourceUserId);
            const targetUser = allUsers.find(u => u.id === targetUserId);
            const sourceIsDummy = sourceUser?.isDummy === true;
            const targetIsDummy = targetUser?.isDummy === true;
            const sourceTableName = sourceIsDummy ? 'dummy_resource_allocations' : 'resource_allocations';
            const targetTableName = targetIsDummy ? 'dummy_resource_allocations' : 'resource_allocations';

            // Step 1: Add to target cell in database
            let recordToInsert;

            if (draggedAssignment.type === 'leave') {
                recordToInsert = {
                    user_id: targetUserId,
                    allocation_date: targetDateString,
                    assignment_type: 'leave',
                    leave_type: draggedAssignment.leaveType,
                    comment: draggedAssignment.comment || null,
                    project_id: null,
                    project_number: null,
                    project_name: null,
                    client: null,
                    task: null,
                    shift: null,
                    time: null
                };
            } else {
                recordToInsert = {
                    user_id: targetUserId,
                    allocation_date: targetDateString,
                    assignment_type: 'project',
                    project_id: draggedAssignment.projectId || null,
                    project_number: draggedAssignment.projectNumber || null,
                    project_name: draggedAssignment.projectName || null,
                    client: draggedAssignment.client || null,
                    task: draggedAssignment.task || null,
                    shift: draggedAssignment.shift || null,
                    time: draggedAssignment.time || null,
                    comment: draggedAssignment.comment || null,
                    leave_type: null
                };
            }

            console.log('➕ Inserting to target:', recordToInsert);

            const { error: insertError } = await supabase
                .from(targetTableName)
                .insert([recordToInsert]);

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw insertError;
            }

            console.log('✅ Insert successful');

            // Step 2: Remove from source cell in database
            console.log('🔍 Fetching source records...');
            const { data: sourceRecords, error: fetchError } = await supabase
                .from(sourceTableName)
                .select('*')
                .eq('user_id', sourceUserId)
                .eq('allocation_date', sourceDateString);

            if (fetchError) {
                console.error('❌ Fetch error:', fetchError);
                throw fetchError;
            }

            console.log('📦 Source records from DB:', sourceRecords);

            if (Array.isArray(sourceAssignment) && sourceAssignment.length > 1) {
                console.log('🔄 Multiple items in source, removing one...');
                // Multiple items in source - remove only the dragged one
                const remainingItems = sourceAssignment.filter((_, idx) => idx !== sourceAssignmentIndexNum);

                console.log('📋 Remaining items:', remainingItems);

                // Delete all and re-insert remaining
                console.log('🗑️ Deleting all source records...');
                const { error: deleteError } = await supabase
                    .from(sourceTableName)
                    .delete()
                    .eq('user_id', sourceUserId)
                    .eq('allocation_date', sourceDateString);

                if (deleteError) {
                    console.error('❌ Delete error:', deleteError);
                    throw deleteError;
                }

                console.log('✅ Delete successful');

                const recordsToInsert = remainingItems.map(item => {
                    if (item.type === 'leave') {
                        return {
                            user_id: sourceUserId,
                            allocation_date: sourceDateString,
                            assignment_type: 'leave',
                            leave_type: item.leaveType,
                            comment: item.comment || null,
                            project_id: null,
                            project_number: null,
                            project_name: null,
                            client: null,
                            task: null,
                            shift: null,
                            time: null
                        };
                    } else {
                        return {
                            user_id: sourceUserId,
                            allocation_date: sourceDateString,
                            assignment_type: 'project',
                            project_id: item.projectId || null,
                            project_number: item.projectNumber || null,
                            project_name: item.projectName || null,
                            client: item.client || null,
                            task: item.task || null,
                            shift: item.shift || null,
                            time: item.time || null,
                            comment: item.comment || null,
                            leave_type: null
                        };
                    }
                });

                if (recordsToInsert.length > 0) {
                    console.log('➕ Re-inserting remaining items:', recordsToInsert);
                    const { error: reinsertError } = await supabase
                        .from(sourceTableName)
                        .insert(recordsToInsert);

                    if (reinsertError) {
                        console.error('❌ Reinsert error:', reinsertError);
                        throw reinsertError;
                    }

                    console.log('✅ Reinsert successful');
                }
            } else {
                console.log('🗑️ Single item in source, deleting...');
                // Single item in source - delete the entire cell
                const { error: deleteError } = await supabase
                    .from(sourceTableName)
                    .delete()
                    .eq('user_id', sourceUserId)
                    .eq('allocation_date', sourceDateString);

                if (deleteError) {
                    console.error('❌ Delete error:', deleteError);
                    throw deleteError;
                }

                console.log('✅ Delete successful');
            }

            console.log('✅ Drag and drop completed successfully');
        } catch (err) {
            console.error('❌ Error during drag and drop:', err);
            const errorMessage = handleSupabaseError(err, 'resource_allocations', 'update', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Move Assignment');
            }
            // Refresh allocations to revert UI changes
            getResourceAllocations(true);
        }
    };

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
                    <Button
                        variant={isShowingOnlyMe ? "primary" : "outline"}
                        onClick={handleOnlyMe}
                    >
                        Only Me
                    </Button>
                    {can('SHOW_EXPORT_RESOURCE_CALENDAR_IMAGE') && (
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
                                    <Download size={16} className="mr-2"/>Export Image
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                 <div className="flex items-center gap-2">
                    <div className="relative" ref={filterRef}>
                         <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}><Filter size={16} className="mr-2"/>Filter</Button>
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
                    Error loading resource allocations from the database: {error}.
                </div>
            )}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
            <div className="md:w-auto w-full md:scale-100 scale-[0.65] md:origin-center origin-top-left">
                <div ref={calendarRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-180px)] md:min-h-[calc(100vh-300px)] overflow-y-auto md:w-auto w-[154%]">
                    <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-[250px] bg-gray-50 dark:bg-gray-700">Staff Member</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="px-4 py-3 text-center w-72 bg-gray-50 dark:bg-gray-700">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br/>
                                    {formatDateForDisplay(date)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y-4 divide-gray-300 dark:divide-gray-600">
                        {displayedUsers.map(user => (
                            <tr key={user.id} className="border-spacing-2">
                                <td className="px-4 py-3 font-medium">
                                    <div className="flex items-center min-w-0">
                                        <div className={`w-12 h-12 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-base mr-3 flex-shrink-0`}>{getAvatarText(user)}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-base">{user.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.department || 'No Department'}</p>
                                            {user.competencies && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5" title={user.competencies}>
                                                    {user.competencies}
                                                </p>
                                            )}
                                            {user.pts_number && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    <span className="font-medium">PTS:</span> {user.pts_number}
                                                </p>
                                            )}
                                            {user.mobile_number && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
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
                                            // Multiple projects - backgrounds fill vertical space with no gaps
                                            cellContent = (
                                                <div className="flex-1 flex flex-col">
                                                    {assignment.map((proj, index) => {
                                                        const projColorStyle = getShiftColor(proj.shift);
                                                        const projColor = typeof projColorStyle === 'string' ? projColorStyle : '';
                                                        const projInlineStyle = typeof projColorStyle === 'object' ? projColorStyle : {};

                                                        return (
                                                            <DraggableResourceItem
                                                                key={index}
                                                                id={`${user.id}::${dayIndex}::${index}`}
                                                                disabled={!isDesktop}
                                                            >
                                                                <MultiProjectTile
                                                                    proj={proj}
                                                                    projColor={projColor}
                                                                    projInlineStyle={projInlineStyle}
                                                                    isDesktop={isDesktop}
                                                                    canAllocateResources={canAllocateResources}
                                                                    onContextMenu={(e) => handleActionClick(e, user.id, dayIndex, assignment, index)}
                                                                    onClick={(e) => handleItemClick(e, user.id, date, dayIndex, assignment, index)}
                                                                />
                                                            </DraggableResourceItem>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else if (assignment.type === 'leave') {
                                            const leaveColorStyle = getLeaveColor(assignment.leaveType);
                                            cellColor = typeof leaveColorStyle === 'string' ? leaveColorStyle : '';
                                            const leaveInlineStyle = typeof leaveColorStyle === 'object' ? leaveColorStyle : {};

                                            // Fixed text sizes for leave tiles
                                            const hasComment = assignment.comment && assignment.comment.trim().length > 0;

                                            cellContent = (
                                                <DraggableResourceItem
                                                    id={`${user.id}::${dayIndex}::0`}
                                                    disabled={!isDesktop}
                                                >
                                                    <div
                                                        className={`p-2 rounded-md h-full flex flex-col justify-center font-bold ${cellColor}`}
                                                        onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                        style={leaveInlineStyle}
                                                    >
                                                        <div className={`text-center ${hasComment ? 'mb-1' : ''} text-lg truncate`}>{assignment.leaveType}</div>
                                                        {hasComment && (
                                                            <div className="text-center text-sm font-bold opacity-90 leading-tight line-clamp-3" title={assignment.comment}>
                                                                {assignment.comment}
                                                            </div>
                                                        )}
                                                    </div>
                                                </DraggableResourceItem>
                                            );
                                        } else if (assignment.type === 'status') {
                                            const statusColor = assignment.status === 'Available'
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400';
                                            // Fixed text size for status tiles
                                            cellContent = (
                                                <div
                                                    className={`flex-1 flex items-center justify-center text-xl font-semibold ${statusColor}`}
                                                    onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                >
                                                    {assignment.status}
                                                </div>
                                            );
                                        } else if (assignment.type === 'project') {
                                            const projectColorStyle = getShiftColor(assignment.shift);
                                            cellColor = typeof projectColorStyle === 'string' ? projectColorStyle : '';
                                            const projectInlineStyle = typeof projectColorStyle === 'object' ? projectColorStyle : {};

                                            // Fixed text sizes for single project tiles - project name at top
                                            cellContent = (
                                                <DraggableResourceItem
                                                    id={`${user.id}::${dayIndex}::0`}
                                                    disabled={!isDesktop}
                                                >
                                                    <div
                                                        className={`p-2 rounded-md h-full flex flex-col justify-center text-center ${cellColor}`}
                                                        onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                        style={projectInlineStyle}
                                                    >
                                                        {assignment.projectName && <p className="text-lg mb-1 font-bold leading-tight line-clamp-2" title={assignment.projectName}>{assignment.projectName}</p>}
                                                        <p className="font-semibold text-sm mb-1 truncate">{assignment.projectNumber}</p>
                                                        {assignment.client && <p className="text-sm mb-1 leading-tight line-clamp-1" title={assignment.client}>{assignment.client}</p>}
                                                        {assignment.task && <p className="text-sm mb-1 font-semibold truncate">{assignment.task}</p>}
                                                        {assignment.shift && <p className="text-sm mb-1 font-semibold truncate">{assignment.shift}</p>}
                                                        {assignment.time && <p className="text-sm mb-1 font-semibold truncate">{assignment.time}</p>}
                                                        {assignment.comment && <p className="text-sm font-bold leading-tight line-clamp-2" title={assignment.comment}>{assignment.comment}</p>}
                                                    </div>
                                                </DraggableResourceItem>
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
                                        <ResourceCalendarCell
                                            key={date.toISOString()}
                                            user={user}
                                            date={date}
                                            dayIndex={dayIndex}
                                            assignment={assignment}
                                            cellContent={cellContent}
                                            isDesktop={isDesktop}
                                            canAllocateResources={canAllocateResources}
                                            showContextMenuButton={showContextMenuButton}
                                            handleCellClick={handleCellClick}
                                            handleActionClick={handleActionClick}
                                        />
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            </DndContext>
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
                    editingSpecificItem={selectedCell.editingSpecificItem}
                    editItemIndex={selectedCell.editItemIndex}
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
        (Array.isArray(cellData.assignment) && cellData.assignment.length === 1 && cellData.assignment.every(a => a.type === 'project'))
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
                            {hasProjectAssignment && clipboard.data && clipboard.data.type === 'project' && (
                                <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste as Second Project</button>
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

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, projects, isSecondProject = false, editingSpecificItem = null, editItemIndex = null }) => {
    const [isManual, setIsManual] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [formData, setFormData] = useState({
        projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null
    });

    useEffect(() => {
        // If editing a specific item from a multi-item cell, pre-fill with that item's data
        if (editingSpecificItem) {
            if (editingSpecificItem.type === 'leave') {
                setLeaveType(editingSpecificItem.leaveType);
                setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: editingSpecificItem.comment || '', shift: 'Nights', projectId: null });
                setIsManual(false);
            } else {
                setLeaveType('');
                setFormData({
                    projectNumber: editingSpecificItem.projectNumber || '',
                    projectName: editingSpecificItem.projectName || '',
                    client: editingSpecificItem.client || '',
                    time: editingSpecificItem.time || '',
                    task: editingSpecificItem.task || '',
                    comment: editingSpecificItem.comment || '',
                    shift: editingSpecificItem.shift || 'Nights',
                    projectId: editingSpecificItem.projectId || null
                });
                const isProjectInList = projects?.some(p => p.project_number === editingSpecificItem.projectNumber) || false;
                setIsManual(!isProjectInList && !!editingSpecificItem.projectNumber);
            }
        }
        // If adding to a multi-item cell (isSecondProject) or currentAssignment is an array, show blank form
        else if (isSecondProject || Array.isArray(currentAssignment)) {
            setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null });
            setIsManual(false);
            setLeaveType('');
        } else if (currentAssignment) {
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
    }, [currentAssignment, isOpen, isSecondProject]);

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
