import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users, Copy, Trash2, PlusCircle, FolderKanban, ClipboardCheck, Check, X, Filter, Download, Edit, Calendar } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { toPng } from 'html-to-image';
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

// Draggable wrapper component for resource assignments
const DraggableResourceItem = ({ id, children, disabled }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        disabled: disabled,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'move',
    } : {
        cursor: disabled ? 'default' : 'move',
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
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [selectedCell, setSelectedCell] = useState(null);
    const [visibleUserIds, setVisibleUserIds] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sortOrder, setSortOrder] = useState('department');
    const [filterSaturday, setFilterSaturday] = useState(false);
    const [filterSunday, setFilterSunday] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null, sourceItemIndex: null });
    const [undoHistory, setUndoHistory] = useState([]);
    const filterRef = useRef(null);
    const datePickerRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const calendarRef = useRef(null);
    const justClosedMenuRef = useRef(false);
    const [isExporting, setIsExporting] = useState(false);
    const isSavingRef = useRef(false); // Track when save operations are in progress to prevent race conditions

    // Week caching for performance optimization
    const weekCacheRef = useRef({}); // Stores fetched week data: { weekKey: { data, timestamp } }
    const fetchingWeeksRef = useRef(new Set()); // Track which weeks are currently being fetched
    const MAX_CACHED_WEEKS = 20; // Keep last 20 weeks in cache (supports ±4 weeks + navigation buffer)

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [customShiftColors, setCustomShiftColors] = useState({});
    const [customLeaveColors, setCustomLeaveColors] = useState({});

    // Pan state for desktop left-click panning
    const [isPanning, setIsPanning] = useState(false);
    const [isPanReady, setIsPanReady] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    // Drag overlay state
    const [activeId, setActiveId] = useState(null);
    const [activeDimensions, setActiveDimensions] = useState(null);

    // Detect desktop mode for drag and drop (768px is md breakpoint in Tailwind)
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pan handlers for desktop left-click panning
    const handlePanStart = useCallback((e) => {
        if (!isDesktop || !calendarRef.current) return;

        const target = e.target;

        // Don't pan if clicking on interactive elements
        const isClickableElement = target.tagName === 'BUTTON' ||
                                   target.tagName === 'INPUT' ||
                                   target.tagName === 'A' ||
                                   target.closest('button') ||
                                   target.closest('input') ||
                                   target.closest('a');
        if (isClickableElement) return;

        // Allow pan if clicking on empty cells (has data-empty attribute)
        const isEmptyCell = target.closest('[data-empty="true"]');

        // Don't pan if clicking on assignment content (has data-assignment attribute)
        // BUT allow if it's an empty cell
        if (!isEmptyCell && target.closest('[data-assignment]')) return;

        // Set ready state and store initial position
        // Actual panning will only start after 10px movement threshold
        setIsPanReady(true);
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: calendarRef.current.scrollLeft,
            scrollTop: calendarRef.current.scrollTop
        };
    }, [isDesktop]);

    const handlePanMove = useCallback((e) => {
        if (!calendarRef.current) return;

        // Check if we should activate panning (10px threshold)
        if (isPanReady && !isPanning) {
            const dx = Math.abs(e.clientX - panStartRef.current.x);
            const dy = Math.abs(e.clientY - panStartRef.current.y);

            // Activate panning only after moving 10px (higher than dnd-kit's 8px to give it priority)
            if (dx > 10 || dy > 10) {
                setIsPanning(true);
                setIsPanReady(false);
                calendarRef.current.style.cursor = 'grabbing';
                calendarRef.current.style.userSelect = 'none';
            }
            return;
        }

        if (!isPanning) return;

        e.preventDefault();

        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;

        calendarRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        calendarRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    }, [isPanning, isPanReady]);

    const handlePanEnd = useCallback(() => {
        if (!calendarRef.current) return;

        setIsPanning(false);
        setIsPanReady(false);
        calendarRef.current.style.cursor = '';
        calendarRef.current.style.userSelect = '';
    }, []);

    // Add global mouse event listeners for panning
    useEffect(() => {
        if (isPanning || isPanReady) {
            window.addEventListener('mousemove', handlePanMove);
            window.addEventListener('mouseup', handlePanEnd);

            return () => {
                window.removeEventListener('mousemove', handlePanMove);
                window.removeEventListener('mouseup', handlePanEnd);
            };
        }
    }, [isPanning, isPanReady, handlePanMove, handlePanEnd]);

    // Set up drag and drop sensors (only PointerSensor, not TouchSensor, to exclude mobile)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3, // 3px movement required before drag starts (reduced for faster response)
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

    const getResourceAllocations = useCallback(async (silent = false, weekStartOverride = null) => {
        // Skip reload if we're in the middle of a save operation to prevent race conditions
        if (isSavingRef.current && silent) {
            console.log('⏭️ Skipping reload - save operation in progress');
            return;
        }

        // Use override week if provided (for prefetching), otherwise use current week
        const targetWeek = weekStartOverride || currentWeekStart;
        const cacheKey = formatDateForKey(targetWeek);

        // Check if this week range is already cached
        if (weekCacheRef.current[cacheKey] && !weekStartOverride) {
            const cachedData = weekCacheRef.current[cacheKey];
            const cacheAge = Date.now() - cachedData.timestamp;
            const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes

            if (cacheAge < MAX_CACHE_AGE) {
                console.log(`💾 Using cached data for week ${cacheKey} (age: ${Math.round(cacheAge / 1000)}s)`);
                setAllocations(cachedData.data);
                setLoading(false);
                return;
            } else {
                console.log(`🔄 Cache expired for week ${cacheKey}, refreshing...`);
            }
        }

        // Check if we're already fetching this week (prevent duplicate fetches)
        if (fetchingWeeksRef.current.has(cacheKey)) {
            console.log(`⏳ Already fetching week ${cacheKey}, skipping duplicate request`);
            return;
        }

        // Mark this week as being fetched
        fetchingWeeksRef.current.add(cacheKey);

        // Save scroll position before updating if in silent mode
        if (silent) {
            scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
        }

        if (!silent && !weekStartOverride) {
            setLoading(true);
        }
        setError(null);
        try {
            // Calculate date range: current week ± 4 weeks (9 weeks total = 63 days)
            // This ensures smooth navigation without frequent refetches
            const startDate = addDays(targetWeek, -28); // 4 weeks before
            const endDate = addDays(targetWeek, 34); // Current week (7 days) + 4 weeks after (28 days) - 1 = 34
            const startDateString = formatDateForKey(startDate);
            const endDateString = formatDateForKey(endDate);

            if (!weekStartOverride) {
                console.log(`📅 Fetching allocations for date range: ${startDateString} to ${endDateString} (9 weeks)`);
            } else {
                console.log(`🔮 Prefetching allocations for week ${cacheKey}: ${startDateString} to ${endDateString}`);
            }

            // Fetch allocations from both tables with date range filter
            const fetchWithDateRange = async (tableName) => {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('id, user_id, allocation_date, assignment_type, project_id, project_number, project_name, client, task, shift, time, comment, leave_type')
                    .gte('allocation_date', startDateString)
                    .lte('allocation_date', endDateString)
                    .order('allocation_date', { ascending: true });

                if (error) throw error;
                return data || [];
            };

            // Fetch from both tables in parallel
            const [realData, dummyData] = await Promise.all([
                fetchWithDateRange('resource_allocations'),
                fetchWithDateRange('dummy_resource_allocations')
            ]);

                if (!realData && !dummyData) {
                    console.error('Error fetching resource allocations');
                    setError('Failed to fetch allocations');
                    setAllocations({});
                    return;
                }

                // Combine data from both tables
                const allData = [
                    ...(realData || []),
                    ...(dummyData || [])
                ];

                // Log allocation counts for debugging
                console.log(`📊 Loaded ${realData?.length || 0} real allocations, ${dummyData?.length || 0} dummy allocations (Total: ${allData.length})`);

                // Warn if approaching the row limit
                if (realData?.length >= 45000 || dummyData?.length >= 45000) {
                    console.warn('⚠️ WARNING: Approaching row limit! Consider implementing pagination.');
                }

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
                        } else if (assignmentData) {
                            // Multiple assignments - convert to array
                            // This supports: multiple projects, multiple leaves, or mixed project+leave
                            if (Array.isArray(currentAssignment)) {
                                currentAssignment.push(assignmentData);
                            } else {
                                formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = [currentAssignment, assignmentData];
                            }
                        }
                    }
                });

            // Update state with the fetched data
            if (!weekStartOverride) {
                // Only update displayed allocations if this is for the current week
                setAllocations(formattedAllocations);
            }

            // Store in cache - IMPORTANT: Cache under ALL week keys in the fetched range
            // This prevents re-fetching when navigating to adjacent weeks
            const timestamp = Date.now();
            Object.keys(formattedAllocations).forEach(weekKey => {
                weekCacheRef.current[weekKey] = {
                    data: formattedAllocations,
                    timestamp: timestamp
                };
            });
            console.log(`💾 Cached ${Object.keys(formattedAllocations).length} weeks (${cacheKey} and surrounding weeks)`);

            // Clean up old cache entries (keep only MAX_CACHED_WEEKS most recent)
            const cacheKeys = Object.keys(weekCacheRef.current);
            if (cacheKeys.length > MAX_CACHED_WEEKS) {
                // Sort by timestamp (oldest first)
                const sortedKeys = cacheKeys.sort((a, b) => {
                    return weekCacheRef.current[a].timestamp - weekCacheRef.current[b].timestamp;
                });
                // Remove oldest entries
                const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CACHED_WEEKS);
                keysToRemove.forEach(key => {
                    delete weekCacheRef.current[key];
                    console.log(`🗑️ Removed old cache entry: ${key}`);
                });
            }

            // Restore scroll position after state update if in silent mode
            if (silent && !weekStartOverride) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current);
                });
            }

            // Prefetch extended range (weeks 5-6 on each side) in the background
            // This provides buffer beyond the ±4 weeks already loaded
            if (!weekStartOverride) {
                // Prefetch weeks 5-6 before current week
                for (let i = 5; i <= 6; i++) {
                    const week = addDays(targetWeek, -7 * i);
                    const weekKey = formatDateForKey(week);
                    if (!weekCacheRef.current[weekKey] && !fetchingWeeksRef.current.has(weekKey)) {
                        console.log(`🔮 Prefetching week ${i} before: ${weekKey}`);
                        setTimeout(() => getResourceAllocations(true, week), 100 * i);
                    }
                }

                // Prefetch weeks 5-6 after current week
                for (let i = 5; i <= 6; i++) {
                    const week = addDays(targetWeek, 7 * i);
                    const weekKey = formatDateForKey(week);
                    if (!weekCacheRef.current[weekKey] && !fetchingWeeksRef.current.has(weekKey)) {
                        console.log(`🔮 Prefetching week ${i} after: ${weekKey}`);
                        setTimeout(() => getResourceAllocations(true, week), 100 * (i + 6));
                    }
                }
            }

        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Failed to load resource allocations');
            setAllocations({});
        } finally {
            // Remove from fetching set
            fetchingWeeksRef.current.delete(cacheKey);

            if (!silent && !weekStartOverride) {
                setLoading(false);
            }
        }
    }, [currentWeekStart]); // Re-fetch when week changes

    useEffect(() => {
        getResourceAllocations();

        console.log('🔌 Setting up real-time subscriptions for resource allocations...');

        // Debounce timer for realtime updates to prevent excessive refetches
        let realtimeDebounceTimer = null;

        const debouncedReload = () => {
            if (realtimeDebounceTimer) {
                clearTimeout(realtimeDebounceTimer);
            }
            realtimeDebounceTimer = setTimeout(() => {
                console.log('🔄 Reloading resource allocations (debounced, silent)...');
                // Invalidate cache for current week to force fresh data fetch
                const currentWeekKey = formatDateForKey(currentWeekStart);
                if (weekCacheRef.current[currentWeekKey]) {
                    console.log('🗑️ Invalidating cache for current week due to real-time update');
                    delete weekCacheRef.current[currentWeekKey];
                }
                getResourceAllocations(true);
            }, 500); // 500ms debounce to batch multiple rapid changes
        };

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
                    debouncedReload();
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
                    debouncedReload();
                }
            )
            .subscribe((status) => {
                console.log('📡 Dummy resource allocations subscription status:', status);
            });

        return () => {
            console.log('🔌 Unsubscribing from resource allocations...');
            if (realtimeDebounceTimer) {
                clearTimeout(realtimeDebounceTimer);
            }
            realAllocationsSubscription.unsubscribe();
            dummyAllocationsSubscription.unsubscribe();
        };
    }, [getResourceAllocations, currentWeekStart]); // Re-subscribe when week changes

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setIsDatePickerOpen(false);
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

        // Helper function to normalize dates to midnight local time for comparison
        const normalizeDate = (dateInput) => {
            if (!dateInput) return null;

            if (typeof dateInput === 'string') {
                // Parse date string as YYYY-MM-DD
                const parts = dateInput.split('-');
                if (parts.length === 3) {
                    // Create date in local timezone at midnight
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
                }
            }

            // For Date objects, normalize to midnight
            const date = new Date(dateInput);
            date.setHours(0, 0, 0, 0);
            return date;
        };

        // Filter by employment dates - only show users employed during the visible week
        const weekStartDate = normalizeDate(currentWeekStart);
        const weekEndDate = normalizeDate(addDays(currentWeekStart, 6)); // Saturday to Friday (7 days)

        usersToDisplay = usersToDisplay.filter(user => {
            // Check if user was employed during the visible week
            const hireDate = user.hire_date ? normalizeDate(user.hire_date) : null;
            const terminationDate = user.termination_date ? normalizeDate(user.termination_date) : null;

            // User must have started before or during the visible week
            const startedBeforeOrDuringWeek = !hireDate || hireDate <= weekEndDate;

            // User must still be employed or left after (or on) the week started
            const stillEmployedOrLeftAfterWeekStart = !terminationDate || terminationDate >= weekStartDate;

            return startedBeforeOrDuringWeek && stillEmployedOrLeftAfterWeekStart;
        });

        if (filterDepartments.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterDepartments.includes(user.department));
        }

        const weekKey = formatDateForKey(currentWeekStart);
        const currentWeekAllocations = allocations[weekKey] || {};

        // Filter by weekend availability (Saturday OR Sunday)
        if (filterSaturday || filterSunday) {
            usersToDisplay = usersToDisplay.filter(user => {
                let availableOnSaturday = false;
                let availableOnSunday = false;

                // Check Saturday (dayIndex 0) - include if Available status OR has project assignment
                if (filterSaturday) {
                    const saturdayAssignment = currentWeekAllocations[user.id]?.assignments[0];
                    if (saturdayAssignment) {
                        if (Array.isArray(saturdayAssignment)) {
                            // Check for any Available status (including Available, Available (D), Available (N)) or project assignment
                            availableOnSaturday = saturdayAssignment.some(a =>
                                (a.type === 'status' && (a.status === 'Available' || a.status === 'Available (D)' || a.status === 'Available (N)')) ||
                                a.type === 'project'
                            );
                        } else {
                            // Single assignment - check for any Available status or project
                            availableOnSaturday =
                                (saturdayAssignment.type === 'status' && (saturdayAssignment.status === 'Available' || saturdayAssignment.status === 'Available (D)' || saturdayAssignment.status === 'Available (N)')) ||
                                saturdayAssignment.type === 'project';
                        }
                    }
                }

                // Check Sunday (dayIndex 1) - include if Available status OR has project assignment
                if (filterSunday) {
                    const sundayAssignment = currentWeekAllocations[user.id]?.assignments[1];
                    if (sundayAssignment) {
                        if (Array.isArray(sundayAssignment)) {
                            // Check for any Available status (including Available, Available (D), Available (N)) or project assignment
                            availableOnSunday = sundayAssignment.some(a =>
                                (a.type === 'status' && (a.status === 'Available' || a.status === 'Available (D)' || a.status === 'Available (N)')) ||
                                a.type === 'project'
                            );
                        } else {
                            // Single assignment - check for any Available status or project
                            availableOnSunday =
                                (sundayAssignment.type === 'status' && (sundayAssignment.status === 'Available' || sundayAssignment.status === 'Available (D)' || sundayAssignment.status === 'Available (N)')) ||
                                sundayAssignment.type === 'project';
                        }
                    }
                }

                // If both filters are active, show users available/assigned on Saturday OR Sunday
                // If only one filter is active, show users available/assigned on that day
                if (filterSaturday && filterSunday) {
                    return availableOnSaturday || availableOnSunday;
                } else if (filterSaturday) {
                    return availableOnSaturday;
                } else {
                    return availableOnSunday;
                }
            });
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
    }, [allUsers, visibleUserIds, filterDepartments, sortOrder, filterSaturday, filterSunday, allocations, currentWeekStart]);

    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handleActionClick = (e, userId, dayIndex, assignment, itemIndex = null) => {
        e.stopPropagation();
        e.preventDefault();

        // If we just closed the menu, don't immediately reopen it
        if (justClosedMenuRef.current) {
            justClosedMenuRef.current = false;
            return;
        }

        // If context menu is already visible, close it instead of opening a new one
        if (contextMenu.visible) {
            setContextMenu({ visible: false, x: 0, y: 0, cellData: null });
            justClosedMenuRef.current = true;
            // Reset the flag after a short delay
            setTimeout(() => {
                justClosedMenuRef.current = false;
            }, 100);
            return;
        }

        // Check if menu would have any items before opening
        const hasAssignment = !!assignment;
        const isStatusAssignment = hasAssignment && assignment.type === 'status';
        const isLeaveAssignment = hasAssignment && assignment.type === 'leave';
        const hasProjectAssignment = hasAssignment && (
            (Array.isArray(assignment) && assignment.some(a => a.type === 'project' && a.projectNumber)) ||
            (assignment.type === 'project' && assignment.projectNumber)
        );

        // Determine if there would be any menu items
        let wouldHaveItems = false;

        if (hasAssignment) {
            // For assignments, check what actions would be available
            if (!isStatusAssignment && canAllocateResources) {
                wouldHaveItems = true; // Can edit/copy/cut/delete
            } else if (hasProjectAssignment) {
                wouldHaveItems = true; // Can view project
            } else if (isStatusAssignment && canSetAvailabilityStatus) {
                wouldHaveItems = true; // Can delete status
            } else if (isLeaveAssignment && canAllocateResources) {
                wouldHaveItems = true; // Can edit/delete leave
            }
        } else {
            // For empty cells
            if (canAllocateResources || canSetAvailabilityStatus) {
                wouldHaveItems = true;
            }
        }

        if (!wouldHaveItems) {
            return; // Don't open empty menu
        }

        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment, date: weekDates[dayIndex], itemIndex }
        });
    };

    // Sync a single cell to database (used by undo)
    const syncCellToDatabase = async (userId, dayIndex, assignment, date) => {
        const user = allUsers.find(u => u.id === userId);
        const isDummyUser = user?.isDummy === true;
        const tableName = isDummyUser ? 'dummy_resource_allocations' : 'resource_allocations';
        const allocationDateString = formatDateForKey(date);

        try {
            // Delete all existing records for this cell
            await supabase
                .from(tableName)
                .delete()
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            // If assignment is not null, insert new record(s)
            if (assignment) {
                const assignmentsArray = Array.isArray(assignment) ? assignment : [assignment];
                const recordsToInsert = assignmentsArray.map(item => {
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
                    } else if (item.type === 'status') {
                        return {
                            user_id: userId,
                            allocation_date: allocationDateString,
                            assignment_type: 'status',
                            comment: item.status,
                            project_id: null,
                            project_number: null,
                            project_name: null,
                            client: null,
                            task: null,
                            shift: null,
                            time: null,
                            leave_type: null
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

                await supabase.from(tableName).insert(recordsToInsert);
            }
        } catch (error) {
            console.error('Error syncing cell to database:', error);
            throw error;
        }
    };

    // Save current state to undo history (limit to last 20 actions)
    const saveToHistory = useCallback(() => {
        setUndoHistory(prev => {
            const newHistory = [...prev, JSON.parse(JSON.stringify(allocations))];
            // Keep only last 20 states
            return newHistory.slice(-20);
        });
    }, [allocations]);

    // Undo last action
    const handleUndo = useCallback(async () => {
        if (undoHistory.length === 0) return;

        const previousState = undoHistory[undoHistory.length - 1];
        setUndoHistory(prev => prev.slice(0, -1));

        // Restore the previous state
        setAllocations(previousState);

        // Sync with database
        try {
            // Get all changes between current and previous state
            const currentState = allocations;
            const changedCells = [];

            // Find all differences
            Object.keys({...currentState, ...previousState}).forEach(weekKey => {
                const currentWeek = currentState[weekKey] || {};
                const previousWeek = previousState[weekKey] || {};

                Object.keys({...currentWeek, ...previousWeek}).forEach(userId => {
                    const currentUser = currentWeek[userId]?.assignments || Array(7).fill(null);
                    const previousUser = previousWeek[userId]?.assignments || Array(7).fill(null);

                    currentUser.forEach((currentAssignment, dayIndex) => {
                        const previousAssignment = previousUser[dayIndex];
                        if (JSON.stringify(currentAssignment) !== JSON.stringify(previousAssignment)) {
                            changedCells.push({
                                userId,
                                weekKey,
                                dayIndex,
                                assignment: previousAssignment
                            });
                        }
                    });
                });
            });

            // Apply all changes to database
            for (const cell of changedCells) {
                const date = addDays(new Date(cell.weekKey), cell.dayIndex);
                await syncCellToDatabase(cell.userId, cell.dayIndex, cell.assignment, date);
            }
        } catch (error) {
            console.error('Error during undo:', error);
            alert('Failed to undo changes. Please try again.');
        }
    }, [undoHistory, allocations]);

    // Keyboard listener for Ctrl+Z / Cmd+Z
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    const handleSaveAllocation = async (allocationData, cellToUpdate = selectedCell, isSecondProject = false, isSecondLeave = false) => {
        console.log('🎯 handleSaveAllocation called with:', {
            allocationData,
            userId: cellToUpdate.userId,
            isSecondProject,
            isSecondLeave
        });

        const { userId } = cellToUpdate;
        const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
        const dayIndex = (cellToUpdate.date.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, etc.

        // Save current state to history before making changes
        saveToHistory();

        // Set flag to prevent race conditions with realtime updates
        isSavingRef.current = true;

        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };

            const currentAssignment = newAllocations[weekKey][userId].assignments[dayIndex];

            if (allocationData === null) {
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else if (allocationData.type === 'leave') {
                // Handle multiple leave items per day
                if (isSecondLeave && currentAssignment) {
                    if (Array.isArray(currentAssignment)) {
                        // Already have multiple items, add another
                        newAllocations[weekKey][userId].assignments[dayIndex] = [...currentAssignment, allocationData];
                    } else {
                        // Convert single item to array
                        newAllocations[weekKey][userId].assignments[dayIndex] = [currentAssignment, allocationData];
                    }
                } else {
                    // First/only leave for the day (or replacing existing)
                    newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
                }
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

                console.log('📤 Inserting second project to', tableName, ':', recordData);

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);

                if (error) throw error;
            } else if (isSecondLeave) {
                // Adding a second leave - insert new record
                recordData = {
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

                console.log('📤 Inserting single allocation to', tableName, ':', recordData);

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);
                if (error) throw error;
            }

            // Clear the saving flag immediately after successful database operation
            isSavingRef.current = false;
        } catch (err) {
            console.error('Error saving allocation to Supabase:', err);
            const errorMessage = handleSupabaseError(err, tableName, 'insert', recordData);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Save Allocation');
            }
            // Clear the saving flag on error as well
            isSavingRef.current = false;
            // Reload allocations to revert the optimistic update
            console.log('🔄 Reverting optimistic update due to save error...');
            getResourceAllocations(true);
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

        // Set flag to prevent race conditions with realtime updates
        isSavingRef.current = true;

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

            // Clear the saving flag after successful database operation
            setTimeout(() => {
                isSavingRef.current = false;
            }, 1000);
        } catch (err) {
            console.error('Error deleting individual item:', err);
            const errorMessage = handleSupabaseError(err, tableName, 'delete', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Delete Item');
            }
            // Clear the saving flag on error as well
            isSavingRef.current = false;
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

        if (action === 'edit') {
            // Extract the specific item from the array if itemIndex is provided
            const specificItem = (cellData.itemIndex !== null && cellData.itemIndex !== undefined && Array.isArray(cellData.assignment))
                ? cellData.assignment[cellData.itemIndex]
                : cellData.assignment;
            setSelectedCell({ ...cellToUpdate, editItemIndex: cellData.itemIndex, editingSpecificItem: specificItem });
            setIsAllocationModalOpen(true);
        } else if (action === 'copy' || action === 'cut') {
            // If itemIndex is provided, copy only that specific item
            let dataToCopy;
            let sourceItemIndex = null;
            if (cellData.itemIndex !== null && cellData.itemIndex !== undefined && Array.isArray(cellData.assignment)) {
                dataToCopy = cellData.assignment[cellData.itemIndex];
                sourceItemIndex = cellData.itemIndex;
            } else {
                dataToCopy = cellData.assignment;
            }
            setClipboard({ type: action, data: dataToCopy, sourceCell: cellToUpdate, sourceItemIndex });
        } else if (action === 'delete') {
            // If itemIndex is provided, delete only that specific item from multi-item array
            if (cellData.itemIndex !== null && cellData.itemIndex !== undefined) {
                handleDeleteIndividualItem(cellData.userId, cellData.dayIndex, cellData.itemIndex, cellData.date);
            } else {
                // Delete the entire cell
                handleSaveAllocation(null, cellToUpdate);
            }
        } else if (action === 'paste') {
            // Check if the target cell already has any assignment
            const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
            const currentAssignment = allocations[weekKey]?.[cellToUpdate.userId]?.assignments[cellToUpdate.dayIndex];

            // Determine if we should add as second item
            const hasExistingAssignment = currentAssignment && currentAssignment.type !== 'status';
            const shouldAddAsSecondItem = hasExistingAssignment;
            const isAddingProject = clipboard.data?.type === 'project';
            const isAddingLeave = clipboard.data?.type === 'leave';

            handleSaveAllocation(
                clipboard.data,
                cellToUpdate,
                isAddingProject && shouldAddAsSecondItem,
                isAddingLeave && shouldAddAsSecondItem
            );
            if (clipboard.type === 'cut') {
                // If cutting a specific item from a multi-item array, only remove that item
                if (clipboard.sourceItemIndex !== null && clipboard.sourceItemIndex !== undefined) {
                    handleDeleteIndividualItem(
                        clipboard.sourceCell.userId,
                        clipboard.sourceCell.dayIndex,
                        clipboard.sourceItemIndex,
                        clipboard.sourceCell.date
                    );
                } else {
                    // Remove the entire cell
                    handleSaveAllocation(null, clipboard.sourceCell);
                }
                setClipboard({ type: null, data: null, sourceCell: null, sourceItemIndex: null });
            }
        } else if (action === 'allocate') {
            setSelectedCell(cellToUpdate);
            setIsAllocationModalOpen(true);
        } else if (action === 'addSecondProject' || action === 'addProject') {
            setSelectedCell({...cellToUpdate, isSecondProject: true});
            setIsAllocationModalOpen(true);
        } else if (action === 'addSecondLeave' || action === 'addLeave') {
            setSelectedCell({...cellToUpdate, isSecondLeave: true});
            setIsAllocationModalOpen(true);
        } else if (action === 'moveUp' || action === 'moveDown') {
            // Reorder items in the array
            const newAssignment = [...cellData.assignment];
            const targetIndex = action === 'moveUp' ? cellData.itemIndex - 1 : cellData.itemIndex + 1;

            // Swap items
            [newAssignment[cellData.itemIndex], newAssignment[targetIndex]] = [newAssignment[targetIndex], newAssignment[cellData.itemIndex]];

            // Update state immediately
            const weekKey = formatDateForKey(getWeekStartDate(cellData.date));
            setAllocations(prev => {
                const newAllocations = JSON.parse(JSON.stringify(prev));
                if (newAllocations[weekKey] && newAllocations[weekKey][cellData.userId]) {
                    newAllocations[weekKey][cellData.userId].assignments[cellData.dayIndex] = newAssignment;
                }
                return newAllocations;
            });

            // Save to database
            const user = allUsers.find(u => u.id === cellData.userId);
            const isDummyUser = user?.isDummy === true;
            const tableName = isDummyUser ? 'dummy_resource_allocations' : 'resource_allocations';
            const allocationDateString = formatDateForKey(cellData.date);

            (async () => {
                try {
                    // Delete all existing records for this day
                    await supabase
                        .from(tableName)
                        .delete()
                        .eq('user_id', cellData.userId)
                        .eq('allocation_date', allocationDateString);

                    // Re-insert all items in new order
                    const recordsToInsert = newAssignment.map(item => {
                        if (item.type === 'leave') {
                            return {
                                user_id: cellData.userId,
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
                                user_id: cellData.userId,
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

                    await supabase
                        .from(tableName)
                        .insert(recordsToInsert);
                } catch (err) {
                    console.error('Error reordering items:', err);
                    // Refresh allocations to revert UI changes
                    getResourceAllocations(true);
                }
            })();
        } else if (action === 'setAvailable') {
            handleSaveAllocation({ type: 'status', status: 'Available' }, cellToUpdate);
        } else if (action === 'setAvailableDay') {
            handleSaveAllocation({ type: 'status', status: 'Available (D)' }, cellToUpdate);
        } else if (action === 'setAvailableNight') {
            handleSaveAllocation({ type: 'status', status: 'Available (N)' }, cellToUpdate);
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

    const handleDateSelect = (date) => {
        const newWeekStart = getWeekStartDate(date);
        // Only update if the week actually changed
        if (formatDateForKey(newWeekStart) !== formatDateForKey(currentWeekStart)) {
            setCurrentWeekStart(newWeekStart);
        }
        setIsDatePickerOpen(false);
    };

    const handlePickerMonthChange = (offset) => {
        let newMonth = pickerMonth + offset;
        let newYear = pickerYear;

        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }

        setPickerMonth(newMonth);
        setPickerYear(newYear);
    };

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        // Returns 0-6 where 0 is Sunday
        return new Date(year, month, 1).getDay();
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

    const handleDragStart = (event) => {
        setActiveId(event.active.id);

        // Capture the dimensions of the dragged element
        try {
            const activeElement = event.active?.rect?.current?.initial;
            if (activeElement) {
                setActiveDimensions({
                    width: activeElement.width,
                    height: activeElement.height
                });
            }
        } catch (error) {
            console.log('Could not capture dimensions:', error);
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setActiveDimensions(null);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        console.log('🎯 Drag end event:', { active: active?.id, over: over?.id });

        // Clear active drag overlay
        setActiveId(null);
        setActiveDimensions(null);

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

        // Save current state to history before making changes
        saveToHistory();

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

    // Render the drag overlay item
    const renderDragOverlay = () => {
        if (!activeId) return null;

        const [userId, dayIndex, assignmentIndex] = activeId.split('::');
        const dayIndexNum = parseInt(dayIndex);
        const assignmentIndexNum = parseInt(assignmentIndex);
        const weekKey = formatDateForKey(currentWeekStart);

        const assignment = allocations[weekKey]?.[userId]?.assignments[dayIndexNum];
        if (!assignment) return null;

        let draggedItem;
        if (Array.isArray(assignment)) {
            draggedItem = assignment[assignmentIndexNum];
        } else {
            draggedItem = assignment;
        }

        if (!draggedItem) return null;

        // Render based on type
        if (draggedItem.type === 'project') {
            const projColorStyle = getShiftColor(draggedItem.shift);
            const projColor = typeof projColorStyle === 'string' ? projColorStyle : '';
            const projInlineStyle = typeof projColorStyle === 'object' ? projColorStyle : {};

            return (
                <div
                    className={`p-1.5 rounded text-center ${projColor} shadow-lg opacity-90`}
                    style={{
                        ...projInlineStyle,
                        width: activeDimensions?.width ? `${activeDimensions.width}px` : 'auto',
                        height: activeDimensions?.height ? `${activeDimensions.height}px` : 'auto',
                        boxSizing: 'border-box',
                    }}
                >
                    <p className="text-sm mb-0.5 font-bold leading-tight line-clamp-1">{draggedItem.projectName}</p>
                    <p className="font-semibold text-xs mb-0.5 truncate">{draggedItem.projectNumber}</p>
                    {draggedItem.task && <p className="text-xs mb-0.5 leading-tight line-clamp-1">{draggedItem.task}</p>}
                    <p className="font-semibold text-xs mb-0.5 leading-tight truncate">{typeof draggedItem.shift === 'string' ? draggedItem.shift : String(draggedItem.shift || '')}</p>
                    {draggedItem.time && <p className="text-xs leading-tight font-semibold truncate">{draggedItem.time}</p>}
                </div>
            );
        } else if (draggedItem.type === 'leave') {
            const leaveColorStyle = getLeaveColor(draggedItem.leaveType);
            const leaveColor = typeof leaveColorStyle === 'string' ? leaveColorStyle : '';
            const leaveInlineStyle = typeof leaveColorStyle === 'object' ? leaveColorStyle : {};
            const hasComment = draggedItem.comment && draggedItem.comment.trim().length > 0;

            return (
                <div
                    className={`p-2 rounded-md shadow-lg opacity-90 font-bold ${leaveColor}`}
                    style={{
                        ...leaveInlineStyle,
                        width: activeDimensions?.width ? `${activeDimensions.width}px` : 'auto',
                        height: activeDimensions?.height ? `${activeDimensions.height}px` : 'auto',
                        boxSizing: 'border-box',
                    }}
                >
                    <div className={`text-center ${hasComment ? 'mb-1' : ''} text-lg truncate`}>{draggedItem.leaveType}</div>
                    {hasComment && (
                        <div className="text-center text-sm font-bold opacity-90 leading-tight line-clamp-3">
                            {draggedItem.comment}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resource Allocation</h1>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setCurrentWeekStart(getWeekStartDate(new Date()))}>This Week</Button>
                    <div className="relative" ref={datePickerRef}>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setPickerMonth(currentWeekStart.getMonth());
                                setPickerYear(currentWeekStart.getFullYear());
                                setIsDatePickerOpen(!isDatePickerOpen);
                            }}
                            title="Jump to week"
                        >
                            <Calendar size={16} />
                        </Button>
                        {isDatePickerOpen && (
                            <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50" style={{ minWidth: '280px' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => handlePickerMonthChange(-1)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {new Date(pickerYear, pickerMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button
                                        onClick={() => handlePickerMonthChange(1)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                        <div key={day} className="text-xs font-semibold text-gray-600 dark:text-gray-400 p-2">
                                            {day}
                                        </div>
                                    ))}
                                    {Array.from({ length: getFirstDayOfMonth(pickerMonth, pickerYear) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="p-2"></div>
                                    ))}
                                    {Array.from({ length: getDaysInMonth(pickerMonth, pickerYear) }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(pickerYear, pickerMonth, day);
                                        const isToday = formatDateForKey(date) === formatDateForKey(new Date());
                                        const isSelected = formatDateForKey(getWeekStartDate(date)) === formatDateForKey(currentWeekStart);

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => handleDateSelect(date)}
                                                className={`p-2 text-sm rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 ${
                                                    isToday ? 'bg-blue-100 dark:bg-blue-900/30 font-bold' : ''
                                                } ${
                                                    isSelected ? 'bg-orange-500 text-white font-bold hover:bg-orange-600' : 'text-gray-900 dark:text-gray-100'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
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
                             <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 p-4 space-y-4">
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
                                 <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                     <h4 className="font-semibold mb-2 text-sm">Weekend Availability</h4>
                                     <div className="space-y-2">
                                         <label className="flex items-center space-x-2 text-sm">
                                             <input
                                                 type="checkbox"
                                                 checked={filterSaturday}
                                                 onChange={(e) => setFilterSaturday(e.target.checked)}
                                                 className="rounded text-orange-500 focus:ring-orange-500"
                                             />
                                             <span>Available Saturdays</span>
                                         </label>
                                         <label className="flex items-center space-x-2 text-sm">
                                             <input
                                                 type="checkbox"
                                                 checked={filterSunday}
                                                 onChange={(e) => setFilterSunday(e.target.checked)}
                                                 className="rounded text-orange-500 focus:ring-orange-500"
                                             />
                                             <span>Available Sundays</span>
                                         </label>
                                     </div>
                                     {(filterSaturday || filterSunday) && (
                                         <Button
                                             variant="outline"
                                             size="sm"
                                             className="w-full mt-2"
                                             onClick={() => {
                                                 setFilterSaturday(false);
                                                 setFilterSunday(false);
                                             }}
                                         >
                                             Clear Weekend Filters
                                         </Button>
                                     )}
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
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div
                    ref={calendarRef}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-300px)]"
                    onMouseDown={handlePanStart}
                    style={{ cursor: isDesktop && !isPanning ? 'grab' : isPanning ? 'grabbing' : undefined }}
                >
                    <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-20">
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
                                            // Multiple assignments - could be projects, leaves, or mixed
                                            cellContent = (
                                                <div className="flex-1 flex flex-col gap-1">
                                                    {assignment.map((item, index) => {
                                                        if (item.type === 'project') {
                                                            // Render project
                                                            const projColorStyle = getShiftColor(item.shift);
                                                            const projColor = typeof projColorStyle === 'string' ? projColorStyle : '';
                                                            const projInlineStyle = typeof projColorStyle === 'object' ? projColorStyle : {};

                                                            return (
                                                                <DraggableResourceItem
                                                                    key={index}
                                                                    id={`${user.id}::${dayIndex}::${index}`}
                                                                    disabled={!isDesktop}
                                                                >
                                                                    <div
                                                                        data-assignment="true"
                                                                        className={`p-1.5 rounded text-center ${projColor} relative group overflow-hidden h-full flex flex-col justify-center`}
                                                                        onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment, index) : undefined}
                                                                        style={projInlineStyle}
                                                                    >
                                                                        <p className="text-sm mb-0.5 font-bold leading-tight line-clamp-1" title={item.projectName}>{item.projectName}</p>
                                                                        <p className="font-semibold text-xs mb-0.5 truncate">{item.projectNumber}</p>
                                                                        {item.task && <p className="text-xs mb-0.5 leading-tight line-clamp-1" title={item.task}>{item.task}</p>}
                                                                        <p className="font-semibold text-xs mb-0.5 leading-tight truncate">{typeof item.shift === 'string' ? item.shift : String(item.shift || '')}</p>
                                                                        {item.time && <p className="text-xs leading-tight font-semibold truncate">{item.time}</p>}
                                                                    </div>
                                                                </DraggableResourceItem>
                                                            );
                                                        } else if (item.type === 'leave') {
                                                            // Render leave
                                                            const leaveColorStyle = getLeaveColor(item.leaveType);
                                                            const leaveColor = typeof leaveColorStyle === 'string' ? leaveColorStyle : '';
                                                            const leaveInlineStyle = typeof leaveColorStyle === 'object' ? leaveColorStyle : {};
                                                            const hasComment = item.comment && item.comment.trim().length > 0;

                                                            return (
                                                                <DraggableResourceItem
                                                                    key={index}
                                                                    id={`${user.id}::${dayIndex}::${index}`}
                                                                    disabled={!isDesktop}
                                                                >
                                                                    <div
                                                                        data-assignment="true"
                                                                        className={`p-1.5 rounded-md h-full flex flex-col justify-center font-bold ${leaveColor}`}
                                                                        onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment, index) : undefined}
                                                                        style={leaveInlineStyle}
                                                                    >
                                                                        <div className={`text-center ${hasComment ? 'mb-0.5' : ''} text-sm truncate`}>{item.leaveType}</div>
                                                                        {hasComment && (
                                                                            <div className="text-center text-xs font-bold opacity-90 leading-tight line-clamp-2" title={item.comment}>
                                                                                {item.comment}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </DraggableResourceItem>
                                                            );
                                                        }
                                                        return null;
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
                                                        data-assignment="true"
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
                                            // Determine color based on availability status
                                            let statusColor;
                                            if (assignment.status === 'Available') {
                                                statusColor = 'text-green-600 dark:text-green-400';
                                            } else if (assignment.status === 'Available (D)') {
                                                statusColor = 'text-green-600 dark:text-green-400';
                                            } else if (assignment.status === 'Available (N)') {
                                                statusColor = 'text-green-600 dark:text-green-400';
                                            } else {
                                                statusColor = 'text-red-600 dark:text-red-400';
                                            }
                                            // Fixed text size for status tiles
                                            cellContent = (
                                                <div
                                                    data-assignment="true"
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
                                                        data-assignment="true"
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
                                        <td key={date.toISOString()} className="p-2 relative group">
                                            <DroppableCell id={`drop::${user.id}::${dayIndex}`} disabled={!isDesktop}>
                                                <div
                                                    data-empty={!assignment ? "true" : undefined}
                                                    onContextMenu={isDesktop && showContextMenuButton ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                    onClick={!isDesktop && showContextMenuButton ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                    className={`w-full h-full text-left rounded-md flex flex-col overflow-hidden ${!assignment && isDesktop ? 'cursor-grab hover:cursor-grab' : ''}`}
                                                >
                                                    {cellContent}
                                                </div>
                                            </DroppableCell>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
                <DragOverlay dropAnimation={null}>
                    {renderDragOverlay()}
                </DragOverlay>
            </DndContext>
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cellData={contextMenu.cellData}
                    clipboard={clipboard}
                    onAction={handleContextMenuAction}
                    onClose={() => {
                        setContextMenu({ visible: false });
                        justClosedMenuRef.current = true;
                        setTimeout(() => {
                            justClosedMenuRef.current = false;
                        }, 100);
                    }}
                    canAllocate={canAllocateResources}
                    canSetStatus={canSetAvailabilityStatus}
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={(allocationData) => handleSaveAllocation(allocationData, selectedCell, selectedCell.isSecondProject, selectedCell.isSecondLeave)}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                    projects={projects}
                    isSecondProject={selectedCell.isSecondProject}
                    isSecondLeave={selectedCell.isSecondLeave}
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
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
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
    const hasLeaveAssignment = hasAssignment && (
        (Array.isArray(cellData.assignment) && cellData.assignment.some(a => a.type === 'leave')) ||
        (cellData.assignment.type === 'leave')
    );

    // Can add project if: no status assignment exists
    const canAddProject = hasAssignment && !isStatusAssignment;

    // Can add leave if: no status assignment exists
    const canAddLeave = hasAssignment && !isStatusAssignment;

    // For Move Up/Down functionality
    const isArrayItemOperation = cellData.itemIndex !== null && cellData.itemIndex !== undefined;
    const isMultiItemTile = Array.isArray(cellData.assignment);
    const canMoveUp = isArrayItemOperation && isMultiItemTile && cellData.itemIndex > 0;
    const canMoveDown = isArrayItemOperation && isMultiItemTile && cellData.itemIndex < cellData.assignment.length - 1;

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
                            {(!isMultiItemTile || isArrayItemOperation) && (
                                <button onClick={() => onAction('edit')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} className="mr-2"/>Edit</button>
                            )}
                            {isArrayItemOperation && isMultiItemTile && cellData.assignment.length > 1 && (
                                <>
                                    <button
                                        onClick={() => onAction('moveUp')}
                                        disabled={!canMoveUp}
                                        className={`w-full text-left flex items-center px-4 py-2 text-sm ${canMoveUp ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                                    >
                                        <ChevronUp size={14} className="mr-2" />Move Up
                                    </button>
                                    <button
                                        onClick={() => onAction('moveDown')}
                                        disabled={!canMoveDown}
                                        className={`w-full text-left flex items-center px-4 py-2 text-sm ${canMoveDown ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                                    >
                                        <ChevronDown size={14} className="mr-2" />Move Down
                                    </button>
                                </>
                            )}
                            {(!isMultiItemTile || isArrayItemOperation) && (
                                <>
                                    <button onClick={() => onAction('copy')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Copy</button>
                                    <button onClick={() => onAction('cut')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>Cut</button>
                                </>
                            )}
                            {canAddProject && (
                                <button onClick={() => onAction('addProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Add Project</button>
                            )}
                            {canAddLeave && (
                                <button onClick={() => onAction('addLeave')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Add Leave</button>
                            )}
                            {clipboard.data && clipboard.data.type === 'project' && (
                                <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste Project</button>
                            )}
                            {clipboard.data && clipboard.data.type === 'leave' && (
                                <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste Leave</button>
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
                            <button onClick={() => onAction('setAvailableDay')} className="w-full text-left flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Check size={14} className="mr-2"/>Available (D)</button>
                            <button onClick={() => onAction('setAvailableNight')} className="w-full text-left flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Check size={14} className="mr-2"/>Available (N)</button>
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

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, projects, isSecondProject = false, isSecondLeave = false, editingSpecificItem = null, editItemIndex = null }) => {
    const [isManual, setIsManual] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [formData, setFormData] = useState({
        projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null
    });

    useEffect(() => {
        // Clear search when modal opens
        setProjectSearch('');

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
        // If adding to a multi-item cell (isSecondProject/isSecondLeave) or currentAssignment is an array, show blank form
        else if (isSecondProject || isSecondLeave || Array.isArray(currentAssignment)) {
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
    }, [currentAssignment, isOpen, isSecondProject, isSecondLeave]);

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
            // If manual entry was used and we have a project number but no projectId,
            // try to look up the project to get its UUID
            let dataToSave = { ...formData };

            console.log('📝 AllocationModal handleSave - formData:', formData);

            if (formData.projectNumber && !formData.projectId) {
                const matchingProject = projects?.find(p => p.project_number === formData.projectNumber);
                console.log('🔍 Looking up project by number:', formData.projectNumber, 'Found:', matchingProject);
                if (matchingProject) {
                    dataToSave.projectId = matchingProject.id;
                    console.log('✅ Set projectId to:', matchingProject.id);
                }
            }

            console.log('💾 AllocationModal sending to onSave:', dataToSave);
            onSave(dataToSave);
        }
    };

    const handleClear = () => {
        onSave(null);
    }
    
    const handleLeaveChange = (type) => {
        setLeaveType(prev => prev === type ? '' : type);
    };

    const projectFieldsDisabled = !!leaveType;

    // Filter projects based on search term
    const filteredProjects = (projects || []).filter(p =>
        p.project_number.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.client && p.client.toLowerCase().includes(projectSearch.toLowerCase()))
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProjectSelectFromDropdown = (project) => {
        console.log('🎯 Selected project from dropdown:', project);
        console.log('🔑 Project keys:', Object.keys(project));
        setFormData(prev => ({ ...prev, projectNumber: project.project_number, projectName: project.project_name, client: project.client, projectId: project.id }));
        setIsDropdownOpen(false);
        setProjectSearch('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isSecondProject ? "Add Second Project" : isSecondLeave ? "Add Second Leave" : "Allocate Resource"}>
             <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                    <div>
                        <p><span className="font-semibold">Staff:</span> {user?.name}</p>
                        <p><span className="font-semibold">Date:</span> {date?.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    {!isSecondProject && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave'} onChange={() => handleLeaveChange('Annual Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave (am)'} onChange={() => handleLeaveChange('Annual Leave (am)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave (am)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave (pm)'} onChange={() => handleLeaveChange('Annual Leave (pm)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave (pm)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Bank Holiday'} onChange={() => handleLeaveChange('Bank Holiday')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Bank Holiday</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Haydock)'} onChange={() => handleLeaveChange('Office (Haydock)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Haydock)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Home)'} onChange={() => handleLeaveChange('Office (Home)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Home)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Training'} onChange={() => handleLeaveChange('Training')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Training</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Stand Down'} onChange={() => handleLeaveChange('Stand Down')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Stand Down</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Sick Day'} onChange={() => handleLeaveChange('Sick Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Sick Day</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Rest Day'} onChange={() => handleLeaveChange('Rest Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Rest Day</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Compassionate Leave'} onChange={() => handleLeaveChange('Compassionate Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Compassionate Leave</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Enforced Rest'} onChange={() => handleLeaveChange('Enforced Rest')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Enforced Rest</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Travel Shift'} onChange={() => handleLeaveChange('Travel Shift')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Travel Shift</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Paternity Leave'} onChange={() => handleLeaveChange('Paternity Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Paternity Leave</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Xmas'} onChange={() => handleLeaveChange('Xmas')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Xmas</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'No Assignment'} onChange={() => handleLeaveChange('No Assignment')} className="rounded text-orange-500 focus:ring-orange-500"/><span>No Assignment</span></label>
                        </div>
                    )}

                    {!isSecondLeave && <fieldset disabled={projectFieldsDisabled} className={`space-y-4 ${!isSecondProject ? 'border-t pt-4 mt-4 border-gray-200 dark:border-gray-700' : ''} disabled:opacity-40`}>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="manual-entry" checked={isManual} onChange={(e) => setIsManual(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500"/>
                            <label htmlFor="manual-entry" className="text-sm">Enter Manually</label>
                        </div>

                        {!isManual ? (
                            <div>
                                <label className="block text-sm font-medium mb-1">Project</label>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(true)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    <span className={formData.projectNumber ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                                        {formData.projectNumber ? `${formData.projectNumber} - ${formData.projectName}` : 'Select Project'}
                                    </span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isDropdownOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" ref={dropdownRef}>
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                                <h3 className="text-lg font-semibold mb-3">Select Project</h3>
                                                <input
                                                    type="text"
                                                    placeholder="Search by project number or name..."
                                                    value={projectSearch}
                                                    onChange={(e) => setProjectSearch(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2">
                                                {filteredProjects.length === 0 ? (
                                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                        {projectSearch ? 'No projects match your search' : 'No projects available'}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {filteredProjects.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => handleProjectSelectFromDropdown(p)}
                                                                className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                                                    {p.project_number} - {p.project_name}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                                <Button variant="outline" onClick={() => { setIsDropdownOpen(false); setProjectSearch(''); }} className="w-full">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                    </fieldset>}

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

                    {isSecondLeave && (
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
