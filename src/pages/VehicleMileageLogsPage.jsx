import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Select } from '../components/ui';
import { Car, Plus, Search, Calendar, AlertTriangle, CheckCircle, Clock, FileText, ChevronRight, Filter, Loader2, Eye, X, Camera, Upload, Trash2, Download, ZoomIn, FileImage } from 'lucide-react';
import { exportAsImage, exportAsPDF } from '../utils/inspectionExport';
import { hasPermission } from '../utils/privileges';

const VehicleMileageLogsPage = () => {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all'); // all, overdue, upcoming, compliant
    const [showInspectionModal, setShowInspectionModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [currentInspection, setCurrentInspection] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInspectionDetail, setSelectedInspectionDetail] = useState(null);
    const [exportingAll, setExportingAll] = useState(false);
    const [cleaningUp, setCleaningUp] = useState(false);
    const [summaryDateFilter, setSummaryDateFilter] = useState('all'); // all, today, week, month, custom
    const [summaryStartDate, setSummaryStartDate] = useState('');
    const [summaryEndDate, setSummaryEndDate] = useState('');
    const [summaryCurrentPage, setSummaryCurrentPage] = useState(1);
    const summaryItemsPerPage = 20;
    const [exportingInspection, setExportingInspection] = useState(null);

    // Fetch vehicles from vehicles table
    const fetchVehicles = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setVehicles(data || []);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        }
    }, []);

    // Fetch all inspection logs
    const fetchInspections = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicle_inspection_logs')
                .select(`
                    *,
                    vehicles:vehicle_id (id, name, serial_number),
                    users:user_id (id, name)
                `)
                .order('inspection_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInspections(data || []);
        } catch (err) {
            console.error('Error fetching inspections:', err);
        }
    }, []);

    // Fetch vehicle assignments
    const fetchAssignments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicle_assignments')
                .select('*')
                .order('assigned_at', { ascending: false });

            if (error) throw error;
            setAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    }, []);

    // Fetch users (both real and dummy users)
    const fetchUsers = useCallback(async () => {
        try {
            // Fetch real users
            const { data: realUsers, error: realError } = await supabase
                .from('users')
                .select('*')
                .is('deleted_at', null);

            // Fetch dummy users
            const { data: dummyUsers, error: dummyError } = await supabase
                .from('dummy_users')
                .select('*')
                .eq('is_active', true)
                .is('deleted_at', null);

            if (realError) console.error('Error fetching users:', realError);
            if (dummyError) console.error('Error fetching dummy users:', dummyError);

            // Combine both user lists
            const allUsers = [...(realUsers || []), ...(dummyUsers || [])];
            setUsers(allUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
        fetchInspections();
        fetchAssignments();
        fetchUsers();
    }, [fetchVehicles, fetchInspections, fetchAssignments, fetchUsers]);

    // Calculate inspection status for a vehicle
    const getVehicleStatus = (vehicleId) => {
        const vehicleInspections = inspections
            .filter(i => i.vehicle_id === vehicleId)
            .sort((a, b) => {
                // Sort by inspection_date descending, then by created_at descending
                const dateCompare = new Date(b.inspection_date) - new Date(a.inspection_date);
                if (dateCompare !== 0) return dateCompare;
                return new Date(b.created_at) - new Date(a.created_at);
            });
        if (vehicleInspections.length === 0) {
            return { status: 'never', daysOverdue: null, lastInspection: null, nextInspectionDate: null };
        }

        const lastInspection = vehicleInspections[0]; // Most recent inspection
        const lastInspectionDate = new Date(lastInspection.inspection_date);
        const today = new Date();
        const daysSinceInspection = Math.floor((today - lastInspectionDate) / (1000 * 60 * 60 * 24));

        // Calculate next inspection date (7 days after last inspection)
        const nextInspectionDate = new Date(lastInspectionDate);
        nextInspectionDate.setDate(nextInspectionDate.getDate() + 7);

        // Weekly checks = 7 days
        if (daysSinceInspection <= 7) {
            return { status: 'compliant', daysSinceInspection, lastInspection, nextInspectionDate };
        } else if (daysSinceInspection <= 10) {
            return { status: 'upcoming', daysSinceInspection, lastInspection, nextInspectionDate };
        } else {
            return { status: 'overdue', daysOverdue: daysSinceInspection - 7, lastInspection, nextInspectionDate };
        }
    };

    // Get the currently assigned user for a vehicle
    const getAssignedUser = (vehicleId) => {
        const assignment = assignments.find(a => a.vehicle_id === vehicleId && !a.returned_at);
        if (!assignment) return null;

        // Find the user by either user_id or dummy_user_id
        const userId = assignment.user_id || assignment.dummy_user_id;
        if (!userId) return null;

        return users.find(u => u.id === userId);
    };

    // Filter vehicles based on user and status
    const filteredVehicles = vehicles.filter(vehicle => {
        // Filter by assigned user
        if (filterUser !== 'all') {
            const assignedUser = getAssignedUser(vehicle.id);
            if (!assignedUser || assignedUser.id !== filterUser) return false;
        }

        if (filterStatus === 'all') return true;

        // Handle defects filter
        if (filterStatus === 'defects') {
            const vehicleInspections = inspections
                .filter(i => i.vehicle_id === vehicle.id)
                .sort((a, b) => {
                    // Sort by inspection_date descending, then by created_at descending
                    const dateCompare = new Date(b.inspection_date) - new Date(a.inspection_date);
                    if (dateCompare !== 0) return dateCompare;
                    return new Date(b.created_at) - new Date(a.created_at);
                });
            if (vehicleInspections.length === 0) return false;
            const lastInspection = vehicleInspections[0]; // Most recent inspection
            return lastInspection.has_defects === true;
        }

        const vehicleStatus = getVehicleStatus(vehicle.id);
        return vehicleStatus.status === filterStatus;
    });

    // Get status badge styling
    const getStatusBadge = (status) => {
        switch (status) {
            case 'compliant':
                return {
                    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    icon: <CheckCircle className="w-4 h-4" />,
                    text: 'Compliant'
                };
            case 'upcoming':
                return {
                    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                    icon: <Clock className="w-4 h-4" />,
                    text: 'Due Soon'
                };
            case 'overdue':
                return {
                    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                    icon: <AlertTriangle className="w-4 h-4" />,
                    text: 'Overdue'
                };
            case 'never':
                return {
                    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                    icon: <FileText className="w-4 h-4" />,
                    text: 'Never Inspected'
                };
            default:
                return {
                    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                    icon: <FileText className="w-4 h-4" />,
                    text: 'Unknown'
                };
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Filter inspections based on date filter for summary table
    const getFilteredInspections = () => {
        let filtered = [...inspections];

        // Apply user filter
        if (filterUser !== 'all') {
            filtered = filtered.filter(inspection => inspection.user_id === filterUser);
        }

        // Apply status filter (based on defects)
        if (filterStatus !== 'all') {
            if (filterStatus === 'defects') {
                filtered = filtered.filter(inspection => inspection.has_defects);
            } else {
                // For other status filters, we need to check vehicle status
                // This is more complex, so for now we'll just filter by defects
                // You can extend this later for overdue/upcoming/compliant
            }
        }

        // Apply date filter
        if (summaryDateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter(inspection => {
                const inspectionDate = new Date(inspection.inspection_date);
                const inspectionDay = new Date(inspectionDate.getFullYear(), inspectionDate.getMonth(), inspectionDate.getDate());

                switch (summaryDateFilter) {
                    case 'today':
                        return inspectionDay.getTime() === today.getTime();
                    case 'week': {
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return inspectionDay >= weekAgo;
                    }
                    case 'month': {
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return inspectionDay >= monthAgo;
                    }
                    case 'custom': {
                        if (!summaryStartDate && !summaryEndDate) return true;
                        const start = summaryStartDate ? new Date(summaryStartDate) : null;
                        const end = summaryEndDate ? new Date(summaryEndDate) : null;
                        if (start && end) {
                            return inspectionDay >= start && inspectionDay <= end;
                        } else if (start) {
                            return inspectionDay >= start;
                        } else if (end) {
                            return inspectionDay <= end;
                        }
                        return true;
                    }
                    default:
                        return true;
                }
            });
        }

        return filtered;
    };

    // Calculate if inspection was overdue
    const wasInspectionOverdue = (inspection) => {
        if (!inspection.vehicle_id) return false;

        // Get all inspections for this vehicle before this one
        const vehicleInspections = inspections
            .filter(i => i.vehicle_id === inspection.vehicle_id)
            .sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));

        const currentIndex = vehicleInspections.findIndex(i => i.id === inspection.id);
        if (currentIndex === 0) return false; // First inspection can't be overdue

        const previousInspection = vehicleInspections[currentIndex - 1];
        if (!previousInspection) return false;

        const previousDate = new Date(previousInspection.inspection_date);
        const currentDate = new Date(inspection.inspection_date);
        const daysDiff = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));

        return daysDiff > 7; // More than 7 days = overdue
    };

    // Get paginated inspections for summary table
    const filteredSummaryInspections = getFilteredInspections();
    const summaryTotalPages = Math.ceil(filteredSummaryInspections.length / summaryItemsPerPage);
    const paginatedSummaryInspections = filteredSummaryInspections.slice(
        (summaryCurrentPage - 1) * summaryItemsPerPage,
        summaryCurrentPage * summaryItemsPerPage
    );

    // Clean up old inspection photos (keep only last 3 inspections per vehicle)
    const cleanupOldInspectionPhotos = async (vehicleId) => {
        try {
            console.log(`Cleaning up old inspection photos for vehicle ${vehicleId}...`);

            // Get all inspections for this vehicle, sorted by date and created_at (most recent first)
            const { data: allInspections, error: fetchError } = await supabase
                .from('vehicle_inspection_logs')
                .select('id, inspection_date, created_at, photos')
                .eq('vehicle_id', vehicleId)
                .order('inspection_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error('Error fetching inspections for cleanup:', fetchError);
                return;
            }

            // Keep only the last 3 inspections, delete photos from older ones
            if (allInspections && allInspections.length > 3) {
                const inspectionsToCleanup = allInspections.slice(3); // Get inspections beyond the 3rd

                console.log(`Found ${inspectionsToCleanup.length} old inspections to clean up`);

                for (const inspection of inspectionsToCleanup) {
                    if (inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0) {
                        // Extract file paths from photo objects
                        const pathsToDelete = [];

                        inspection.photos.forEach(photo => {
                            if (typeof photo === 'object' && photo.path) {
                                pathsToDelete.push(photo.path);
                            } else if (typeof photo === 'string') {
                                // If it's a URL, extract the path
                                try {
                                    const url = new URL(photo);
                                    const pathMatch = url.pathname.match(/vehicle-inspections\/.+/);
                                    if (pathMatch) {
                                        pathsToDelete.push(pathMatch[0]);
                                    }
                                } catch (e) {
                                    console.error('Failed to parse photo URL:', photo);
                                }
                            }
                        });

                        // Delete photos from storage
                        if (pathsToDelete.length > 0) {
                            console.log(`Deleting ${pathsToDelete.length} photos from inspection ${inspection.id}`);

                            const { error: deleteError } = await supabase.storage
                                .from('vehicle-photos')
                                .remove(pathsToDelete);

                            if (deleteError) {
                                console.error('Error deleting photos from storage:', deleteError);
                            } else {
                                console.log(`Successfully deleted photos for inspection ${inspection.id}`);

                                // Update the inspection record to clear the photos array
                                await supabase
                                    .from('vehicle_inspection_logs')
                                    .update({ photos: [] })
                                    .eq('id', inspection.id);
                            }
                        }
                    }
                }

                console.log('Cleanup completed successfully');
            } else {
                console.log('No old inspections to clean up (3 or fewer inspections exist)');
            }
        } catch (error) {
            console.error('Error during photo cleanup:', error);
            // Don't throw - we don't want cleanup failures to prevent inspection submission
        }
    };

    // Clean up old photos for all vehicles
    const handleCleanupAllPhotos = async () => {
        if (!window.confirm('This will delete inspection photos older than the last 3 inspections for each vehicle. Continue?')) {
            return;
        }

        setCleaningUp(true);
        let totalCleaned = 0;

        try {
            for (const vehicle of vehicles) {
                await cleanupOldInspectionPhotos(vehicle.id);
                totalCleaned++;
            }

            alert(`Successfully cleaned up old photos for ${totalCleaned} vehicle(s)`);
        } catch (error) {
            console.error('Error during cleanup:', error);
            alert(`Cleanup completed with errors. Check console for details.`);
        } finally {
            setCleaningUp(false);
        }
    };

    // Export all latest inspections
    const handleExportAllInspections = async () => {
        setExportingAll(true);

        try {
            // Get all vehicles that have inspections
            const vehiclesWithInspections = vehicles.filter(vehicle => {
                const vehicleInspections = inspections.filter(i => i.vehicle_id === vehicle.id);
                return vehicleInspections.length > 0;
            });

            if (vehiclesWithInspections.length === 0) {
                alert('No inspections found to export');
                return;
            }

            // Process each vehicle
            for (const vehicle of vehiclesWithInspections) {
                // Get latest inspection for this vehicle
                const vehicleInspections = inspections
                    .filter(i => i.vehicle_id === vehicle.id)
                    .sort((a, b) => {
                        // Sort by inspection_date descending, then by created_at descending
                        const dateCompare = new Date(b.inspection_date) - new Date(a.inspection_date);
                        if (dateCompare !== 0) return dateCompare;
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                const latestInspection = vehicleInspections[0]; // Most recent inspection

                // Create temporary container
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '0';
                container.style.width = '800px';
                container.style.backgroundColor = '#ffffff';
                container.style.padding = '24px';

                // Build inspection content HTML
                const getCheckIcon = (value) => {
                    if (value === 'satisfactory') return '<span style="color: #16a34a;">✓ Satisfactory</span>';
                    if (value === 'defective') return '<span style="color: #dc2626;">✗ Defective</span>';
                    return '<span style="color: #9ca3af;">N/A N/A</span>';
                };

                container.innerHTML = `
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Vehicle:</span>
                                <p style="font-weight: 500; color: #111827; margin: 4px 0 0 0;">${latestInspection.vehicles?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Registration:</span>
                                <p style="font-weight: 500; color: #111827; margin: 4px 0 0 0;">${latestInspection.vehicles?.serial_number || 'N/A'}</p>
                            </div>
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Date:</span>
                                <p style="font-weight: 500; color: #111827; margin: 4px 0 0 0;">${formatDate(latestInspection.inspection_date)}</p>
                            </div>
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Mileage:</span>
                                <p style="font-weight: 500; color: #111827; margin: 4px 0 0 0;">${latestInspection.mileage?.toLocaleString() || 'N/A'}</p>
                            </div>
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Inspector:</span>
                                <p style="font-weight: 500; color: #111827; margin: 4px 0 0 0;">${latestInspection.users?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <span style="font-size: 14px; color: #6b7280;">Status:</span>
                                <p style="font-weight: 500; color: ${latestInspection.has_defects ? '#dc2626' : '#16a34a'}; margin: 4px 0 0 0;">${latestInspection.has_defects ? 'Has Defects' : 'All Clear'}</p>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">💧 Fluids</h3>
                        <div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Engine Oil</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_engine_oil)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Brake Fluid</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_brake)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Clutch Fluid</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_clutch)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Power Steering</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_power_steering)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Auto Transmission</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_auto_transmission)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Screen Wash</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_screen_wash)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Fuel</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_fuel)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Coolant</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_coolant)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">💡 Lights/Electric</h3>
                        <div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Indicators</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_indicators)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Side Lights</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_side_lights)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Headlights (Dipped)</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_headlights_dipped)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Headlights (Main)</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_headlights_main)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Number Plate Light</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_number_plate_light)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Reversing Light</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_reversing_light)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Warning Lights</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_warning_lights)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Horn</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_horn)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">🚗 External Condition</h3>
                        <div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Door/Wing Mirrors</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_door_wing_mirrors)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Wiper Blades</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_wiper_blades)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Screen Washers</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_screen_washers)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Tyre Pressure</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_tyre_pressure)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Tyre Condition</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_tyre_condition)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Windscreen Wipers</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_windscreen_wipers)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Spare Wheel</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_spare_wheel)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Cleanliness</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_cleanliness)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">🔧 Internal Condition</h3>
                        <div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Seat Belts</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_seat_belts)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">First Aid Kit</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_first_aid_kit)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Fire Extinguisher</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_fire_extinguisher)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Head Restraint</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_head_restraint)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Torch</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_torch)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">General Bodywork</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_general_bodywork)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Spill Kit</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_spill_kit)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="font-size: 14px; color: #374151;">Door Locking</span>
                                <span style="font-size: 14px;">${getCheckIcon(latestInspection.check_door_locking)}</span>
                            </div>
                        </div>
                    </div>

                    ${latestInspection.comments ? `
                        <div style="margin-bottom: 16px;">
                            <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">Comments:</h3>
                            <p style="font-size: 14px; color: #4b5563; background-color: #f9fafb; padding: 12px; border-radius: 4px;">${latestInspection.comments}</p>
                        </div>
                    ` : ''}

                    ${latestInspection.damage_notes ? `
                        <div>
                            <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">Damage Notes:</h3>
                            <p style="font-size: 14px; color: #4b5563; background-color: #fef2f2; padding: 12px; border-radius: 4px;">${latestInspection.damage_notes}</p>
                        </div>
                    ` : ''}
                `;

                document.body.appendChild(container);

                // Wait for rendering
                await new Promise(resolve => setTimeout(resolve, 300));

                // Export
                const vehicleName = latestInspection.vehicles?.name || 'vehicle';
                const registration = latestInspection.vehicles?.serial_number || '';
                const date = formatDate(latestInspection.inspection_date).replace(/\s+/g, '-');

                await exportAsImage(container, vehicleName, date, registration);

                // Clean up
                document.body.removeChild(container);

                // Small delay between exports
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            alert(`Successfully exported ${vehiclesWithInspections.length} inspection(s)`);
        } catch (error) {
            console.error('Error exporting inspections:', error);
            alert('Failed to export inspections');
        } finally {
            setExportingAll(false);
        }
    };

    // Statistics
    const stats = {
        total: vehicles.length,
        compliant: vehicles.filter(v => getVehicleStatus(v.id).status === 'compliant').length,
        upcoming: vehicles.filter(v => getVehicleStatus(v.id).status === 'upcoming').length,
        overdue: vehicles.filter(v => getVehicleStatus(v.id).status === 'overdue').length,
        withDefects: vehicles.filter(v => {
            const vehicleInspections = inspections
                .filter(i => i.vehicle_id === v.id)
                .sort((a, b) => {
                    // Sort by inspection_date descending, then by created_at descending
                    const dateCompare = new Date(b.inspection_date) - new Date(a.inspection_date);
                    if (dateCompare !== 0) return dateCompare;
                    return new Date(b.created_at) - new Date(a.created_at);
                });
            if (vehicleInspections.length === 0) return false;
            const lastInspection = vehicleInspections[0]; // Most recent inspection
            return lastInspection.has_defects === true;
        }).length,
    };

    const handleStartInspection = (vehicle) => {
        setSelectedVehicle(vehicle);
        setCurrentInspection({
            vehicle_id: vehicle.id,
            user_id: user.id,
            inspection_date: new Date().toISOString().split('T')[0],
            mileage: '',
            // Initialize all checks to null
            check_engine_oil: null,
            check_brake: null,
            check_clutch: null,
            check_power_steering: null,
            check_auto_transmission: null,
            check_screen_wash: null,
            check_fuel: null,
            check_coolant: null,
            check_indicators: null,
            check_side_lights: null,
            check_headlights_dipped: null,
            check_headlights_main: null,
            check_number_plate_light: null,
            check_reversing_light: null,
            check_warning_lights: null,
            check_horn: null,
            check_door_wing_mirrors: null,
            check_wiper_blades: null,
            check_screen_washers: null,
            check_tyre_pressure: null,
            check_tyre_condition: null,
            check_windscreen_wipers: null,
            check_spare_wheel: null,
            check_cleanliness: null,
            check_seat_belts: null,
            check_first_aid_kit: null,
            check_fire_extinguisher: null,
            check_head_restraint: null,
            check_torch: null,
            check_general_bodywork: null,
            check_spill_kit: null,
            check_door_locking: null,
            comments: '',
            damage_notes: '',
            photos: [],
        });
        setShowInspectionModal(true);
    };

    const handleViewHistory = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowHistoryModal(true);
    };

    const handleViewInspectionDetail = (inspection) => {
        setSelectedInspectionDetail(inspection);
        setShowDetailModal(true);
    };

    const handleDeleteInspection = async (inspection) => {
        try {
            // Delete photos from storage if they exist
            if (inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0) {
                const pathsToDelete = [];

                inspection.photos.forEach(photo => {
                    if (typeof photo === 'object' && photo.path) {
                        pathsToDelete.push(photo.path);
                    } else if (typeof photo === 'string') {
                        try {
                            const url = new URL(photo);
                            const pathMatch = url.pathname.match(/vehicle-inspections\/.+/);
                            if (pathMatch) {
                                pathsToDelete.push(pathMatch[0]);
                            }
                        } catch (e) {
                            console.error('Failed to parse photo URL:', photo);
                        }
                    }
                });

                if (pathsToDelete.length > 0) {
                    const { error: deleteError } = await supabase.storage
                        .from('vehicle-photos')
                        .remove(pathsToDelete);

                    if (deleteError) {
                        console.error('Error deleting photos from storage:', deleteError);
                    }
                }
            }

            // Delete the inspection record
            const { error } = await supabase
                .from('vehicle_inspection_logs')
                .delete()
                .eq('id', inspection.id);

            if (error) throw error;

            // Refresh inspections list
            await fetchInspections();

            alert('Inspection deleted successfully');
        } catch (error) {
            console.error('Error deleting inspection:', error);
            alert('Failed to delete inspection. Please try again.');
        }
    };

    // Handle quick export from summary table - open modal in hidden mode and auto-export
    const handleQuickExport = (inspection) => {
        setExportingInspection(inspection);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Fixed Header - Title Only */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-2 md:py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Car className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Vehicle Inspection</h1>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Weekly vehicle inspection tracking</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {hasPermission(user?.privilege, 'EXPORT_VEHICLE_INSPECTIONS') && (
                            <Button
                                onClick={handleExportAllInspections}
                                disabled={exportingAll}
                                className="flex items-center space-x-2"
                            >
                                {exportingAll ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="hidden sm:inline">Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Export All Latest</span>
                                    </>
                                )}
                            </Button>
                        )}
                        {hasPermission(user?.privilege, 'CLEANUP_VEHICLE_INSPECTION_PHOTOS') && (
                            <Button
                                onClick={handleCleanupAllPhotos}
                                disabled={cleaningUp}
                                variant="outline"
                                className="flex items-center space-x-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                {cleaningUp ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="hidden sm:inline">Cleaning...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Cleanup Photos</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="bg-white dark:bg-gray-800 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('compliant')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Compliant</div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.compliant}/{stats.total}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('upcoming')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Due Soon</div>
                        <div className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.upcoming}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('overdue')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Overdue</div>
                        <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.overdue}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('defects')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">With Defects</div>
                        <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.withDefects}</div>
                    </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-row gap-2 md:gap-3 mt-3 md:mt-4">
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
                        <Select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="flex-1 md:w-48">
                            <option value="all">All Users</option>
                            {users
                                .filter(u => assignments.some(a => (a.user_id === u.id || a.dummy_user_id === u.id) && !a.returned_at))
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))
                            }
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
                        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 md:w-48">
                            <option value="all">All Status</option>
                            <option value="compliant">Compliant</option>
                            <option value="upcoming">Due Soon</option>
                            <option value="overdue">Overdue</option>
                            <option value="never">Never Inspected</option>
                            <option value="defects">With Defects</option>
                        </Select>
                    </div>
                    <Button
                        onClick={() => setFilterUser(filterUser === user.id ? 'all' : user.id)}
                        className={`flex items-center space-x-2 whitespace-nowrap ${filterUser === user.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                    >
                        <Car className="w-4 h-4" />
                        <span>{filterUser === user.id ? 'Show All' : 'My Vehicles'}</span>
                    </Button>
                    </div>
                </div>

                {/* Vehicle Grid */}
                <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredVehicles.map(vehicle => {
                        const vehicleStatus = getVehicleStatus(vehicle.id);
                        const badge = getStatusBadge(vehicleStatus.status);

                        return (
                            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                                <div className="p-6">
                                    {/* Status Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${badge.color}`}>
                                            {badge.icon}
                                            <span className="text-xs font-semibold">{badge.text}</span>
                                        </div>
                                        {vehicleStatus.daysOverdue && (
                                            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                                {vehicleStatus.daysOverdue}d overdue
                                            </span>
                                        )}
                                    </div>

                                    {/* Vehicle Info */}
                                    <div className="flex items-start space-x-3 mb-4">
                                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Car className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {vehicle.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {vehicle.serial_number || 'No Serial Number'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Last Inspection */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Last Inspection:</span>
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                {vehicleStatus.lastInspection ? formatDate(vehicleStatus.lastInspection.inspection_date) : 'Never'}
                                            </span>
                                        </div>
                                        {vehicleStatus.nextInspectionDate && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Next Inspection:</span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {formatDate(vehicleStatus.nextInspectionDate)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Assigned To:</span>
                                            <span className={`font-medium ${getAssignedUser(vehicle.id) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                                                {getAssignedUser(vehicle.id)?.name || 'Not Assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleViewHistory(vehicle)}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            History
                                        </Button>
                                        {hasPermission(user?.privilege, 'CREATE_VEHICLE_INSPECTIONS') && (
                                            <Button
                                                onClick={() => handleStartInspection(vehicle)}
                                                className="flex-1 group-hover:bg-orange-600 transition-colors"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Inspect
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredVehicles.length === 0 && (
                    <div className="text-center py-12">
                        <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No vehicles found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {filterUser !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No vehicles are currently tracked in the system'}
                        </p>
                    </div>
                )}
                </div>

                {/* Summary Table */}
                <div className="p-4 md:p-6">
                    <Card className="overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <FileText className="w-5 h-5 md:w-6 md:h-6 mr-2 text-orange-500" />
                                        Inspection Summary
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Complete list of all vehicle inspections
                                    </p>
                                </div>

                                {/* Date Filter */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Select
                                        value={summaryDateFilter}
                                        onChange={(e) => {
                                            setSummaryDateFilter(e.target.value);
                                            setSummaryCurrentPage(1);
                                        }}
                                        className="w-full sm:w-auto"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">Last 30 Days</option>
                                        <option value="custom">Custom Range</option>
                                    </Select>

                                    {summaryDateFilter === 'custom' && (
                                        <div className="flex gap-2">
                                            <Input
                                                type="date"
                                                value={summaryStartDate}
                                                onChange={(e) => {
                                                    setSummaryStartDate(e.target.value);
                                                    setSummaryCurrentPage(1);
                                                }}
                                                placeholder="Start Date"
                                                className="w-full sm:w-auto"
                                            />
                                            <Input
                                                type="date"
                                                value={summaryEndDate}
                                                onChange={(e) => {
                                                    setSummaryEndDate(e.target.value);
                                                    setSummaryCurrentPage(1);
                                                }}
                                                placeholder="End Date"
                                                className="w-full sm:w-auto"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Vehicle
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Overdue
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedSummaryInspections.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 md:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                                <p className="text-sm">No inspections found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSummaryInspections.map((inspection) => {
                                            const hasDefects = inspection.has_defects;
                                            const statusBadge = hasDefects
                                                ? { text: 'Defects Found', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3 h-3" /> }
                                                : { text: 'Passed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> };

                                            return (
                                                <tr key={inspection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                            {formatDate(inspection.inspection_date)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                                            {new Date(inspection.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex items-center">
                                                            <Car className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {inspection.vehicles?.name || 'Unknown Vehicle'}
                                                                </div>
                                                                {inspection.vehicles?.serial_number && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {inspection.vehicles.serial_number}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {inspection.users?.name || 'Unknown User'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                                                            {statusBadge.icon}
                                                            <span>{statusBadge.text}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                        {wasInspectionOverdue(inspection) ? (
                                                            <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                <span>Yes</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <CheckCircle className="w-3 h-3" />
                                                                <span>No</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewInspectionDetail(inspection)}
                                                                className="flex items-center space-x-1"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                <span className="hidden sm:inline">View</span>
                                                            </Button>
                                                            {hasPermission(user?.privilege, 'EXPORT_VEHICLE_INSPECTIONS') && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleQuickExport(inspection)}
                                                                    disabled={exportingInspection?.id === inspection.id}
                                                                    className="flex items-center space-x-1"
                                                                >
                                                                    {exportingInspection?.id === inspection.id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Download className="w-4 h-4" />
                                                                    )}
                                                                    <span className="hidden sm:inline">
                                                                        {exportingInspection?.id === inspection.id ? 'Exporting...' : 'Download'}
                                                                    </span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredSummaryInspections.length > 0 && (
                            <div className="px-4 md:px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Showing {((summaryCurrentPage - 1) * summaryItemsPerPage) + 1} to {Math.min(summaryCurrentPage * summaryItemsPerPage, filteredSummaryInspections.length)} of <span className="font-semibold text-gray-900 dark:text-white">{filteredSummaryInspections.length}</span> inspections
                                    </p>

                                    {/* Pagination Controls */}
                                    {summaryTotalPages > 1 && (
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSummaryCurrentPage(1)}
                                                disabled={summaryCurrentPage === 1}
                                                className="px-2 py-1"
                                            >
                                                First
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSummaryCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={summaryCurrentPage === 1}
                                                className="px-2 py-1"
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                                                Page {summaryCurrentPage} of {summaryTotalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSummaryCurrentPage(p => Math.min(summaryTotalPages, p + 1))}
                                                disabled={summaryCurrentPage === summaryTotalPages}
                                                className="px-2 py-1"
                                            >
                                                Next
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSummaryCurrentPage(summaryTotalPages)}
                                                disabled={summaryCurrentPage === summaryTotalPages}
                                                className="px-2 py-1"
                                            >
                                                Last
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Inspection Modal */}
            {showInspectionModal && (
                <InspectionModal
                    vehicle={selectedVehicle}
                    inspection={currentInspection}
                    onClose={() => {
                        setShowInspectionModal(false);
                        setSelectedVehicle(null);
                        setCurrentInspection(null);
                    }}
                    onSave={() => {
                        fetchInspections();
                        setShowInspectionModal(false);
                        setSelectedVehicle(null);
                        setCurrentInspection(null);
                    }}
                />
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <HistoryModal
                    vehicle={selectedVehicle}
                    inspections={inspections.filter(i => i.vehicle_id === selectedVehicle?.id)}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedVehicle(null);
                    }}
                    onViewDetail={handleViewInspectionDetail}
                    onDelete={handleDeleteInspection}
                    user={user}
                />
            )}

            {/* Inspection Detail Modal */}
            {showDetailModal && (
                <InspectionDetailModal
                    inspection={selectedInspectionDetail}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedInspectionDetail(null);
                    }}
                />
            )}

            {/* Hidden Export Modal - renders inspection detail modal off-screen for auto-export */}
            {exportingInspection && (
                <div style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '0',
                    width: '800px',
                    zIndex: -1,
                    backgroundColor: '#ffffff'
                }}>
                    <InspectionDetailModal
                        inspection={exportingInspection}
                        autoExport={true}
                        onClose={() => setExportingInspection(null)}
                        onExportComplete={() => setExportingInspection(null)}
                    />
                </div>
            )}

        </div>
    );
};

// Inspection Modal Component
const InspectionModal = ({ vehicle, inspection, onClose, onSave }) => {
    const [formData, setFormData] = useState(inspection);
    const [saving, setSaving] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const errorMessageRef = useRef(null);
    const modalContentRef = useRef(null);

    // Scroll to error message when validation error appears
    useEffect(() => {
        if (validationError && errorMessageRef.current) {
            errorMessageRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [validationError]);

    const handleCheckChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field] === value ? null : value
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Image compression function
    const compressImage = (file, maxSizeKB = 500) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions (max 1920px width)
                    const maxWidth = 1920;
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Start with high quality and reduce if needed
                    let quality = 0.9;
                    const tryCompress = () => {
                        canvas.toBlob((blob) => {
                            if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
                                resolve(blob);
                            } else {
                                quality -= 0.1;
                                tryCompress();
                            }
                        }, 'image/jpeg', quality);
                    };
                    tryCompress();
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    // Handle image upload
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Check if already have 4 photos
        if (uploadedImages.length >= 4) {
            setValidationError('Maximum 4 photos allowed. Please remove a photo before adding a new one.');
            e.target.value = '';
            return;
        }

        setUploading(true);
        try {
            const file = files[0]; // Take only the first file since we removed multiple

            // Compress image
            const compressedBlob = await compressImage(file);

            // Generate unique filename
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `vehicle-inspections/${vehicle.id}/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('vehicle-photos')
                .upload(filePath, compressedBlob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600'
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('vehicle-photos')
                .getPublicUrl(filePath);

            setUploadedImages(prev => [...prev, { url: publicUrl, path: filePath }]);

            // Reset the input so user can take another photo
            e.target.value = '';
        } catch (error) {
            console.error('Error uploading image:', error);
            setValidationError(`Error uploading image: ${error.message}. Please try again.`);
        } finally {
            setUploading(false);
        }
    };

    // Remove uploaded image
    const handleRemoveImage = async (imageToRemove) => {
        try {
            // Delete from storage
            if (imageToRemove.path) {
                await supabase.storage
                    .from('vehicle-photos')
                    .remove([imageToRemove.path]);
            }

            setUploadedImages(prev => prev.filter(img => img.url !== imageToRemove.url));
        } catch (error) {
            console.error('Error removing image:', error);
        }
    };

    // Clean up old inspection photos (keep only last 3 inspections per vehicle)
    const cleanupOldInspectionPhotos = async (vehicleId) => {
        try {
            console.log(`Cleaning up old inspection photos for vehicle ${vehicleId}...`);

            // Get all inspections for this vehicle, sorted by date and created_at (most recent first)
            const { data: allInspections, error: fetchError } = await supabase
                .from('vehicle_inspection_logs')
                .select('id, inspection_date, created_at, photos')
                .eq('vehicle_id', vehicleId)
                .order('inspection_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error('Error fetching inspections for cleanup:', fetchError);
                return;
            }

            // Keep only the last 3 inspections, delete photos from older ones
            if (allInspections && allInspections.length > 3) {
                const inspectionsToCleanup = allInspections.slice(3); // Get inspections beyond the 3rd

                console.log(`Found ${inspectionsToCleanup.length} old inspections to clean up`);

                for (const inspection of inspectionsToCleanup) {
                    if (inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0) {
                        // Extract file paths from photo objects
                        const pathsToDelete = [];

                        inspection.photos.forEach(photo => {
                            if (typeof photo === 'object' && photo.path) {
                                pathsToDelete.push(photo.path);
                            } else if (typeof photo === 'string') {
                                // If it's a URL, extract the path
                                try {
                                    const url = new URL(photo);
                                    const pathMatch = url.pathname.match(/vehicle-inspections\/.+/);
                                    if (pathMatch) {
                                        pathsToDelete.push(pathMatch[0]);
                                    }
                                } catch (e) {
                                    console.error('Failed to parse photo URL:', photo);
                                }
                            }
                        });

                        // Delete photos from storage
                        if (pathsToDelete.length > 0) {
                            console.log(`Deleting ${pathsToDelete.length} photos from inspection ${inspection.id}`);

                            const { error: deleteError } = await supabase.storage
                                .from('vehicle-photos')
                                .remove(pathsToDelete);

                            if (deleteError) {
                                console.error('Error deleting photos from storage:', deleteError);
                            } else {
                                console.log(`Successfully deleted photos for inspection ${inspection.id}`);

                                // Update the inspection record to clear the photos array
                                await supabase
                                    .from('vehicle_inspection_logs')
                                    .update({ photos: [] })
                                    .eq('id', inspection.id);
                            }
                        }
                    }
                }

                console.log('Cleanup completed successfully');
            } else {
                console.log('No old inspections to clean up (3 or fewer inspections exist)');
            }
        } catch (error) {
            console.error('Error during photo cleanup:', error);
            // Don't throw - we don't want cleanup failures to prevent inspection submission
        }
    };

    const handleSubmit = async () => {
        // Clear previous errors
        setValidationError(null);

        if (!formData.mileage) {
            setValidationError('Please enter the current mileage');
            return;
        }

        // Validate that all inspection items are filled (mandatory except comments and damage_notes)
        const checkFields = Object.keys(formData).filter(key => key.startsWith('check_'));
        const emptyFields = checkFields.filter(key => !formData[key]);

        if (emptyFields.length > 0) {
            const fieldNames = emptyFields.map(field => {
                // Convert field name to readable format (e.g., check_engine_oil -> Engine Oil)
                return field.replace('check_', '').split('_').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            });
            setValidationError(`Please complete all inspection items. Missing: ${fieldNames.join(', ')}`);
            return;
        }

        // Validate that exactly 4 photos are uploaded
        if (uploadedImages.length < 4) {
            setValidationError(`Please upload all 4 required vehicle photos. You have uploaded ${uploadedImages.length}/4 photos.`);
            return;
        }

        setSaving(true);
        try {
            // Check if there are any defects
            const hasDefects = Object.keys(formData).some(key =>
                key.startsWith('check_') && formData[key] === 'defective'
            );

            const dataToSubmit = {
                ...formData,
                has_defects: hasDefects,
                is_submitted: true,
                submitted_at: new Date().toISOString(),
                photos: uploadedImages
            };

            const { error } = await supabase
                .from('vehicle_inspection_logs')
                .insert([dataToSubmit]);

            if (error) throw error;

            // Clean up old inspection photos (keep only last 3 inspections)
            await cleanupOldInspectionPhotos(formData.vehicle_id);

            onSave();
        } catch (err) {
            console.error('Error saving inspection:', err);
            setValidationError('Failed to save inspection: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const CheckItem = ({ label, field }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex space-x-2">
                {['satisfactory', 'defective', 'n/a'].map(option => (
                    <button
                        key={option}
                        onClick={() => handleCheckChange(field, option)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            formData[field] === option
                                ? option === 'satisfactory'
                                    ? 'bg-green-500 text-white'
                                    : option === 'defective'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {option === 'satisfactory' ? '✓' : option === 'defective' ? '✗' : 'N/A'}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={`Vehicle Inspection - ${vehicle.name}`}>
            <div className="max-h-[80vh] overflow-y-auto">
                {/* Header Info */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Vehicle</label>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicle.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Registration</label>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicle.serial_number || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
                            <Input
                                type="date"
                                name="inspection_date"
                                value={formData.inspection_date}
                                onChange={handleInputChange}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Mileage *</label>
                            <Input
                                type="number"
                                name="mileage"
                                value={formData.mileage}
                                onChange={handleInputChange}
                                placeholder="Enter mileage"
                                className="mt-1"
                                required
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Mark each item as: ✓ - Satisfactory | ✗ - Defective/Missing | N/A - Not Applicable
                    </p>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                    <div
                        ref={errorMessageRef}
                        className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                                    Validation Error
                                </h4>
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    {validationError}
                                </p>
                            </div>
                            <button
                                onClick={() => setValidationError(null)}
                                className="ml-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Check Sections */}
                <div className="p-6 space-y-6">
                    {/* Fluids Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-blue-600 dark:text-blue-400 text-sm">💧</span>
                            </div>
                            Fluids
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Engine Oil" field="check_engine_oil" />
                            <CheckItem label="Brake" field="check_brake" />
                            <CheckItem label="Clutch" field="check_clutch" />
                            <CheckItem label="Power Steering" field="check_power_steering" />
                            <CheckItem label="Auto Transmission" field="check_auto_transmission" />
                            <CheckItem label="Screen Wash" field="check_screen_wash" />
                            <CheckItem label="Fuel" field="check_fuel" />
                            <CheckItem label="Coolant" field="check_coolant" />
                        </div>
                    </div>

                    {/* Lights/Electric Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-yellow-600 dark:text-yellow-400 text-sm">💡</span>
                            </div>
                            Lights / Electric
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Indicators" field="check_indicators" />
                            <CheckItem label="Side Lights" field="check_side_lights" />
                            <CheckItem label="Headlights (Dipped)" field="check_headlights_dipped" />
                            <CheckItem label="Headlights (Main)" field="check_headlights_main" />
                            <CheckItem label="Number Plate" field="check_number_plate_light" />
                            <CheckItem label="Reversing" field="check_reversing_light" />
                            <CheckItem label="Warning Lights" field="check_warning_lights" />
                            <CheckItem label="Horn" field="check_horn" />
                        </div>
                    </div>

                    {/* External Condition Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">🚗</span>
                            </div>
                            External Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Door/Wing Mirrors" field="check_door_wing_mirrors" />
                            <CheckItem label="Wiper Blades" field="check_wiper_blades" />
                            <CheckItem label="Screen Washers" field="check_screen_washers" />
                            <CheckItem label="Tyre Pressure" field="check_tyre_pressure" />
                            <CheckItem label="Tyre Condition" field="check_tyre_condition" />
                            <CheckItem label="Windscreen Wipers" field="check_windscreen_wipers" />
                            <CheckItem label="Spare Wheel" field="check_spare_wheel" />
                            <CheckItem label="Cleanliness (plates, windows, lights)" field="check_cleanliness" />
                        </div>
                    </div>

                    {/* Internal Condition Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-purple-600 dark:text-purple-400 text-sm">🔧</span>
                            </div>
                            Internal Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Seat Belts" field="check_seat_belts" />
                            <CheckItem label="First Aid Kit" field="check_first_aid_kit" />
                            <CheckItem label="Fire Extinguisher" field="check_fire_extinguisher" />
                            <CheckItem label="Head Restraint Adjustment" field="check_head_restraint" />
                            <CheckItem label="Torch" field="check_torch" />
                            <CheckItem label="General Bodywork" field="check_general_bodywork" />
                            <CheckItem label="Spill Kit" field="check_spill_kit" />
                            <CheckItem label="Door Locking" field="check_door_locking" />
                        </div>
                    </div>

                    {/* Vehicle Photos Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2">
                                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            Vehicle Photos (Mandatory) *
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Take exactly 4 photos of your vehicle to confirm you are present during inspection ({uploadedImages.length}/4 photos taken)
                        </p>

                        {/* Upload Button */}
                        <div className="mb-4">
                            <label className="cursor-pointer">
                                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Take Photo with Camera
                                            </span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Uploaded Images Preview */}
                        {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {uploadedImages.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={image.url}
                                            alt={`Damage ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                                        />
                                        <button
                                            onClick={() => handleRemoveImage(image)}
                                            className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Comments</h3>
                        <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleInputChange}
                            placeholder="Any additional comments or observations..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Damage Notes Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Damage Notes</h3>
                        <textarea
                            name="damage_notes"
                            value={formData.damage_notes}
                            onChange={handleInputChange}
                            placeholder="Mark any damage noted, repairs due, etc..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    * Required fields
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Inspection'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// History Modal Component
const HistoryModal = ({ vehicle, inspections, onClose, onViewDetail, onDelete, user }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDelete = async (e, inspection) => {
        e.stopPropagation(); // Prevent opening detail view

        if (!window.confirm(`Are you sure you want to delete the inspection from ${formatDate(inspection.inspection_date)}? This cannot be undone.`)) {
            return;
        }

        await onDelete(inspection);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Inspection History - ${vehicle?.name}`}>
            <div className="p-6">
                {inspections.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No inspections recorded for this vehicle</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {inspections.map((inspection) => (
                            <div
                                key={inspection.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <div className="flex-1 cursor-pointer" onClick={() => onViewDetail(inspection)}>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatDate(inspection.inspection_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                                        <span>Mileage: {inspection.mileage?.toLocaleString() || 'N/A'}</span>
                                        {inspection.users && (
                                            <span>By: {inspection.users.name}</span>
                                        )}
                                        {inspection.has_defects && (
                                            <span className="flex items-center text-red-600 dark:text-red-400">
                                                <AlertTriangle className="w-4 h-4 mr-1" />
                                                Has Defects
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {hasPermission(user?.privilege, 'DELETE_VEHICLE_INSPECTIONS') && (
                                        <button
                                            onClick={(e) => handleDelete(e, inspection)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete inspection"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="cursor-pointer p-2" onClick={() => onViewDetail(inspection)}>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};

// Inspection Detail Modal Component
const InspectionDetailModal = ({ inspection, onClose, autoExport = false, onExportComplete }) => {
    const [viewingImage, setViewingImage] = useState(null);
    const [exporting, setExporting] = useState(false);
    const contentRef = useRef(null);
    const [hasAutoExported, setHasAutoExported] = useState(false);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDownloadImage = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vehicle-inspection-photo-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download image');
        }
    };

    const handleExportAsImage = async () => {
        if (!contentRef.current) return;

        setExporting(true);

        // Store original styles
        const originalMaxHeight = contentRef.current.style.maxHeight;
        const originalOverflow = contentRef.current.style.overflow;
        const originalHeight = contentRef.current.style.height;

        try {
            // Temporarily remove scroll constraints to capture full content
            contentRef.current.style.maxHeight = 'none';
            contentRef.current.style.overflow = 'visible';
            contentRef.current.style.height = 'auto';

            // Wait for layout to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            const vehicleName = inspection.vehicles?.name || 'vehicle';
            const date = formatDate(inspection.inspection_date).replace(/\s+/g, '-');
            const result = await exportAsImage(contentRef.current, vehicleName, date, '');

            if (!result.success) {
                alert(`Failed to export as image: ${result.error}`);
            }
        } catch (error) {
            console.error('Error exporting as image:', error);
            alert('Failed to export as image');
        } finally {
            // Restore original styles
            contentRef.current.style.maxHeight = originalMaxHeight;
            contentRef.current.style.overflow = originalOverflow;
            contentRef.current.style.height = originalHeight;

            setExporting(false);

            // If auto-exporting, call completion callback
            if (autoExport && onExportComplete) {
                onExportComplete();
            }
        }
    };

    // Auto-export effect
    useEffect(() => {
        if (autoExport && contentRef.current && !hasAutoExported && !exporting) {
            setHasAutoExported(true);
            // Wait for component to fully render, including images
            setTimeout(() => {
                if (contentRef.current) {
                    handleExportAsImage();
                }
            }, 800);
        }
    }, [autoExport, hasAutoExported, exporting]);

    const handleExportAsPDF = async () => {
        if (!contentRef.current) return;

        setExporting(true);

        // Store original styles
        const originalMaxHeight = contentRef.current.style.maxHeight;
        const originalOverflow = contentRef.current.style.overflow;
        const originalHeight = contentRef.current.style.height;

        try {
            // Temporarily remove scroll constraints to capture full content
            contentRef.current.style.maxHeight = 'none';
            contentRef.current.style.overflow = 'visible';
            contentRef.current.style.height = 'auto';

            // Add export mode class to force black text
            contentRef.current.classList.add('export-mode');

            // Wait for styles to apply
            await new Promise(resolve => setTimeout(resolve, 200));

            const vehicleName = inspection.vehicles?.name || 'vehicle';
            const date = formatDate(inspection.inspection_date).replace(/\s+/g, '-');
            const result = await exportAsPDF(contentRef.current, vehicleName, date);

            if (!result.success) {
                alert(`Failed to export as PDF: ${result.error}`);
            }
        } catch (error) {
            console.error('Error exporting as PDF:', error);
            alert('Failed to export as PDF');
        } finally {
            // Remove export mode class
            contentRef.current.classList.remove('export-mode');

            // Restore original styles
            contentRef.current.style.maxHeight = originalMaxHeight;
            contentRef.current.style.overflow = originalOverflow;
            contentRef.current.style.height = originalHeight;

            setExporting(false);
        }
    };

    const getCheckIcon = (value) => {
        if (value === 'satisfactory') return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (value === 'defective') return <X className="w-4 h-4 text-red-600" />;
        return <span className="text-xs text-gray-400">N/A</span>;
    };

    const getCheckLabel = (value) => {
        if (value === 'satisfactory') return 'Satisfactory';
        if (value === 'defective') return 'Defective';
        return 'N/A';
    };

    const CheckItem = ({ label, value }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex items-center space-x-2">
                {getCheckIcon(value)}
                <span className={`text-sm font-medium ${
                    value === 'satisfactory' ? 'text-green-600' :
                    value === 'defective' ? 'text-red-600' :
                    'text-gray-400'
                }`}>
                    {getCheckLabel(value)}
                </span>
            </div>
        </div>
    );

    // If auto-exporting, render content without Modal wrapper
    const content = (
        <div ref={contentRef} className={autoExport ? "p-6 bg-white" : "flex-1 overflow-y-auto p-6"}>
                    {/* Header Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            {inspection.vehicles && (
                                <>
                                    <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Vehicle:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {inspection.vehicles.name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Registration:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {inspection.vehicles.serial_number || 'N/A'}
                                        </p>
                                    </div>
                                </>
                            )}
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Date:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {formatDate(inspection.inspection_date)}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Mileage:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {inspection.mileage?.toLocaleString() || 'N/A'}
                                </p>
                            </div>
                            {inspection.users && (
                                <div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Inspector:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {inspection.users.name}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                <p className={`font-medium ${inspection.has_defects ? 'text-red-600' : 'text-green-600'}`}>
                                    {inspection.has_defects ? 'Has Defects' : 'All Clear'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fluids Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💧</span> Fluids
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Engine Oil" value={inspection.check_engine_oil} />
                            <CheckItem label="Brake Fluid" value={inspection.check_brake} />
                            <CheckItem label="Clutch Fluid" value={inspection.check_clutch} />
                            <CheckItem label="Power Steering" value={inspection.check_power_steering} />
                            <CheckItem label="Auto Transmission" value={inspection.check_auto_transmission} />
                            <CheckItem label="Screen Wash" value={inspection.check_screen_wash} />
                            <CheckItem label="Fuel" value={inspection.check_fuel} />
                            <CheckItem label="Coolant" value={inspection.check_coolant} />
                        </div>
                    </div>

                    {/* Lights/Electric Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💡</span> Lights/Electric
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Indicators" value={inspection.check_indicators} />
                            <CheckItem label="Side Lights" value={inspection.check_side_lights} />
                            <CheckItem label="Headlights (Dipped)" value={inspection.check_headlights_dipped} />
                            <CheckItem label="Headlights (Main)" value={inspection.check_headlights_main} />
                            <CheckItem label="Number Plate Light" value={inspection.check_number_plate_light} />
                            <CheckItem label="Reversing Light" value={inspection.check_reversing_light} />
                            <CheckItem label="Warning Lights" value={inspection.check_warning_lights} />
                            <CheckItem label="Horn" value={inspection.check_horn} />
                        </div>
                    </div>

                    {/* External Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🚗</span> External Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Door/Wing Mirrors" value={inspection.check_door_wing_mirrors} />
                            <CheckItem label="Wiper Blades" value={inspection.check_wiper_blades} />
                            <CheckItem label="Screen Washers" value={inspection.check_screen_washers} />
                            <CheckItem label="Tyre Pressure" value={inspection.check_tyre_pressure} />
                            <CheckItem label="Tyre Condition" value={inspection.check_tyre_condition} />
                            <CheckItem label="Windscreen Wipers" value={inspection.check_windscreen_wipers} />
                            <CheckItem label="Spare Wheel" value={inspection.check_spare_wheel} />
                            <CheckItem label="Cleanliness" value={inspection.check_cleanliness} />
                        </div>
                    </div>

                    {/* Internal Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🔧</span> Internal Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Seat Belts" value={inspection.check_seat_belts} />
                            <CheckItem label="First Aid Kit" value={inspection.check_first_aid_kit} />
                            <CheckItem label="Fire Extinguisher" value={inspection.check_fire_extinguisher} />
                            <CheckItem label="Head Restraint" value={inspection.check_head_restraint} />
                            <CheckItem label="Torch" value={inspection.check_torch} />
                            <CheckItem label="General Bodywork" value={inspection.check_general_bodywork} />
                            <CheckItem label="Spill Kit" value={inspection.check_spill_kit} />
                            <CheckItem label="Door Locking" value={inspection.check_door_locking} />
                        </div>
                    </div>

                    {/* Vehicle Photos */}
                    {inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                <Camera className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                Vehicle Photos ({inspection.photos.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {inspection.photos.map((image, index) => {
                                    const imageUrl = typeof image === 'string' ? image : image.url;
                                    return (
                                        <div key={index} className="relative group">
                                            <img
                                                src={imageUrl}
                                                alt={`Vehicle photo ${index + 1}`}
                                                className={`w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 ${!autoExport ? 'cursor-pointer' : ''}`}
                                                style={{ opacity: 1, visibility: 'visible', display: 'block' }}
                                                onClick={!autoExport ? () => setViewingImage({ url: imageUrl, index }) : undefined}
                                            />
                                            {!autoExport && (
                                                <div
                                                    className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center pointer-events-none cursor-pointer"
                                                    onClick={() => setViewingImage({ url: imageUrl, index })}
                                                >
                                                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Comments and Damage Notes */}
                    {(inspection.comments || inspection.damage_notes) && (
                        <div className="space-y-4">
                            {inspection.comments && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Comments:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                        {inspection.comments}
                                    </p>
                                </div>
                            )}
                            {inspection.damage_notes && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Damage Notes:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                        {inspection.damage_notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
    );

    // If auto-exporting, return just the content without Modal wrapper
    if (autoExport) {
        return content;
    }

    // Normal mode - return Modal with content and buttons
    return (
        <Modal isOpen={true} onClose={onClose} title="Inspection Details">
            <div className="flex flex-col max-h-[80vh]">
                {content}

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExportAsImage}
                                disabled={exporting}
                                className="flex items-center gap-2"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {exporting ? 'Exporting...' : 'Export Inspection'}
                            </Button>
                        </div>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <button
                        onClick={() => setViewingImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(viewingImage.url);
                        }}
                        className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors z-10 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
                    >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                    </button>
                    <img
                        src={viewingImage.url}
                        alt={`Vehicle photo ${viewingImage.index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </Modal>
    );
};


export default VehicleMileageLogsPage;
