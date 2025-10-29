import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, Copy, Trash2, PlusCircle, ClipboardCheck, Filter, MoreVertical, Download, Package, CheckCircle, XCircle, Zap } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
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

// Draggable wrapper component for equipment items
const DraggableEquipmentItem = ({ id, children, disabled }) => {
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
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
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
        <div ref={setNodeRef} style={style} className="w-full h-full">
            {children}
        </div>
    );
};

const EquipmentCalendarPage = () => {
    const { user: currentUser } = useAuth();
    const { canAllocateResources, isEditorOrAbove, can } = usePermissions();
    const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
    const { showPrivilegeError, showErrorModal } = useToast();

    const [equipment, setEquipment] = useState([]);
    const [equipmentLoading, setEquipmentLoading] = useState(true);
    const [equipmentAssignments, setEquipmentAssignments] = useState([]);
    const [equipmentCategories, setEquipmentCategories] = useState([]);
    const [customEquipmentColours, setCustomEquipmentColours] = useState({});
    const [allocations, setAllocations] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStartDate(new Date()));
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [visibleUserIds, setVisibleUserIds] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sortOrder, setSortOrder] = useState('department');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null, sourceIndex: null });
    const filterRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const calendarRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showDiscrepancies, setShowDiscrepancies] = useState(false);
    const [discrepanciesData, setDiscrepanciesData] = useState([]);
    const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

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

    // Fetch equipment assignments (current assignments where returned_at is NULL)
    const getEquipmentAssignments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('equipment_assignments')
                .select('equipment_id, user_id')
                .is('returned_at', null);

            if (error) {
                console.error('Error fetching equipment assignments:', error);
                setEquipmentAssignments([]);
            } else {
                console.log('✅ Equipment assignments loaded:', data?.length || 0, 'assignments');
                setEquipmentAssignments(data || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setEquipmentAssignments([]);
        }
    }, []);

    // Fetch unique equipment categories from equipment table
    const getEquipmentCategories = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('equipment')
                .select('category');

            if (error) {
                console.error('Error fetching equipment categories:', error);
                setEquipmentCategories([]);
            } else {
                // Get unique categories and map to objects with name property
                const uniqueCategories = [...new Set((data || []).map(item => item.category).filter(Boolean))].sort();
                console.log('✅ Equipment categories loaded:', uniqueCategories.length, 'categories');
                setEquipmentCategories(uniqueCategories.map(cat => ({ name: cat })));
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setEquipmentCategories([]);
        }
    }, []);

    // Fetch equipment category colours from calendar_colours table
    const getEquipmentColours = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('calendar_colours')
                .select('*')
                .eq('calendar_type', 'equipment')
                .eq('category_type', 'equipment');

            if (error) {
                console.error('Error fetching equipment colours:', error);
            } else {
                console.log('🎨 Equipment colours loaded:', data?.length || 0, 'colours');
                // Map colours by category_value
                const colourMap = {};
                (data || []).forEach(item => {
                    colourMap[item.category_value] = item.colour;
                });
                setCustomEquipmentColours(colourMap);
            }
        } catch (err) {
            console.error('Unexpected error fetching equipment colours:', err);
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
        getEquipmentAssignments();
        getEquipmentCategories();
        getEquipmentColours();

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

        const assignmentsSubscription = supabase
            .channel('equipment-assignments-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment_assignments'
                },
                (payload) => {
                    console.log('📋 Equipment assignments changed:', payload.eventType);
                    getEquipmentAssignments();
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment assignments subscription status:', status);
            });

        const categoriesSubscription = supabase
            .channel('equipment-categories-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment'
                },
                (payload) => {
                    console.log('🎨 Equipment changed:', payload.eventType);
                    // Refetch equipment categories when equipment is added/updated/deleted
                    getEquipmentCategories();
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment categories subscription status:', status);
            });

        const coloursSubscription = supabase
            .channel('equipment-colours-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_colours',
                    filter: 'calendar_type=eq.equipment'
                },
                (payload) => {
                    console.log('🎨 Equipment colours changed:', payload.eventType);
                    getEquipmentColours();
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment colours subscription status:', status);
            });

        return () => {
            console.log('🔌 Unsubscribing from equipment calendar...');
            equipmentSubscription.unsubscribe();
            calendarSubscription.unsubscribe();
            assignmentsSubscription.unsubscribe();
            categoriesSubscription.unsubscribe();
            coloursSubscription.unsubscribe();
        };
    }, [getEquipment, getEquipmentAllocations, getEquipmentAssignments, getEquipmentCategories, getEquipmentColours]);

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

    const handleActionClick = (e, userId, dayIndex, assignment, equipmentIndex = null) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment, date: weekDates[dayIndex], equipmentIndex }
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

    const handleEditArrayItem = async (allocationData, cellToUpdate) => {
        const { userId, date, editingIndex } = cellToUpdate;
        const weekKey = formatDateForKey(getWeekStartDate(date));
        const dayIndex = (date.getDay() + 1) % 7;

        // Get the current array
        const currentAssignment = allocations[weekKey]?.[userId]?.assignments[dayIndex];
        if (!Array.isArray(currentAssignment)) {
            console.error('Cannot edit array item: assignment is not an array');
            return;
        }

        // Create a new array with the updated item
        const newAssignment = currentAssignment.map((item, idx) => {
            if (idx === editingIndex) {
                return {
                    equipmentId: allocationData.equipmentId || null,
                    comment: allocationData.comment || ''
                };
            }
            return item;
        });

        // Update state
        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };
            newAllocations[weekKey][userId].assignments[dayIndex] = newAssignment;
            return newAllocations;
        });

        setIsAllocationModalOpen(false);

        // Update database
        try {
            const allocationDateString = formatDateForKey(date);

            // Delete all existing records for this date
            const { error: deleteError } = await supabase
                .from('equipment_calendar')
                .delete()
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            if (deleteError) throw deleteError;

            // Re-insert all items with the updated one
            const recordsToInsert = newAssignment.map(item => ({
                user_id: userId,
                equipment_id: item.equipmentId || null,
                allocation_date: allocationDateString,
                comment: item.comment || null
            }));

            const { error: insertError } = await supabase
                .from('equipment_calendar')
                .insert(recordsToInsert);

            if (insertError) throw insertError;
        } catch (err) {
            console.error('Error updating array item:', err);
            const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'update', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Update Equipment');
            }
        }
    };

    const handleContextMenuAction = async (action) => {
        const { cellData } = contextMenu;
        if (!cellData) return;
        const cellToUpdate = { userId: cellData.userId, dayIndex: cellData.dayIndex, date: cellData.date };

        // Check if we're operating on a specific equipment item within an array
        const isArrayItemOperation = cellData.equipmentIndex !== null && cellData.equipmentIndex !== undefined;

        if (isArrayItemOperation && Array.isArray(cellData.assignment)) {
            const equipmentIndex = cellData.equipmentIndex;
            const specificItem = cellData.assignment[equipmentIndex];

            if (action === 'copy' || action === 'cut') {
                // Copy/cut the specific item
                setClipboard({ type: action, data: specificItem, sourceCell: cellToUpdate, sourceIndex: equipmentIndex });
            } else if (action === 'delete') {
                // Delete the specific item from the array
                const newAssignment = cellData.assignment.filter((_, idx) => idx !== equipmentIndex);

                // If only one item remains, convert back to single object; if none remain, set to null
                const finalAssignment = newAssignment.length === 1 ? newAssignment[0] : newAssignment.length === 0 ? null : newAssignment;

                // Update state immediately
                const weekKey = formatDateForKey(getWeekStartDate(cellData.date));
                setAllocations(prev => {
                    const newAllocations = JSON.parse(JSON.stringify(prev));
                    if (newAllocations[weekKey] && newAllocations[weekKey][cellData.userId]) {
                        newAllocations[weekKey][cellData.userId].assignments[cellData.dayIndex] = finalAssignment;
                    }
                    return newAllocations;
                });

                // Update database
                try {
                    const allocationDateString = formatDateForKey(cellData.date);

                    // Delete all existing records for this date
                    const { error: deleteError } = await supabase
                        .from('equipment_calendar')
                        .delete()
                        .eq('user_id', cellData.userId)
                        .eq('allocation_date', allocationDateString);

                    if (deleteError) throw deleteError;

                    // Re-insert remaining items
                    if (newAssignment.length > 0) {
                        const recordsToInsert = newAssignment.map(item => ({
                            user_id: cellData.userId,
                            equipment_id: item.equipmentId || null,
                            allocation_date: allocationDateString,
                            comment: item.comment || null
                        }));

                        const { error: insertError } = await supabase
                            .from('equipment_calendar')
                            .insert(recordsToInsert);

                        if (insertError) throw insertError;
                    }
                } catch (err) {
                    console.error('Error deleting individual equipment:', err);
                    const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'delete', null);
                    if (isRLSError(err)) {
                        showPrivilegeError(errorMessage);
                    } else {
                        showErrorModal(errorMessage, 'Failed to Delete Equipment');
                    }
                }
            } else if (action === 'edit') {
                // Open modal to edit the specific item
                setSelectedCell({ ...cellToUpdate, editingItem: specificItem, editingIndex: equipmentIndex });
                setIsAllocationModalOpen(true);
            }
        } else {
            // Original behavior for whole cell operations
            if (action === 'copy' || action === 'cut') {
                setClipboard({ type: action, data: cellData.assignment, sourceCell: cellToUpdate });
            } else if (action === 'delete') {
                handleSaveAllocation(null, cellToUpdate);
            } else if (action === 'paste') {
                // Check if we're pasting a single item that was cut/copied from an array
                const isPastingSingleItem = !Array.isArray(clipboard.data);
                const targetHasContent = cellData.assignment !== null;

                if (isPastingSingleItem && targetHasContent) {
                    // Add to existing content instead of replacing
                    handleSaveAllocation(clipboard.data, cellToUpdate, true); // Use isSecondEquipment flag
                } else {
                    // Replace entire cell content
                    handleSaveAllocation(clipboard.data, cellToUpdate);
                }

                if (clipboard.type === 'cut') {
                    // If cut from an array with a specific index, remove only that item
                    if (clipboard.sourceIndex !== null && clipboard.sourceIndex !== undefined) {
                        const weekKey = formatDateForKey(getWeekStartDate(clipboard.sourceCell.date));
                        const dayIndex = (clipboard.sourceCell.date.getDay() + 1) % 7;
                        const sourceAssignment = allocations[weekKey]?.[clipboard.sourceCell.userId]?.assignments[dayIndex];

                        if (Array.isArray(sourceAssignment)) {
                            const newAssignment = sourceAssignment.filter((_, idx) => idx !== clipboard.sourceIndex);
                            const finalAssignment = newAssignment.length === 1 ? newAssignment[0] : newAssignment.length === 0 ? null : newAssignment;

                            // Update state
                            setAllocations(prev => {
                                const newAllocations = JSON.parse(JSON.stringify(prev));
                                if (newAllocations[weekKey] && newAllocations[weekKey][clipboard.sourceCell.userId]) {
                                    newAllocations[weekKey][clipboard.sourceCell.userId].assignments[dayIndex] = finalAssignment;
                                }
                                return newAllocations;
                            });

                            // Update database
                            try {
                                const allocationDateString = formatDateForKey(clipboard.sourceCell.date);

                                // Delete all existing records for this date
                                await supabase
                                    .from('equipment_calendar')
                                    .delete()
                                    .eq('user_id', clipboard.sourceCell.userId)
                                    .eq('allocation_date', allocationDateString);

                                // Re-insert remaining items
                                if (newAssignment.length > 0) {
                                    const recordsToInsert = newAssignment.map(item => ({
                                        user_id: clipboard.sourceCell.userId,
                                        equipment_id: item.equipmentId || null,
                                        allocation_date: allocationDateString,
                                        comment: item.comment || null
                                    }));

                                    await supabase
                                        .from('equipment_calendar')
                                        .insert(recordsToInsert);
                                }
                            } catch (err) {
                                console.error('Error removing cut item from source:', err);
                            }
                        } else {
                            // Single item, delete entire cell
                            handleSaveAllocation(null, clipboard.sourceCell);
                        }
                    } else {
                        // Whole cell was cut, delete it
                        handleSaveAllocation(null, clipboard.sourceCell);
                    }
                    setClipboard({ type: null, data: null, sourceCell: null, sourceIndex: null });
                }
            } else if (action === 'allocate') {
                setSelectedCell(cellToUpdate);
                setIsAllocationModalOpen(true);
            } else if (action === 'addSecondEquipment') {
                setSelectedCell({ ...cellToUpdate, isSecondEquipment: true });
                setIsAllocationModalOpen(true);
            }
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

    // Helper function to check if equipment is assigned to user in equipment_assignments
    const isEquipmentAssignedToUser = (equipmentId, userId) => {
        if (!equipmentId || !userId) return false;
        return equipmentAssignments.some(
            assignment => assignment.equipment_id === equipmentId && assignment.user_id === userId
        );
    };

    // Color palette with high contrast colors for categories (avoiding red/green to prevent clashing with status icons)
    const categoryColorPalette = [
        '#3B82F6', // Blue
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#F97316', // Orange
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#6366F1', // Indigo
        '#0EA5E9', // Sky
        '#A855F7', // Violet
        '#EAB308', // Yellow
    ];

    // Get color for a category
    const getCategoryColor = useCallback((categoryName) => {
        if (!categoryName) return '#93C5FD'; // Light blue default

        // First, check if we have a custom colour from database
        if (customEquipmentColours[categoryName]) {
            return customEquipmentColours[categoryName];
        }

        // Check if category exists in equipmentCategories and has a color property
        const category = equipmentCategories.find(cat => cat.name === categoryName);

        if (category && category.color) {
            return category.color;
        }

        // If no color, assign one based on category name hash
        const hash = categoryName.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        const colorIndex = Math.abs(hash) % categoryColorPalette.length;
        return categoryColorPalette[colorIndex];
    }, [customEquipmentColours, equipmentCategories]);

    // Get background and text color classes for a category
    const getCategoryColorClasses = useCallback((categoryName) => {
        const color = getCategoryColor(categoryName);

        // Convert hex to RGB to determine if it's light or dark
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        const isDark = luminance < 0.5;
        const textColor = isDark ? 'text-white' : 'text-gray-900';

        return {
            backgroundColor: color,
            textColor
        };
    }, [getCategoryColor]);

    const handleAutoAssign = async () => {
        setIsAutoAssigning(true);
        setIsAutoAssignModalOpen(false);

        try {
            // Get all dates for the current week
            const weekDates = Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(currentWeekStart, i);
                return formatDateForKey(date);
            });

            // Step 1: Delete all equipment_calendar entries for the current week
            console.log('🗑️ Clearing equipment calendar for week:', weekDates);

            const { error: deleteError } = await supabase
                .from('equipment_calendar')
                .delete()
                .in('allocation_date', weekDates);

            if (deleteError) throw deleteError;

            // Step 2: Get all current equipment assignments (where returned_at is NULL)
            const { data: assignments, error: fetchError } = await supabase
                .from('equipment_assignments')
                .select('equipment_id, user_id')
                .is('returned_at', null);

            if (fetchError) throw fetchError;

            if (!assignments || assignments.length === 0) {
                console.log('ℹ️ No equipment assignments found');
                setIsAutoAssigning(false);
                return;
            }

            // Step 3: Create entries for all 7 days for each user with assigned equipment
            const recordsToInsert = [];

            assignments.forEach(assignment => {
                weekDates.forEach(dateString => {
                    recordsToInsert.push({
                        user_id: assignment.user_id,
                        equipment_id: assignment.equipment_id,
                        allocation_date: dateString,
                        comment: null
                    });
                });
            });

            console.log('✨ Auto-assigning equipment for', assignments.length, 'users across 7 days');
            console.log('📝 Total records to insert:', recordsToInsert.length);

            // Step 4: Insert all records
            if (recordsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('equipment_calendar')
                    .insert(recordsToInsert);

                if (insertError) throw insertError;

                console.log('✅ Auto-assign completed successfully');
            }

            // Refresh the allocations
            await getEquipmentAllocations();

        } catch (err) {
            console.error('Error auto-assigning equipment:', err);
            const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'auto-assign', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Auto-Assign Equipment');
            }
        } finally {
            setIsAutoAssigning(false);
        }
    };

    const handleClearAll = async () => {
        setIsClearing(true);
        setIsClearAllModalOpen(false);

        try {
            // Get all dates for the current week
            const weekDates = Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(currentWeekStart, i);
                return formatDateForKey(date);
            });

            console.log('🗑️ Clearing all equipment calendar entries for week:', weekDates);

            // Delete all equipment_calendar entries for the current week
            const { error: deleteError } = await supabase
                .from('equipment_calendar')
                .delete()
                .in('allocation_date', weekDates);

            if (deleteError) throw deleteError;

            console.log('✅ Calendar cleared successfully');

            // Refresh the allocations
            await getEquipmentAllocations();

        } catch (err) {
            console.error('Error clearing calendar:', err);
            const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'delete', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Clear Calendar');
            }
        } finally {
            setIsClearing(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        console.log('🎯 Drag end event:', { active: active?.id, over: over?.id });

        if (!over || !active) {
            console.log('❌ No over or active');
            return;
        }

        // Parse the draggable ID: "userId::dayIndex::equipmentIndex"
        const [sourceUserId, sourceDayIndex, sourceEquipmentIndex] = active.id.split('::');
        // Parse the droppable ID: "drop::userId::dayIndex"
        const [, targetUserId, targetDayIndex] = over.id.split('::');

        console.log('📍 Source:', { sourceUserId, sourceDayIndex, sourceEquipmentIndex });
        console.log('📍 Target:', { targetUserId, targetDayIndex });

        const sourceDayIndexNum = parseInt(sourceDayIndex);
        const targetDayIndexNum = parseInt(targetDayIndex);
        const sourceEquipmentIndexNum = parseInt(sourceEquipmentIndex);

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
            // Get the equipment being dragged
            const sourceAssignment = allocations[weekKey]?.[sourceUserId]?.assignments[sourceDayIndexNum];
            console.log('📦 Source assignment:', sourceAssignment);

            if (!sourceAssignment) {
                console.log('❌ No source assignment');
                return;
            }

            let draggedEquipment;
            if (Array.isArray(sourceAssignment)) {
                draggedEquipment = sourceAssignment[sourceEquipmentIndexNum];
            } else {
                draggedEquipment = sourceAssignment;
            }

            console.log('🎒 Dragged equipment:', draggedEquipment);

            if (!draggedEquipment) {
                console.log('❌ No dragged equipment');
                return;
            }

            const targetDateString = formatDateForKey(targetDate);
            const sourceDateString = formatDateForKey(sourceDate);

            console.log('📅 Date strings:', { targetDateString, sourceDateString });

            // Step 1: Add to target cell in database
            const recordToInsert = {
                user_id: targetUserId,
                equipment_id: draggedEquipment.equipmentId || null,
                allocation_date: targetDateString,
                comment: draggedEquipment.comment || null
            };

            console.log('➕ Inserting to target:', recordToInsert);

            const { error: insertError } = await supabase
                .from('equipment_calendar')
                .insert([recordToInsert]);

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw insertError;
            }

            console.log('✅ Insert successful');

            // Step 2: Remove from source cell in database
            console.log('🔍 Fetching source records...');
            const { data: sourceRecords, error: fetchError } = await supabase
                .from('equipment_calendar')
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
                const remainingItems = sourceAssignment.filter((_, idx) => idx !== sourceEquipmentIndexNum);

                console.log('📋 Remaining items:', remainingItems);

                // Delete all and re-insert remaining
                console.log('🗑️ Deleting all source records...');
                const { error: deleteError } = await supabase
                    .from('equipment_calendar')
                    .delete()
                    .eq('user_id', sourceUserId)
                    .eq('allocation_date', sourceDateString);

                if (deleteError) {
                    console.error('❌ Delete error:', deleteError);
                    throw deleteError;
                }

                console.log('✅ Delete successful');

                const recordsToInsert = remainingItems.map(item => ({
                    user_id: sourceUserId,
                    equipment_id: item.equipmentId || null,
                    allocation_date: sourceDateString,
                    comment: item.comment || null
                }));

                if (recordsToInsert.length > 0) {
                    console.log('➕ Re-inserting remaining items:', recordsToInsert);
                    const { error: reinsertError } = await supabase
                        .from('equipment_calendar')
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
                    .from('equipment_calendar')
                    .delete()
                    .eq('user_id', sourceUserId)
                    .eq('allocation_date', sourceDateString);

                if (deleteError) {
                    console.error('❌ Delete error:', deleteError);
                    throw deleteError;
                }

                console.log('✅ Delete successful');
            }

            // Step 3: Refresh allocations from database
            console.log('🔄 Refreshing allocations...');
            await getEquipmentAllocations(true);
            console.log('✅ Drag and drop complete!');

        } catch (err) {
            console.error('Error during drag and drop:', err);
            const errorMessage = handleSupabaseError(err, 'equipment_calendar', 'move', null);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Move Equipment');
            }
            // Refresh on error to ensure UI is in sync with database
            await getEquipmentAllocations(true);
        }
    };

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

    // Check for discrepancies between calendar and assignments for current week
    const checkDiscrepancies = async () => {
        setLoadingDiscrepancies(true);
        try {
            // Get all dates for the current week
            const weekDates = Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(currentWeekStart, i);
                return formatDateForKey(date);
            });

            // Get equipment calendar entries for the current week only
            const { data: calendarData, error: calendarError } = await supabase
                .from('equipment_calendar')
                .select('user_id, equipment_id, allocation_date')
                .in('allocation_date', weekDates);

            if (calendarError) throw calendarError;

            // Get all current equipment assignments (where returned_at is NULL)
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('equipment_assignments')
                .select('user_id, equipment_id')
                .is('returned_at', null);

            if (assignmentsError) throw assignmentsError;

            // Find calendar entries where equipment is assigned but not in assignments table
            const discrepancies = [];
            const seenUserEquipment = new Set();

            calendarData?.forEach(calEntry => {
                if (!calEntry.equipment_id) return; // Skip entries without equipment

                const key = `${calEntry.user_id}-${calEntry.equipment_id}`;
                if (seenUserEquipment.has(key)) return; // Already processed this user-equipment combo
                seenUserEquipment.add(key);

                // Check if this assignment exists in equipment_assignments
                const hasAssignment = assignmentsData?.some(
                    assignment =>
                        assignment.user_id === calEntry.user_id &&
                        assignment.equipment_id === calEntry.equipment_id
                );

                if (!hasAssignment) {
                    const user = allUsers.find(u => u.id === calEntry.user_id);
                    const equipmentItem = equipment.find(e => e.id === calEntry.equipment_id);

                    discrepancies.push({
                        userId: calEntry.user_id,
                        userName: user?.name || 'Unknown User',
                        equipmentId: calEntry.equipment_id,
                        equipmentName: equipmentItem?.name || 'Unknown Equipment'
                    });
                }
            });

            setDiscrepanciesData(discrepancies);
            setShowDiscrepancies(true);
            setCopied(false);
        } catch (err) {
            console.error('Error checking discrepancies:', err);
            showErrorModal('Failed to check discrepancies: ' + err.message, 'Error');
        } finally {
            setLoadingDiscrepancies(false);
        }
    };

    // Copy discrepancies to clipboard
    const copyDiscrepanciesToClipboard = async () => {
        try {
            const weekString = `Week ${fiscalWeek}: ${formatDateForDisplay(weekDates[0])} - ${formatDateForDisplay(weekDates[6])}, ${currentWeekStart.getFullYear()}`;

            let text = 'Calendar vs Assignment Discrepancies\n';
            text += '=====================================\n';
            text += `${weekString}\n\n`;
            text += `Found ${discrepanciesData.length} discrepanc${discrepanciesData.length === 1 ? 'y' : 'ies'}:\n\n`;

            discrepanciesData.forEach((item, index) => {
                text += `${index + 1}. ${item.userName}\n`;
                text += `   Equipment: ${item.equipmentName}\n`;
                text += `   Status: In calendar but not in equipment assignments\n\n`;
            });

            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
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
                    {canAllocateResources && (
                        <Button
                            onClick={() => setIsAutoAssignModalOpen(true)}
                            disabled={isAutoAssigning}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isAutoAssigning ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Auto-Assigning...
                                </>
                            ) : (
                                <>
                                    <Zap size={16} className="mr-2" />Auto Assign
                                </>
                            )}
                        </Button>
                    )}
                    {isEditorOrAbove && (
                        <Button
                            onClick={() => setIsClearAllModalOpen(true)}
                            disabled={isClearing}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isClearing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Clearing...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} className="mr-2" />Clear All
                                </>
                            )}
                        </Button>
                    )}
                    {can('SHOW_CHECK_DISCREPANCIES_BUTTON') && (
                        <Button
                            onClick={checkDiscrepancies}
                            disabled={loadingDiscrepancies}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                            {loadingDiscrepancies ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    Check Discrepancies
                                </>
                            )}
                        </Button>
                    )}
                    {can('SHOW_EXPORT_EQUIPMENT_CALENDAR_IMAGE') && (
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
                    )}
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
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
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
                    <tbody className="divide-y-4 divide-gray-300 dark:divide-gray-600">
                        {displayedUsers.map(user => (
                            <tr key={user.id} className="border-spacing-2">
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
                                                        const isAssignedToUser = eq.equipmentId && isEquipmentAssignedToUser(eq.equipmentId, user.id);
                                                        const hasEquipmentNotAssigned = eq.equipmentId && !isEquipmentAssignedToUser(eq.equipmentId, user.id);
                                                        const categoryColors = equipmentItem ? getCategoryColorClasses(equipmentItem.category) : { backgroundColor: '#93C5FD', textColor: 'text-gray-900' };

                                                        return (
                                                            <DraggableEquipmentItem key={index} id={`${user.id}::${dayIndex}::${index}`} disabled={!isDesktop || !canAllocateResources}>
                                                                <div
                                                                    className={`p-2 rounded-md flex flex-col items-center justify-center text-center flex-1 relative ${categoryColors.textColor} ${canAllocateResources ? 'cursor-pointer' : ''}`}
                                                                    style={{ backgroundColor: categoryColors.backgroundColor }}
                                                                    onClick={(e) => {
                                                                        if (!canAllocateResources) return;
                                                                        e.stopPropagation();
                                                                        setSelectedCell({
                                                                            userId: user.id,
                                                                            date,
                                                                            dayIndex,
                                                                            editingItem: eq,
                                                                            editingIndex: index
                                                                        });
                                                                        setIsAllocationModalOpen(true);
                                                                    }}
                                                                    onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment, index) : undefined}
                                                                >
                                                                    {isAssignedToUser && (
                                                                        <CheckCircle
                                                                            size={16}
                                                                            className="absolute top-1 left-1 text-green-600 dark:text-green-400 fill-white dark:fill-gray-800"
                                                                        />
                                                                    )}
                                                                    {hasEquipmentNotAssigned && (
                                                                        <XCircle
                                                                            size={16}
                                                                            className="absolute top-1 left-1 text-red-600 dark:text-red-400 fill-white dark:fill-gray-800"
                                                                        />
                                                                    )}
                                                                    {eq.equipmentId && (
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <Package size={16} />
                                                                            <p className="font-bold text-sm truncate">{equipmentItem?.name || 'Unknown'}</p>
                                                                        </div>
                                                                    )}
                                                                    {eq.comment && <p className={`text-sm font-bold ${eq.equipmentId ? 'truncate mt-1' : 'break-words'}`} title={eq.comment}>{eq.comment}</p>}
                                                                    {!isDesktop && canAllocateResources && (
                                                                        <button
                                                                            onClick={(e) => handleActionClick(e, user.id, dayIndex, assignment, index)}
                                                                            className="absolute top-1 right-1 p-0.5 rounded-full bg-gray-300/30 dark:bg-gray-900/30 hover:bg-gray-400/50 dark:hover:bg-gray-700/50"
                                                                        >
                                                                            <MoreVertical size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </DraggableEquipmentItem>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else {
                                            const equipmentItem = equipment.find(e => e.id === assignment.equipmentId);
                                            const isNoEquipmentRequired = assignment.comment === 'No Equipment Required' || assignment.comment?.startsWith('No Equipment Required:');
                                            const isAssignedToUser = assignment.equipmentId && isEquipmentAssignedToUser(assignment.equipmentId, user.id);
                                            const hasEquipmentNotAssigned = assignment.equipmentId && !isEquipmentAssignedToUser(assignment.equipmentId, user.id);
                                            const categoryColors = equipmentItem ? getCategoryColorClasses(equipmentItem.category) : { backgroundColor: '#93C5FD', textColor: 'text-gray-900' };

                                            cellContent = (
                                                <DraggableEquipmentItem id={`${user.id}::${dayIndex}::0`} disabled={!isDesktop || !canAllocateResources}>
                                                    <div
                                                        className={`p-2 rounded-md h-full flex flex-col items-center justify-center text-center relative ${categoryColors.textColor} ${canAllocateResources ? 'cursor-pointer' : ''}`}
                                                        style={{ backgroundColor: categoryColors.backgroundColor }}
                                                        onClick={(e) => {
                                                            if (!canAllocateResources) return;
                                                            e.stopPropagation();
                                                            setSelectedCell({ userId: user.id, date, dayIndex });
                                                            setIsAllocationModalOpen(true);
                                                        }}
                                                        onContextMenu={isDesktop ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                    >
                                                        {isAssignedToUser && (
                                                            <CheckCircle
                                                                size={18}
                                                                className="absolute top-1 left-1 text-green-600 dark:text-green-400 fill-white dark:fill-gray-800"
                                                            />
                                                        )}
                                                        {hasEquipmentNotAssigned && (
                                                            <XCircle
                                                                size={18}
                                                                className="absolute top-1 left-1 text-red-600 dark:text-red-400 fill-white dark:fill-gray-800"
                                                            />
                                                        )}
                                                        {assignment.equipmentId && (
                                                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                                                <Package size={18} />
                                                                <p className="font-bold text-base whitespace-nowrap overflow-ellipsis overflow-hidden">{equipmentItem?.name || 'Unknown'}</p>
                                                            </div>
                                                        )}
                                                        {assignment.comment && (
                                                            <p className={`text-sm font-bold ${assignment.equipmentId ? 'whitespace-nowrap overflow-ellipsis overflow-hidden' : 'break-words'}`} title={assignment.comment}>{assignment.comment}</p>
                                                        )}
                                                    </div>
                                                </DraggableEquipmentItem>
                                            );
                                        }
                                    }

                                    const showContextMenuButton = canAllocateResources || assignment;

                                    return (
                                        <td key={date.toISOString()} className="p-1 align-top h-32 relative group">
                                            <div
                                                onClick={() => handleCellClick(user.id, date, dayIndex)}
                                                onContextMenu={isDesktop && showContextMenuButton ? (e) => handleActionClick(e, user.id, dayIndex, assignment) : undefined}
                                                className={`w-full h-full text-left rounded-md ${canAllocateResources ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                <DroppableCell id={`drop::${user.id}::${dayIndex}`} disabled={!isDesktop || !canAllocateResources}>
                                                    {cellContent}
                                                </DroppableCell>
                                            </div>
                                            {!isDesktop && showContextMenuButton && (
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
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={(allocationData) => {
                        if (selectedCell.editingItem && selectedCell.editingIndex !== undefined) {
                            // Handle editing a specific item in an array
                            handleEditArrayItem(allocationData, selectedCell);
                        } else {
                            handleSaveAllocation(allocationData, selectedCell, selectedCell.isSecondEquipment);
                        }
                    }}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={selectedCell.editingItem || currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                    equipment={equipment}
                    isSecondEquipment={selectedCell.isSecondEquipment}
                    isEditingArrayItem={!!selectedCell.editingItem}
                />
            )}
            <ShowHideUsersModal
                isOpen={isManageUsersModalOpen}
                onClose={() => setIsManageUsersModalOpen(false)}
                onSave={handleUpdateVisibleUsers}
                allUsers={allUsers}
                visibleUserIds={visibleUserIds}
            />
            <ConfirmAutoAssignModal
                isOpen={isAutoAssignModalOpen}
                onClose={() => setIsAutoAssignModalOpen(false)}
                onConfirm={handleAutoAssign}
                weekStart={currentWeekStart}
                weekEnd={weekDates[6]}
                fiscalWeek={fiscalWeek}
            />
            <ConfirmClearAllModal
                isOpen={isClearAllModalOpen}
                onClose={() => setIsClearAllModalOpen(false)}
                onConfirm={handleClearAll}
                weekStart={currentWeekStart}
                weekEnd={weekDates[6]}
                fiscalWeek={fiscalWeek}
            />

            {/* Discrepancies Modal */}
            {showDiscrepancies && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar vs Assignment Discrepancies</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Week {fiscalWeek}: {formatDateForDisplay(weekDates[0])} - {formatDateForDisplay(weekDates[6])}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDiscrepancies(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto p-6">
                                {discrepanciesData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                        <div className="text-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-green-500">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            <h3 className="text-lg font-medium mb-2">No Discrepancies Found!</h3>
                                            <p>All equipment in this week's calendar has matching assignments in the equipment register.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                <strong>{discrepanciesData.length}</strong> user{discrepanciesData.length === 1 ? '' : 's'} {discrepanciesData.length === 1 ? 'has' : 'have'} equipment assigned in the calendar but not in the equipment register for this week.
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {discrepanciesData.map((item, index) => (
                                                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 mt-1">
                                                            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                                {item.userName}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Has <span className="font-medium text-gray-900 dark:text-white">{item.equipmentName}</span> in calendar but not in equipment assignments
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            {discrepanciesData.length > 0 && (
                                <button
                                    onClick={copyDiscrepanciesToClipboard}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                            Copy to Clipboard
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => setShowDiscrepancies(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    const isArrayItemOperation = cellData.equipmentIndex !== null && cellData.equipmentIndex !== undefined;
    const isMultiItemTile = Array.isArray(cellData.assignment);

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
                            {isArrayItemOperation && (
                                <button onClick={() => onAction('edit')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>Edit
                                </button>
                            )}
                            {/* Only show copy/cut/delete for single items or individual array items, not for whole multi-item tiles */}
                            {!isMultiItemTile || isArrayItemOperation ? (
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
                                    <button onClick={() => onAction('delete')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={14} className="mr-2" />Delete</button>
                                </>
                            ) : null}
                            {clipboard.data && !isArrayItemOperation && (
                                <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2" />Paste</button>
                            )}
                            {canAddMoreEquipment && !isArrayItemOperation && (
                                <button onClick={() => onAction('addSecondEquipment')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2" />Add More Equipment</button>
                            )}
                        </>
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

const ConfirmAutoAssignModal = ({ isOpen, onClose, onConfirm, weekStart, weekEnd, fiscalWeek }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Auto-Assign">
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Warning</h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                This action will <strong>clear all equipment assignments</strong> for the entire week and replace them with assignments based on the current equipment assignments from the Equipment page.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Week Details:</h4>
                        <ul className="text-sm space-y-1">
                            <li><strong>Week:</strong> {fiscalWeek}</li>
                            <li><strong>Date Range:</strong> {formatDateForDisplay(weekStart)} - {formatDateForDisplay(weekEnd)}, {weekStart.getFullYear()}</li>
                        </ul>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>The auto-assign feature will:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Delete all current equipment assignments for this week</li>
                            <li>Assign equipment to users for all 7 days based on their current equipment assignments</li>
                            <li>Only assign equipment to users who have active equipment assignments</li>
                        </ul>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Are you sure you want to proceed?
                    </p>
                </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={onConfirm} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Zap size={16} className="mr-2" />Confirm Auto-Assign
                </Button>
            </div>
        </Modal>
    );
};

const ConfirmClearAllModal = ({ isOpen, onClose, onConfirm, weekStart, weekEnd, fiscalWeek }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Clear All">
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Danger</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                This action will <strong>permanently delete all equipment assignments</strong> for the entire week. This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Week Details:</h4>
                        <ul className="text-sm space-y-1">
                            <li><strong>Week:</strong> {fiscalWeek}</li>
                            <li><strong>Date Range:</strong> {formatDateForDisplay(weekStart)} - {formatDateForDisplay(weekEnd)}, {weekStart.getFullYear()}</li>
                        </ul>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>This will:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Delete all equipment assignments for all staff members</li>
                            <li>Clear all equipment entries for all 7 days of this week</li>
                            <li>Remove all comments and notes associated with these assignments</li>
                        </ul>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Are you absolutely sure you want to clear the entire week?
                    </p>
                </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 size={16} className="mr-2" />Confirm Clear All
                </Button>
            </div>
        </Modal>
    );
};

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, equipment, isSecondEquipment = false, isEditingArrayItem = false }) => {
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

    const modalTitle = isEditingArrayItem ? "Edit Equipment" : (isSecondEquipment ? "Assign More Equipment" : "Assign Equipment");

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
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
                {!isEditingArrayItem && (
                    <Button variant="danger" onClick={handleClear}>Clear Assignment</Button>
                )}
                {isEditingArrayItem && <div></div>}
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </Modal>
    );
};

export default EquipmentCalendarPage;
