import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Select, ConfirmationModal } from '../components/ui';
import { Car, Plus, Search, Calendar, FileText, Filter, Loader2, Trash2, Edit, Download, ChevronRight, ArrowLeft, Wand2, RotateCcw } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateXlsx } from '../utils/xlsxGenerator';

const VehicleMileagePage = () => {
    const { user } = useAuth();
    const { can } = usePermissions();
    const [vehicles, setVehicles] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [usersList, setUsersList] = useState([]); // Combined list of real and dummy users
    const [allLogs, setAllLogs] = useState([]);
    const [monthlyLogStatuses, setMonthlyLogStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View state
    const [viewMode, setViewMode] = useState('vehicle_list'); // 'vehicle_list', 'summary', 'detail'
    const [selectedMonthGroup, setSelectedMonthGroup] = useState(null); // { vehicleId, monthKey, monthLabel, vehicleName, logs }

    // Filter state
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState('all');
    const [myVehiclesFilter, setMyVehiclesFilter] = useState(false);
    
    // Multi-select filter states
    const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // Modal states for Journey operations
    const [editingJourney, setEditingLog] = useState(null);
    const [journeyToDelete, setLogToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [showCreateMonthModal, setShowCreateMonthModal] = useState(false);
    const [showExportWizard, setShowExportWizard] = useState(false);
    
    // Manage Mode state
    const [isManageMode, setIsManageMode] = useState(false);
    const [monthToDelete, setMonthToDelete] = useState(null);
    const [isDeleteMonthModalOpen, setIsDeleteMonthModalOpen] = useState(false);

    // Form data for adding a journey
    const [journeyForm, setJourneyForm] = useState({
        date: new Date().toISOString().split('T')[0],
        purpose: '',
        start_location: '',
        end_location: '',
        start_mileage: '',
        end_mileage: '',
        hasReturnTrip: false,
        return_start_location: '',
        return_end_location: '',
        return_start_mileage: '',
        return_end_mileage: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [journeyOptions, setJourneyOptions] = useState([]);

    // Fetch journey dropdown options
    const fetchJourneyOptions = useCallback(async () => {
        try {
            // First get the category ID for 'Journey'
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .ilike('name', 'journey')
                .single();

            if (categoryError || !categoryData) {
                console.log('Journey category not found');
                return;
            }

            // Then fetch items for this category
            const { data: itemsData, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('display_text')
                .eq('category_id', categoryData.id)
                .eq('is_active', true)
                .order('sort_order');

            if (itemsError) throw itemsError;
            
            setJourneyOptions((itemsData || []).map(item => item.display_text).filter(Boolean));
        } catch (err) {
            console.error('Error fetching journey options:', err);
        }
    }, []);

    // Fetch monthly log statuses
    const fetchMonthlyLogStatuses = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicle_monthly_logs')
                .select('*');
            
            if (error) throw error;
            setMonthlyLogStatuses(data || []);
        } catch (err) {
            console.error('Error fetching monthly log statuses:', err);
        }
    }, []);

    // Fetch vehicles, users, and assignments
    const fetchVehicles = useCallback(async () => {
        try {
            // 1. Fetch Vehicles
            const { data: vehicleData, error: vehicleError } = await supabase
                .from('vehicles')
                .select('id, name, serial_number')
                .order('name');
            
            if (vehicleError) throw vehicleError;
            setVehicles(vehicleData || []);

            // 2. Fetch Assignments (raw)
            const { data: assignmentData, error: assignmentError } = await supabase
                .from('vehicle_assignments')
                .select('vehicle_id, user_id')
                .is('returned_at', null);

            if (assignmentError) throw assignmentError;
            setAssignments(assignmentData || []);

            // 3. Fetch Users (Real + Dummy)
            const { data: realUsers, error: realUsersError } = await supabase
                .from('users')
                .select('id, name')
                .is('deleted_at', null);
            
            if (realUsersError) throw realUsersError;

            const { data: dummyUsers, error: dummyUsersError } = await supabase
                .from('dummy_users')
                .select('id, name')
                .eq('is_active', true)
                .is('deleted_at', null);

            if (dummyUsersError) throw dummyUsersError;

            // Combine and index for fast lookup
            const combinedUsers = [
                ...(realUsers || []),
                ...(dummyUsers || [])
            ];
            setUsersList(combinedUsers);

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, []);

    // Fetch ALL logs (we need them to group by month)
    // In a real app with huge data, we might filter by year in the query
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('vehicle_mileage_logs')
                .select(`
                    *,
                    vehicles:vehicle_id (name, serial_number),
                    users:user_id (name)
                `)
                .order('date', { ascending: false }); // Newest logs first

            // Apply year filter at DB level for performance
            if (filterYear !== 'all') {
                const startOfYear = `${filterYear}-01-01`;
                const endOfYear = `${filterYear}-12-31`;
                query = query.gte('date', startOfYear).lte('date', endOfYear);
            }

            if (filterVehicle !== 'all') {
                query = query.eq('vehicle_id', filterVehicle);
            }

            const { data, error } = await query;
            if (error) throw error;
            setAllLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }, [filterVehicle, filterYear]);

    useEffect(() => {
        fetchVehicles();
        fetchLogs();
        fetchJourneyOptions();
        fetchMonthlyLogStatuses();
    }, [fetchVehicles, fetchLogs, fetchJourneyOptions, fetchMonthlyLogStatuses]);

    // Helper to calculate the deadline (first Monday of the next month)
    const getDeadline = (month, year) => {
        const nextMonth = month === 12 ? 0 : month; // 0-indexed for Date (Jan is 0)
        const nextYear = month === 12 ? year + 1 : year;
        
        let date = new Date(nextYear, nextMonth, 1);
        
        // Find first Monday
        while (date.getDay() !== 1) {
            date.setDate(date.getDate() + 1);
        }
        
        // Deadline is end of that day
        date.setHours(23, 59, 59, 999); 
        return date;
    };

    // Helper to check for overdue logs
    const getOverdueStatus = (vehicleId) => {
        const vehicleLogs = allLogs.filter(l => l.vehicle_id === vehicleId);
        
        if (vehicleLogs.length === 0) return [];

        // Find the date of the very first log for this vehicle
        const firstLogDate = vehicleLogs.reduce((earliest, log) => {
            const date = new Date(log.date);
            return date < earliest ? date : earliest;
        }, new Date());

        const overdueMonths = [];
        const today = new Date();
        
        // Start checking from the month of the first log
        // Iterate month by month until today
        let currentCheckDate = new Date(firstLogDate.getFullYear(), firstLogDate.getMonth(), 1);
        
        // Loop until we reach the current month (we don't check current month as it's not overdue yet)
        while (currentCheckDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
            const month = currentCheckDate.getMonth() + 1;
            const year = currentCheckDate.getFullYear();
            
            const deadline = getDeadline(month, year);
            
            // If deadline has passed
            if (today > deadline) {
                // Check status
                const status = getMonthStatus(vehicleId, `${year}-${String(month).padStart(2, '0')}`);
                if (status !== 'submitted') {
                    // Format month name for display
                    const monthName = currentCheckDate.toLocaleDateString('default', { month: 'short' });
                    overdueMonths.push(`${monthName} '${year.toString().slice(2)}`);
                }
            }
            
            // Move to next month
            currentCheckDate.setMonth(currentCheckDate.getMonth() + 1);
        }

        return overdueMonths;
    };

    // Helper to get status for a specific month
    const getMonthStatus = (vehicleId, monthKey) => {
        const [year, month] = monthKey.split('-');
        const log = monthlyLogStatuses.find(l => 
            l.vehicle_id === vehicleId && 
            l.year === parseInt(year) && 
            l.month === parseInt(month)
        );
        return log?.status || 'draft';
    };

    // Helper to get last submitted month for a vehicle
    const getLastSubmittedMonth = (vehicleId) => {
        const submittedLogs = monthlyLogStatuses
            .filter(l => l.vehicle_id === vehicleId && l.status === 'submitted')
            .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
        
        if (submittedLogs.length === 0) return 'Never';
        
        const lastLog = submittedLogs[0];
        const date = new Date(lastLog.year, lastLog.month - 1);
        return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
    };

    // Group logs by Month + Vehicle
    const monthlyGroups = useMemo(() => {
        const groups = {};
        
        allLogs.forEach(log => {
            const date = new Date(log.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            const groupKey = `${log.vehicle_id}_${monthKey}`;
            
            // Check month filter
            if (filterMonth !== 'all') {
                const logMonth = String(date.getMonth() + 1);
                if (logMonth !== filterMonth) return;
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey,
                    vehicleId: log.vehicle_id,
                    vehicleName: log.vehicles?.name || 'Unknown',
                    serialNumber: log.vehicles?.serial_number || '',
                    monthKey: monthKey,
                    monthLabel: date.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                    logs: [],
                    totalMiles: 0,
                    tripCount: 0,
                    status: getMonthStatus(log.vehicle_id, monthKey)
                };
            }
            
            groups[groupKey].logs.push(log);
            groups[groupKey].totalMiles += (log.end_mileage - log.start_mileage);
            groups[groupKey].tripCount += 1;
        });

        return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }, [allLogs, filterMonth]);

    const handleSelectVehicle = (vehicleId) => {
        setFilterVehicle(vehicleId);
        setViewMode('summary');
    };

    const handleBackToVehicles = () => {
        setFilterVehicle('all');
        setViewMode('vehicle_list');
    };

    // Handle opening a month detail
    const handleOpenMonth = (group) => {
        setSelectedMonthGroup(group);
        
        // Reset form for this context
        // Try to auto-find last end mileage for this month or previous month?
        // For simplicity, just reset. 
        // Improvement: We could find the latest log in this group and use its end_mileage.
        const sortedLogs = [...group.logs].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastLog = sortedLogs[0];
        
        setJourneyForm({
            date: lastLog ? lastLog.date : `${group.monthKey}-01`, // Default to last log date or 1st of month
            purpose: '',
            start_location: '',
            end_location: '',
            start_mileage: lastLog ? lastLog.end_mileage : '', // Suggest continuation
            end_mileage: '',
        });
        setFormErrors({});
        setViewMode('detail');
    };

    const handleCloseMonth = () => {
        setViewMode('summary');
        setSelectedMonthGroup(null);
        setEditingLog(null);
    };

    // Helper functions for filters
    const handleVehicleToggle = (id) => {
        setSelectedVehicleIds(prev => 
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const handleUserToggle = (id) => {
        setSelectedUserIds(prev => 
            prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
        );
    };

    const handleSelectAllVehicles = () => {
        if (selectedVehicleIds.length === vehicles.length) {
            setSelectedVehicleIds([]);
        } else {
            setSelectedVehicleIds(vehicles.map(v => v.id));
        }
    };

    const handleSelectAllUsers = () => {
        if (selectedUserIds.length === usersList.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(usersList.map(u => u.id));
        }
    };

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.filter-dropdown')) {
                setShowVehicleDropdown(false);
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Journey Form Handlers
    const handleJourneyInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        setJourneyForm(prev => {
            const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
            
            // Auto-fill return fields if they are empty or matching the "logic" pattern
            if (type !== 'checkbox') {
                if (name === 'end_location') {
                    // Outbound Dest -> Return Origin
                    newState.return_start_location = value;
                }
                if (name === 'start_location') {
                    // Outbound Origin -> Return Dest
                    newState.return_end_location = value;
                }
                if (name === 'end_mileage') {
                    // Outbound End Mile -> Return Start Mile
                    newState.return_start_mileage = value;
                }
            }
            
            // Initialize return fields when checkbox is first checked
            if (name === 'hasReturnTrip' && checked) {
                if (!newState.return_start_location) newState.return_start_location = newState.end_location;
                if (!newState.return_end_location) newState.return_end_location = newState.start_location;
                if (!newState.return_start_mileage) newState.return_start_mileage = newState.end_mileage;
            }

            return newState;
        });

        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateJourneyForm = () => {
        const errors = {};
        if (!journeyForm.date) errors.date = 'Date is required';
        if (!journeyForm.purpose) errors.purpose = 'Purpose is required';
        if (!journeyForm.start_location) errors.start_location = 'From is required';
        if (!journeyForm.end_location) errors.end_location = 'To is required';
        if (!journeyForm.start_mileage) errors.start_mileage = 'Start mileage is required';
        if (!journeyForm.end_mileage) errors.end_mileage = 'End mileage is required';
        
        if (Number(journeyForm.end_mileage) < Number(journeyForm.start_mileage)) {
            errors.end_mileage = 'End mileage cannot be less than start mileage';
        }

        // Validate Return Trip
        if (journeyForm.hasReturnTrip) {
            if (!journeyForm.return_start_location) errors.return_start_location = 'Return From is required';
            if (!journeyForm.return_end_location) errors.return_end_location = 'Return To is required';
            if (!journeyForm.return_start_mileage) errors.return_start_mileage = 'Return Start Mile is required';
            if (!journeyForm.return_end_mileage) errors.return_end_mileage = 'Return End Mile is required';

            if (Number(journeyForm.return_end_mileage) < Number(journeyForm.return_start_mileage)) {
                errors.return_end_mileage = 'End mile < Start mile';
            }
            if (Number(journeyForm.return_start_mileage) < Number(journeyForm.end_mileage)) {
                errors.return_start_mileage = 'Return Start < Outbound End';
            }
        }

        // Ensure date matches the selected month context
        if (selectedMonthGroup) {
            const formDate = new Date(journeyForm.date);
            const formMonthKey = `${formDate.getFullYear()}-${String(formDate.getMonth() + 1).padStart(2, '0')}`;
            if (formMonthKey !== selectedMonthGroup.monthKey) {
                errors.date = `Date must be within ${selectedMonthGroup.monthLabel}`;
            }
            
            // Check for future dates
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison
            const inputDate = new Date(journeyForm.date);
            inputDate.setHours(0, 0, 0, 0);
            
            if (inputDate > today) {
                errors.date = "Cannot log journeys for future dates";
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveJourney = async (e) => {
        e.preventDefault();
        if (!validateJourneyForm()) return;

        setSaving(true);
        try {
            const dataToSave = {
                date: journeyForm.date,
                purpose: journeyForm.purpose,
                start_location: journeyForm.start_location,
                end_location: journeyForm.end_location,
                start_mileage: journeyForm.start_mileage,
                end_mileage: journeyForm.end_mileage,
                vehicle_id: selectedMonthGroup.vehicleId,
                user_id: user.id,
            };

            if (editingJourney) {
                const { error } = await supabase
                    .from('vehicle_mileage_logs')
                    .update(dataToSave)
                    .eq('id', editingJourney.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vehicle_mileage_logs')
                    .insert([dataToSave]);
                if (error) throw error;

                // Create Return Trip
                if (journeyForm.hasReturnTrip) {
                    const returnTripData = {
                        date: journeyForm.date,
                        purpose: `${journeyForm.purpose} (Return)`,
                        start_location: journeyForm.return_start_location,
                        end_location: journeyForm.return_end_location,
                        start_mileage: journeyForm.return_start_mileage,
                        end_mileage: journeyForm.return_end_mileage,
                        vehicle_id: selectedMonthGroup.vehicleId,
                        user_id: user.id,
                    };

                    const { error: returnError } = await supabase
                        .from('vehicle_mileage_logs')
                        .insert([returnTripData]);
                    if (returnError) throw returnError;
                }
            }

            // Refresh data
            await fetchLogs(); // This will refresh allLogs
            
            // Quick fix: Reset form
            setEditingLog(null);
            
            // Auto-advance start mileage
            const lastEndMileage = journeyForm.hasReturnTrip 
                ? journeyForm.return_end_mileage
                : journeyForm.end_mileage;

            setJourneyForm(prev => ({
                ...prev,
                purpose: '',
                start_location: journeyForm.hasReturnTrip ? journeyForm.return_end_location : prev.end_location,
                end_location: '',
                start_mileage: lastEndMileage, 
                end_mileage: '',
                hasReturnTrip: false, // Reset toggle
                return_start_location: '',
                return_end_location: '',
                return_start_mileage: '',
                return_end_mileage: '',
            }));

        } catch (err) {
            console.error('Error saving journey:', err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Effect to update selectedMonthGroup when allLogs changes (so the detail view stays in sync)
    useEffect(() => {
        if (viewMode === 'detail' && selectedMonthGroup) {
            const updatedGroup = monthlyGroups.find(g => g.key === selectedMonthGroup.key);
            if (updatedGroup) {
                setSelectedMonthGroup(updatedGroup);
            }
        }
    }, [allLogs, monthlyGroups, viewMode]);


    const handleEditJourney = (log) => {
        setEditingLog(log);
        setJourneyForm({
            date: log.date,
            purpose: log.purpose,
            start_location: log.start_location,
            end_location: log.end_location,
            start_mileage: log.start_mileage,
            end_mileage: log.end_mileage,
        });
        // Scroll to form (optional)
    };

    const handleDeleteClick = (log) => {
        setLogToDelete(log);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            const { error } = await supabase
                .from('vehicle_mileage_logs')
                .delete()
                .eq('id', journeyToDelete.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setLogToDelete(null);
            fetchLogs();
        } catch (err) {
            console.error('Error deleting log:', err);
            alert('Failed to delete log');
        }
    };

    const handleCreateNewMonthLog = () => {
        setShowCreateMonthModal(true);
    };

    const confirmCreateMonth = (vehicleId, month, year) => {
        const v = vehicles.find(v => v.id === vehicleId);
        if (!v) return;

        const monthKey = `${year}-${String(month).padStart(2, '0')}`; // YYYY-MM
        const groupKey = `${v.id}_${monthKey}`;
        
        // Check if it already exists in the list
        const existing = monthlyGroups.find(g => g.key === groupKey);
        
        if (existing) {
            handleOpenMonth(existing);
        } else {
            // Create a virtual group
            const date = new Date(year, month - 1, 1);
            const newGroup = {
                key: groupKey,
                vehicleId: v.id,
                vehicleName: v.name,
                serialNumber: v.serial_number,
                monthKey: monthKey,
                monthLabel: date.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                logs: [],
                totalMiles: 0,
                tripCount: 0,
                status: getMonthStatus(v.id, monthKey)
            };
            handleOpenMonth(newGroup);
        }
        setShowCreateMonthModal(false);
    };
    const handleDeleteMonth = (group, e) => {
        e.stopPropagation(); // Prevent opening the month detail
        setMonthToDelete(group);
        setIsDeleteMonthModalOpen(true);
    };

    const confirmDeleteMonth = async () => {
        if (!monthToDelete) return;
        
        try {
            // Delete all logs for this vehicle in this month
            // Extract year and month from monthKey (YYYY-MM)
            const [year, month] = monthToDelete.monthKey.split('-');
            
            // Construct date range for the month
            const startDate = `${year}-${month}-01`;
            // Calculate end date (last day of month)
            const endDateObj = new Date(parseInt(year), parseInt(month), 0);
            const endDate = `${year}-${month}-${endDateObj.getDate()}`;

            const { error } = await supabase
                .from('vehicle_mileage_logs')
                .delete()
                .eq('vehicle_id', monthToDelete.vehicleId)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;

            setIsDeleteMonthModalOpen(false);
            setMonthToDelete(null);
            fetchLogs(); // Refresh the list
        } catch (err) {
            console.error('Error deleting monthly log:', err);
            alert('Failed to delete monthly log: ' + err.message);
        }
    };
    const exportMonthToPdf = (group) => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Monthly Mileage Log', 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Vehicle: ${group.vehicleName} (${group.serialNumber})`, 14, 32);
        doc.text(`Period: ${group.monthLabel}`, 14, 38);
        doc.text(`Total Miles: ${group.totalMiles.toLocaleString()}`, 14, 44);

        const tableColumn = ["Date", "Purpose", "From", "To", "Start", "End", "Miles"];
        const tableRows = [];

        const sortedLogs = [...group.logs].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedLogs.forEach(log => {
            const miles = log.end_mileage - log.start_mileage;
            const logData = [
                new Date(log.date).toLocaleDateString(),
                log.purpose,
                log.start_location,
                log.end_location,
                log.start_mileage,
                log.end_mileage,
                miles
            ];
            tableRows.push(logData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            headStyles: { fillColor: [249, 115, 22] }, // Orange 500
        });

        return doc;
    };

    const handleSubmitMonth = async (group) => {
        if (!confirm(`Are you sure you want to submit the log for ${group.monthLabel}? Once submitted, you cannot add or edit journeys for this month.`)) return;

        try {
            const [year, month] = group.monthKey.split('-');
            
            const { data, error } = await supabase
                .from('vehicle_monthly_logs')
                .upsert({
                    vehicle_id: group.vehicleId,
                    month: parseInt(month),
                    year: parseInt(year),
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    submitted_by: user.id
                }, { onConflict: 'vehicle_id, month, year' })
                .select();

            if (error) throw error;

            fetchMonthlyLogStatuses(); // Refresh statuses
            
            // If currently in detail view, update the selected group
            if (selectedMonthGroup && selectedMonthGroup.key === group.key) {
                setSelectedMonthGroup(prev => ({ ...prev, status: 'submitted' }));
            }

        } catch (err) {
            console.error('Error submitting month:', err);
            alert('Failed to submit monthly log: ' + err.message);
        }
    };

    const handleUnsubmitMonth = async (group) => {
        if (!confirm(`Are you sure you want to unsubmit the log for ${group.monthLabel}? This will allow editing again.`)) return;

        try {
            const [year, month] = group.monthKey.split('-');
            
            const { data, error } = await supabase
                .from('vehicle_monthly_logs')
                .update({
                    status: 'draft',
                    submitted_at: null,
                    submitted_by: null
                })
                .eq('vehicle_id', group.vehicleId)
                .eq('month', parseInt(month))
                .eq('year', parseInt(year))
                .select();

            if (error) throw error;

            fetchMonthlyLogStatuses(); // Refresh statuses
            
            // If currently in detail view, update the selected group
            if (selectedMonthGroup && selectedMonthGroup.key === group.key) {
                setSelectedMonthGroup(prev => ({ ...prev, status: 'draft' }));
            }

        } catch (err) {
            console.error('Error unsubmitting month:', err);
            alert('Failed to unsubmit monthly log: ' + err.message);
        }
    };

    const handleExportMonth = (group) => {
        const doc = exportMonthToPdf(group);
        doc.save(`Mileage_${group.vehicleName}_${group.monthKey}.pdf`);
    };

    const exportMonthToExcel = async (group) => {
        const sortedLogs = [...group.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const headers = ["Date", "Purpose", "From", "To", "Start", "End", "Miles"];
        const rows = sortedLogs.map(log => [
            new Date(log.date).toLocaleDateString(),
            log.purpose || '',
            log.start_location || '',
            log.end_location || '',
            log.start_mileage,
            log.end_mileage,
            log.end_mileage - log.start_mileage
        ]);

        const title = "Monthly Mileage Log";
        const metadata = [
            { label: "Vehicle:", value: `${group.vehicleName} (${group.serialNumber})` },
            { label: "Period:", value: group.monthLabel },
            { label: "Total Miles:", value: group.totalMiles.toLocaleString() }
        ];

        return await generateXlsx(headers, rows, 'Mileage Log', title, metadata);
    };

    const handleExportExcel = async (group) => {
        try {
            const blob = await exportMonthToExcel(group);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Mileage_${group.vehicleName}_${group.monthKey}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating Excel file:', error);
            alert('Failed to generate Excel file');
        }
    };

    // Calculate miles for the form display
    const currentFormMiles = journeyForm.end_mileage && journeyForm.start_mileage
        ? Math.max(0, journeyForm.end_mileage - journeyForm.start_mileage)
        : 0;

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-2 md:py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {viewMode === 'summary' && (
                            <button onClick={handleBackToVehicles} className="mr-2 p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        {viewMode === 'detail' && (
                            <button onClick={handleCloseMonth} className="mr-2 p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <Car className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                {viewMode === 'detail' ? (
                                    <>
                                        Mileage: {selectedMonthGroup?.monthLabel}
                                        <span className={`px-2 py-1 text-sm rounded-full ${
                                            selectedMonthGroup?.status === 'submitted' 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                        }`}>
                                            {selectedMonthGroup?.status === 'submitted' ? 'Submitted' : 'Draft'}
                                        </span>
                                    </>
                                ) : 
                                 viewMode === 'summary' ? `Logs: ${vehicles.find(v => v.id === filterVehicle)?.name || 'Vehicle'}` : 
                                 'Mileage Logs'}
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                {viewMode === 'detail' ? `${selectedMonthGroup?.vehicleName} (${selectedMonthGroup?.serialNumber})` : 
                                 viewMode === 'summary' ? 'Monthly vehicle usage summaries' :
                                 'Select a vehicle to view logs'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {viewMode === 'detail' && selectedMonthGroup?.status !== 'submitted' && can('SHOW_MILEAGE_SUBMIT_LOG') && (
                            <Button onClick={() => handleSubmitMonth(selectedMonthGroup)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <FileText className="w-4 h-4" /> Submit Log
                            </Button>
                        )}
                        {viewMode === 'detail' && selectedMonthGroup?.status === 'submitted' && can('SHOW_MILEAGE_SUBMIT_LOG') && (
                            <Button onClick={() => handleUnsubmitMonth(selectedMonthGroup)} variant="outline" className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20">
                                <RotateCcw className="w-4 h-4" /> Unsubmit Log
                            </Button>
                        )}
                        {viewMode === 'vehicle_list' && can('SHOW_MILEAGE_BULK_EXPORT') && (
                            <Button onClick={() => setShowExportWizard(true)} variant="outline" className="flex items-center gap-2">
                                <Wand2 className="w-4 h-4" /> Bulk Export
                            </Button>
                        )}
                        {viewMode === 'summary' && can('SHOW_MILEAGE_MANAGE_BUTTON') && (
                            <Button 
                                onClick={() => setIsManageMode(!isManageMode)} 
                                variant={isManageMode ? "primary" : "outline"}
                                className="flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" /> {isManageMode ? 'Done' : 'Manage'}
                            </Button>
                        )}
                        {viewMode === 'detail' && can('VIEW_VEHICLE_MILEAGE') && (
                            <>
                                <Button onClick={() => handleExportExcel(selectedMonthGroup)} variant="outline" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Export Excel
                                </Button>
                                <Button onClick={() => handleExportMonth(selectedMonthGroup)} variant="outline" className="flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Export PDF
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">

                {/* Vehicle List View */}
                {viewMode === 'vehicle_list' && (
                    <>
                        <div className="mb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                {/* Vehicle Filter */}
                                <div className="relative filter-dropdown w-full sm:w-64">
                                    <button
                                        onClick={() => {
                                            setShowVehicleDropdown(!showVehicleDropdown);
                                            setShowUserDropdown(false);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center text-sm"
                                    >
                                        <span className="truncate">
                                            {selectedVehicleIds.length === 0 
                                                ? 'All Vehicles' 
                                                : `${selectedVehicleIds.length} vehicle${selectedVehicleIds.length === 1 ? '' : 's'} selected`}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showVehicleDropdown ? 'rotate-90' : ''}`} />
                                    </button>
                                    {showVehicleDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            <div className="p-2">
                                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVehicleIds.length === vehicles.length && vehicles.length > 0}
                                                        onChange={handleSelectAllVehicles}
                                                        className="form-checkbox text-orange-500 rounded"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
                                                </label>
                                                {vehicles.map(v => (
                                                    <label key={v.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedVehicleIds.includes(v.id)}
                                                            onChange={() => handleVehicleToggle(v.id)}
                                                            className="form-checkbox text-orange-500 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{v.name} ({v.serial_number})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* User Filter */}
                                <div className="relative filter-dropdown w-full sm:w-64">
                                    <button
                                        onClick={() => {
                                            setShowUserDropdown(!showUserDropdown);
                                            setShowVehicleDropdown(false);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center text-sm"
                                    >
                                        <span className="truncate">
                                            {selectedUserIds.length === 0 
                                                ? 'All Users' 
                                                : `${selectedUserIds.length} user${selectedUserIds.length === 1 ? '' : 's'} selected`}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-90' : ''}`} />
                                    </button>
                                    {showUserDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            <div className="p-2">
                                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserIds.length === usersList.length && usersList.length > 0}
                                                        onChange={handleSelectAllUsers}
                                                        className="form-checkbox text-orange-500 rounded"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
                                                </label>
                                                {usersList
                                                    .filter(u => assignments.some(a => a.user_id === u.id)) // Only show users with assigned vehicles
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(u => (
                                                    <label key={u.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUserIds.includes(u.id)}
                                                            onChange={() => handleUserToggle(u.id)}
                                                            className="form-checkbox text-orange-500 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button 
                                variant={myVehiclesFilter ? "primary" : "outline"}
                                onClick={() => setMyVehiclesFilter(!myVehiclesFilter)}
                                className="w-full sm:w-auto flex items-center gap-2"
                            >
                                <Car className="w-4 h-4" />
                                {myVehiclesFilter ? "Show All Vehicles" : "My Vehicles"}
                            </Button>
                        </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-black dark:text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">Vehicle Name</th>
                                        <th className="px-6 py-3 font-bold">Registration</th>
                                        <th className="px-6 py-3 font-bold text-center">Current Mileage</th>
                                        <th className="px-6 py-3 font-bold">Assigned To</th>
                                        <th className="px-6 py-3 font-bold text-center">Monthly Logs</th>
                                        <th className="px-6 py-3 font-bold text-center">Total Journeys</th>
                                        <th className="px-6 py-3 font-bold text-center">Last Submitted</th>
                                        <th className="px-6 py-3 font-bold text-center">Overdue Status</th>
                                        <th className="px-6 py-3 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading vehicles...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : vehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No vehicles found.</td>
                                        </tr>
                                    ) : (
                                        vehicles.filter(vehicle => {
                                            // 1. Vehicle Multi-Select Filter
                                            if (selectedVehicleIds.length > 0 && !selectedVehicleIds.includes(vehicle.id)) {
                                                return false;
                                            }

                                            // Find assigned user for this vehicle
                                            const assignment = assignments.find(a => a.vehicle_id === vehicle.id);
                                            const assignedUserId = assignment?.user_id;

                                            // 2. User Multi-Select Filter
                                            if (selectedUserIds.length > 0) {
                                                if (!assignedUserId || !selectedUserIds.includes(assignedUserId)) {
                                                    return false;
                                                }
                                            }

                                            // 3. My Vehicles Filter (Quick Filter)
                                            if (myVehiclesFilter) {
                                                return assignedUserId === user.id;
                                            }

                                            return true;
                                        }).map(vehicle => {
                                            // Get logs for this vehicle
                                            const vehicleLogs = allLogs.filter(l => l.vehicle_id === vehicle.id);
                                            const journeysCount = vehicleLogs.length;
                                            
                                            // Calculate unique monthly logs (YYYY-MM)
                                            const months = new Set(vehicleLogs.map(l => {
                                                const d = new Date(l.date);
                                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                            }));
                                            const monthlyLogsCount = months.size;

                                            // Determine latest status
                                            // Find the status of the current month, or the latest submitted month
                                            const today = new Date();
                                            const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                                            const latestStatus = getMonthStatus(vehicle.id, currentMonthKey);
                                            
                                            // Get last submitted month
                                            const lastSubmitted = getLastSubmittedMonth(vehicle.id);
                                            
                                            // Get overdue status
                                            const overdueList = getOverdueStatus(vehicle.id);

                                            // Find assigned user
                                            const assignment = assignments.find(a => a.vehicle_id === vehicle.id);
                                            let assignedUser = 'Unassigned';
                                            if (assignment) {
                                                const userObj = usersList.find(u => u.id === assignment.user_id);
                                                if (userObj) assignedUser = userObj.name;
                                            }

                                            // Get current mileage (from latest log)
                                            // Sort logs by date descending to find the latest
                                            const sortedVehicleLogs = [...vehicleLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
                                            const currentMileage = sortedVehicleLogs.length > 0 ? sortedVehicleLogs[0].end_mileage : 0;

                                            return (
                                                <tr 
                                                    key={vehicle.id} 
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                                    onClick={() => handleSelectVehicle(vehicle.id)}
                                                >
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                        <div className="flex items-center gap-2">
                                                            <Car className="w-4 h-4 text-orange-500" />
                                                            {vehicle.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-300">{vehicle.serial_number}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-gray-900 dark:text-white font-medium">
                                                        {currentMileage.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            assignedUser !== 'Unassigned' 
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {assignedUser}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-900 dark:text-white font-medium">
                                                        {monthlyLogsCount}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                            {journeysCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            lastSubmitted !== 'Never' 
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {lastSubmitted}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {overdueList.length > 0 ? (
                                                            <span className="inline-flex flex-col items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                                <span>{overdueList.length > 1 ? `${overdueList.length} Pending` : 'Overdue'}</span>
                                                                <span className="text-[10px] opacity-75">{overdueList[0]}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                                Up to Date
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                className="hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectVehicle(vehicle.id);
                                                                }}
                                                            >
                                                                View Logs <ChevronRight className="w-3 h-3 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    </>
                )}
                
                {/* Summary View (List of Months) */}
                {viewMode === 'summary' && (
                    <>
                        {/* Filters */}
                        <div className="mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                {/* Vehicle filter hidden in this mode as it's selected via cards */}
                                <div className="w-32">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Year</label>
                                    <Select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                                        <option value="all">All Years</option>
                                        <option value="2023">2023</option>
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </Select>
                                </div>
                                <div className="w-32">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Month</label>
                                    <Select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                                        <option value="all">All Months</option>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleDateString('default', { month: 'short' })}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            
                            {can('SHOW_MILEAGE_CREATE_LOG') && (
                                <Button onClick={handleCreateNewMonthLog} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                                    <Plus className="w-4 h-4" /> Create Monthly Log
                                </Button>
                            )}
                        </div>

                        {/* List of Monthly Groups */}
                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" /></div>
                            ) : monthlyGroups.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                    No mileage logs found for this criteria.
                                </div>
                            ) : (
                                monthlyGroups.map(group => (
                                    <Card key={group.key} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500" onClick={() => handleOpenMonth(group)}>
                                        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{group.monthLabel}</h3>
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                                        {group.tripCount} trips
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        group.status === 'submitted' 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                    }`}>
                                                        {group.status === 'submitted' ? 'Submitted' : 'Draft'}
                                                    </span>
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                    <Car className="w-4 h-4" /> {group.vehicleName} <span className="text-gray-400">({group.serialNumber})</span>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Total Mileage</div>
                                                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{group.totalMiles.toLocaleString()}</div>
                                            </div>

                                            <div className="text-gray-400">
                                                {isManageMode ? (
                                                    <button 
                                                        onClick={(e) => handleDeleteMonth(group, e)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Delete Monthly Log"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <ChevronRight className="w-6 h-6" />
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Detail View (Journeys for a specific month) */}
                {viewMode === 'detail' && selectedMonthGroup && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left Column: Form (if permitted and not submitted) */}
                        {can('MANAGE_VEHICLE_MILEAGE') && selectedMonthGroup?.status !== 'submitted' && (
                            <div className="lg:col-span-1">
                                <Card className="p-4 sticky top-4">
                                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                                        {editingJourney ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                                        {editingJourney ? 'Edit Journey' : 'Add Journey'}
                                    </h3>
                                    <form onSubmit={handleSaveJourney} className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                                            <Input type="date" name="date" value={journeyForm.date} onChange={handleJourneyInputChange} required />
                                            {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase">Purpose</label>
                                            <Input name="purpose" value={journeyForm.purpose} onChange={handleJourneyInputChange} placeholder="Trip Reason" required />
                                            {formErrors.purpose && <p className="text-red-500 text-xs mt-1">{formErrors.purpose}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase">From</label>
                                                <Input 
                                                    name="start_location" 
                                                    value={journeyForm.start_location} 
                                                    onChange={handleJourneyInputChange} 
                                                    placeholder="Origin" 
                                                    list="journey-options"
                                                    required 
                                                />
                                                {formErrors.start_location && <p className="text-red-500 text-xs mt-1">{formErrors.start_location}</p>}
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase">To</label>
                                                <Input 
                                                    name="end_location" 
                                                    value={journeyForm.end_location} 
                                                    onChange={handleJourneyInputChange} 
                                                    placeholder="Dest." 
                                                    list="journey-options"
                                                    required 
                                                />
                                                {formErrors.end_location && <p className="text-red-500 text-xs mt-1">{formErrors.end_location}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase">Start Mile</label>
                                                <Input type="number" name="start_mileage" value={journeyForm.start_mileage} onChange={handleJourneyInputChange} placeholder="0" required />
                                                {formErrors.start_mileage && <p className="text-red-500 text-xs mt-1">{formErrors.start_mileage}</p>}
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase">End Mile</label>
                                                <Input type="number" name="end_mileage" value={journeyForm.end_mileage} onChange={handleJourneyInputChange} placeholder="0" required />
                                                {formErrors.end_mileage && <p className="text-red-500 text-xs mt-1">{formErrors.end_mileage}</p>}
                                            </div>
                                        </div>
                                        
                                        {!editingJourney && (
                                            <div className="flex items-center space-x-2 py-1">
                                                <input 
                                                    type="checkbox" 
                                                    id="hasReturnTrip" 
                                                    name="hasReturnTrip" 
                                                    checked={journeyForm.hasReturnTrip} 
                                                    onChange={handleJourneyInputChange}
                                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <label htmlFor="hasReturnTrip" className="text-sm text-gray-700 dark:text-gray-300 select-none">
                                                    Add Return Trip (Same Day)
                                                </label>
                                            </div>
                                        )}

                                        {journeyForm.hasReturnTrip && (
                                            <div className="pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Return Journey</h4>
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase">From</label>
                                                            <Input 
                                                                name="return_start_location" 
                                                                value={journeyForm.return_start_location} 
                                                                onChange={handleJourneyInputChange} 
                                                                placeholder="Origin" 
                                                                list="journey-options"
                                                                required 
                                                            />
                                                            {formErrors.return_start_location && <p className="text-red-500 text-xs mt-1">{formErrors.return_start_location}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase">To</label>
                                                            <Input 
                                                                name="return_end_location" 
                                                                value={journeyForm.return_end_location} 
                                                                onChange={handleJourneyInputChange} 
                                                                placeholder="Dest." 
                                                                list="journey-options"
                                                                required 
                                                            />
                                                            {formErrors.return_end_location && <p className="text-red-500 text-xs mt-1">{formErrors.return_end_location}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase">Start Mile</label>
                                                            <Input type="number" name="return_start_mileage" value={journeyForm.return_start_mileage} onChange={handleJourneyInputChange} placeholder="0" required />
                                                            {formErrors.return_start_mileage && <p className="text-red-500 text-xs mt-1">{formErrors.return_start_mileage}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase">End Mile</label>
                                                            <Input type="number" name="return_end_mileage" value={journeyForm.return_end_mileage} onChange={handleJourneyInputChange} placeholder="0" required />
                                                            {formErrors.return_end_mileage && <p className="text-red-500 text-xs mt-1">{formErrors.return_end_mileage}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Trip Distance:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {(currentFormMiles + (journeyForm.hasReturnTrip && journeyForm.return_end_mileage && journeyForm.return_start_mileage ? Math.max(0, journeyForm.return_end_mileage - journeyForm.return_start_mileage) : 0)).toLocaleString()} miles
                                            </span>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            {editingJourney && (
                                                <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingLog(null); setJourneyForm(prev => ({...prev, purpose: '', end_location: '', end_mileage: '' })); }}>
                                                    Cancel
                                                </Button>
                                            )}
                                            <Button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600">
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingJourney ? 'Update' : 'Add')}
                                            </Button>
                                        </div>
                                        <datalist id="journey-options">
                                            {journeyOptions.map((option, index) => (
                                                <option key={index} value={option} />
                                            ))}
                                        </datalist>
                                    </form>
                                </Card>
                            </div>
                        )}

                        {/* Right Column: List of Journeys */}
                        <div className={`${can('MANAGE_VEHICLE_MILEAGE') ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                            <Card className="overflow-hidden">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-200">Trip Log</h3>
                                    <span className="text-sm text-gray-500">{selectedMonthGroup.logs.length} entries</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-black dark:text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">From</th>
                                                <th className="px-4 py-3">To</th>
                                                <th className="px-4 py-3">Purpose</th>
                                                <th className="px-4 py-3 text-right">Start</th>
                                                <th className="px-4 py-3 text-right">End</th>
                                                <th className="px-4 py-3 text-right">Miles</th>
                                                {can('MANAGE_VEHICLE_MILEAGE') && selectedMonthGroup?.status !== 'submitted' && <th className="px-4 py-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {selectedMonthGroup.logs.length === 0 ? (
                                                <tr><td colSpan={can('MANAGE_VEHICLE_MILEAGE') && selectedMonthGroup?.status !== 'submitted' ? 8 : 7} className="p-8 text-center text-gray-500">No journeys recorded for this month yet.</td></tr>
                                            ) : (
                                                [...selectedMonthGroup.logs]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest top
                                                .map(log => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-3 whitespace-nowrap font-medium">{new Date(log.date).getDate()} {new Date(log.date).toLocaleDateString('default', { month: 'short' })}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.start_location}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.end_location}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.purpose}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-500">{log.start_mileage}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-500">{log.end_mileage}</td>
                                                        <td className="px-4 py-3 text-right font-bold font-mono text-orange-600 dark:text-orange-400">{log.end_mileage - log.start_mileage}</td>
                                                        {can('MANAGE_VEHICLE_MILEAGE') && selectedMonthGroup?.status !== 'submitted' && (
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleEditJourney(log)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDeleteClick(log)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {selectedMonthGroup.logs.length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <td colSpan="6" className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200">Month Total:</td>
                                                    <td className="px-4 py-3 text-right font-bold text-orange-600 dark:text-orange-400 font-mono">{selectedMonthGroup.totalMiles}</td>
                                                    {can('MANAGE_VEHICLE_MILEAGE') && selectedMonthGroup?.status !== 'submitted' && <td></td>}
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Journey"
                message="Are you sure you want to delete this journey? This will affect the monthly total."
                confirmText="Delete"
                confirmVariant="danger"
            />

            <ConfirmationModal
                isOpen={isDeleteMonthModalOpen}
                onClose={() => setIsDeleteMonthModalOpen(false)}
                onConfirm={confirmDeleteMonth}
                title="Delete Monthly Log"
                message={`Are you sure you want to delete the entire log for ${monthToDelete?.monthLabel} (${monthToDelete?.vehicleName})? This will delete ALL ${monthToDelete?.tripCount} trips in this month. This action cannot be undone.`}
                confirmText="Delete All"
                confirmVariant="danger"
            />

            <CreateMonthModal 
                isOpen={showCreateMonthModal}
                onClose={() => setShowCreateMonthModal(false)}
                onConfirm={confirmCreateMonth}
                vehicles={vehicles}
                initialVehicleId={filterVehicle !== 'all' ? filterVehicle : ''}
            />

            <MileageExportWizard
                isOpen={showExportWizard}
                onClose={() => setShowExportWizard(false)}
                vehicles={vehicles}
                monthlyGroups={monthlyGroups} // We'll need to pass all groups or re-calculate them inside? Passing memoized is fine but it depends on filters.
                                              // Better to pass allLogs and re-calculate in wizard to ignore current view filters
                allLogs={allLogs}
                exportPdf={exportMonthToPdf}
                exportExcel={exportMonthToExcel}
            />
        </div>
    );
};

const MileageExportWizard = ({ isOpen, onClose, vehicles, allLogs, exportPdf, exportExcel }) => {
    const [step, setStep] = useState(1);
    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [exportFormats, setExportFormats] = useState({ pdf: true, excel: false });
    const [processing, setProcessing] = useState(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedVehicles([]);
            setSelectedMonths([]);
            setExportFormats({ pdf: true, excel: false });
            setProcessing(false);
        }
    }, [isOpen]);

    // Group logs for wizard logic
    const availableMonths = useMemo(() => {
        const months = new Set();
        allLogs.forEach(log => {
            const date = new Date(log.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        });
        return Array.from(months).sort().reverse(); // Newest first
    }, [allLogs]);

    const handleVehicleToggle = (id) => {
        setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
    };

    const handleMonthToggle = (key) => {
        setSelectedMonths(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
    };

    const handleExport = async () => {
        if (selectedVehicles.length === 0 || selectedMonths.length === 0) return;
        if (!exportFormats.pdf && !exportFormats.excel) return;

        setProcessing(true);
        try {
            // Import JSZip here to avoid circular dependencies or massive imports if not used
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            let fileCount = 0;

            for (const vehicleId of selectedVehicles) {
                const vehicle = vehicles.find(v => v.id === vehicleId);
                if (!vehicle) continue;

                for (const monthKey of selectedMonths) {
                    // Filter logs for this specific vehicle/month
                    const logs = allLogs.filter(log => {
                        const d = new Date(log.date);
                        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return log.vehicle_id === vehicleId && k === monthKey;
                    });

                    if (logs.length === 0) continue;

                    // Calculate totals
                    const totalMiles = logs.reduce((acc, log) => acc + (log.end_mileage - log.start_mileage), 0);
                    const [year, month] = monthKey.split('-');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const monthLabel = dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' });

                    const group = {
                        vehicleName: vehicle.name,
                        serialNumber: vehicle.serial_number,
                        monthLabel,
                        totalMiles,
                        logs,
                        monthKey
                    };

                    const folderName = `${vehicle.name} - ${monthLabel}`;

                    if (exportFormats.pdf) {
                        const pdfDoc = exportPdf(group);
                        const pdfBlob = pdfDoc.output('blob');
                        zip.folder(folderName).file(`Mileage_${vehicle.name}_${monthKey}.pdf`, pdfBlob);
                        fileCount++;
                    }

                    if (exportFormats.excel) {
                        const excelBlob = await exportExcel(group);
                        zip.folder(folderName).file(`Mileage_${vehicle.name}_${monthKey}.xlsx`, excelBlob);
                        fileCount++;
                    }
                }
            }

            if (fileCount > 0) {
                const content = await zip.generateAsync({ type: 'blob' });
                const url = window.URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Mileage_Export_${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                onClose();
            } else {
                alert('No logs found for the selected combination.');
            }

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Export Mileage Logs">
            <div className="p-6 h-[60vh] flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div>
                            <h3 className="font-semibold mb-3">1. Select Vehicles</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-500 mb-2">
                                    <button onClick={() => setSelectedVehicles(vehicles.map(v => v.id))} className="hover:text-orange-500">Select All</button>
                                    <button onClick={() => setSelectedVehicles([])} className="hover:text-orange-500">Deselect All</button>
                                </div>
                                {vehicles.map(v => (
                                    <div key={v.id} className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`v-${v.id}`} 
                                            checked={selectedVehicles.includes(v.id)} 
                                            onChange={() => handleVehicleToggle(v.id)}
                                            className="w-4 h-4 text-orange-600 rounded"
                                        />
                                        <label htmlFor={`v-${v.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            {v.name} ({v.serial_number})
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 className="font-semibold mb-3">2. Select Months</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-500 mb-2">
                                    <button onClick={() => setSelectedMonths(availableMonths)} className="hover:text-orange-500">Select All</button>
                                    <button onClick={() => setSelectedMonths([])} className="hover:text-orange-500">Deselect All</button>
                                </div>
                                {availableMonths.map(m => {
                                    const [y, mo] = m.split('-');
                                    const label = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
                                    return (
                                        <div key={m} className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id={`m-${m}`} 
                                                checked={selectedMonths.includes(m)} 
                                                onChange={() => handleMonthToggle(m)}
                                                className="w-4 h-4 text-orange-600 rounded"
                                            />
                                            <label htmlFor={`m-${m}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                {label}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h3 className="font-semibold mb-3">3. Export Format</h3>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="fmt-pdf" 
                                        checked={exportFormats.pdf} 
                                        onChange={(e) => setExportFormats(prev => ({ ...prev, pdf: e.target.checked }))}
                                        className="w-4 h-4 text-orange-600 rounded"
                                    />
                                    <label htmlFor="fmt-pdf" className="ml-2 text-sm text-gray-700 dark:text-gray-300">PDF Document</label>
                                </div>
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="fmt-excel" 
                                        checked={exportFormats.excel} 
                                        onChange={(e) => setExportFormats(prev => ({ ...prev, excel: e.target.checked }))}
                                        className="w-4 h-4 text-orange-600 rounded"
                                    />
                                    <label htmlFor="fmt-excel" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Excel Spreadsheet</label>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-orange-800 dark:text-orange-200">
                                <p><strong>Summary:</strong></p>
                                <ul className="list-disc ml-4 mt-1">
                                    <li>{selectedVehicles.length} vehicles selected</li>
                                    <li>{selectedMonths.length} months selected</li>
                                    <li>Format: {[exportFormats.pdf && 'PDF', exportFormats.excel && 'Excel'].filter(Boolean).join(' + ')}</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </Button>
                    <div className="flex gap-2">
                        {step < 3 ? (
                            <Button onClick={() => setStep(step + 1)} disabled={(step === 1 && selectedVehicles.length === 0) || (step === 2 && selectedMonths.length === 0)}>
                                Next
                            </Button>
                        ) : (
                            <Button onClick={handleExport} disabled={processing || (!exportFormats.pdf && !exportFormats.excel)}>
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Download Zip'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const CreateMonthModal = ({ isOpen, onClose, onConfirm, vehicles, initialVehicleId }) => {
    const [vehicleId, setVehicleId] = useState(initialVehicleId);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (isOpen) {
            setVehicleId(initialVehicleId || (vehicles.length > 0 ? vehicles[0].id : ''));
            setMonth(new Date().getMonth() + 1);
            setYear(new Date().getFullYear());
        }
    }, [isOpen, initialVehicleId, vehicles]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(vehicleId, parseInt(month), parseInt(year));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Monthly Log">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                    <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.serial_number})</option>
                        ))}
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                        <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('default', { month: 'long' })}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                        <Select value={year} onChange={(e) => setYear(e.target.value)}>
                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Create Log Sheet</Button>
                </div>
            </form>
        </Modal>
    );
};

export default VehicleMileagePage;