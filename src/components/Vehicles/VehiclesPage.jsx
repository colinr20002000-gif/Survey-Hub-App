import React, { useState, useEffect } from 'react';
import {
    Users,
    MessageSquare,
    PlusCircle,
    Edit,
    Trash2,
    Loader2,
    History
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';
import { useDebouncedValue } from '../../utils/debounce';


// Vehicle Management Page Component
const VehiclesPage = () => {
    const { user: currentUser } = useAuth();
    const { canAssignVehicles, canReturnVehicles, canAddVehicles, canAddVehicleComments, canDeleteVehicleComments, isEditorOrAbove } = usePermissions();
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showComments, setShowComments] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [showEditVehicle, setShowEditVehicle] = useState(false);
    const [vehicleToEdit, setVehicleToEdit] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const [vehicleToReturn, setVehicleToReturn] = useState(null);
    const [showMaintenanceVehicle, setShowMaintenanceVehicle] = useState(false);
    const [showAvailableVehicles, setShowAvailableVehicles] = useState(true); // true = Available, false = Maintenance
    const [showAuditTrail, setShowAuditTrail] = useState(false);
    const [auditTrailData, setAuditTrailData] = useState([]);
    const [auditTrailError, setAuditTrailError] = useState(null);
    const [showClearAuditConfirm, setShowClearAuditConfirm] = useState(false);
    const [showOnlyUsersWithVehicles, setShowOnlyUsersWithVehicles] = useState(true);

    // Vehicle form state
    const [vehicleForm, setVehicleForm] = useState({
        name: '',
        description: '',
        category: '',
        serial_number: '',
        status: 'available',
        purchase_date: '',
        warranty_expiry: '',
        location: ''
    });


    // Load data on component mount and set up real-time subscriptions
    useEffect(() => {
        loadData();

        // Set up real-time subscriptions for vehicles, assignments, and comments
        const vehiclesSubscription = supabase
            .channel('vehicles-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'vehicles'
                },
                (payload) => {
                    console.log('🚗 Vehicles table changed:', payload.eventType);
                    loadVehicles(); // Reload vehicles data
                }
            )
            .subscribe();

        const assignmentsSubscription = supabase
            .channel('vehicle-assignments-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'vehicle_assignments'
                },
                (payload) => {
                    console.log('📋 Vehicle assignments changed:', payload.eventType);
                    loadAssignments(); // Reload assignments
                }
            )
            .subscribe();

        const commentsSubscription = supabase
            .channel('vehicle-comments-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'vehicle_comments'
                },
                (payload) => {
                    console.log('💬 Vehicle comments changed:', payload.eventType);
                    loadComments(); // Reload comments
                }
            )
            .subscribe();

        return () => {
            vehiclesSubscription.unsubscribe();
            assignmentsSubscription.unsubscribe();
            commentsSubscription.unsubscribe();
        };
    }, []);

    // Close dropdown menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setShowCategoryDropdown(false);
                setShowDepartmentDropdown(false);
                setShowUserDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadVehicles(),
                loadUsers(),
                loadCategories(),
                loadAssignments(),
                loadComments()
            ]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadVehicles = async () => {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('name');

        if (error) throw error;
        setVehicles(data || []);
    };

    const loadUsers = async () => {
        try {
            // Fetch real users (exclude soft deleted users)
            const { data: realUsers, error: realUsersError } = await supabase
                .from('users')
                .select('*')
                .is('deleted_at', null)
                .order('name');

            // Fetch active dummy users (exclude soft deleted users)
            const { data: dummyUsers, error: dummyUsersError } = await supabase
                .from('dummy_users')
                .select('*')
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('name');

            if (realUsersError && dummyUsersError) {
                throw new Error(`Failed to fetch users: ${realUsersError?.message} and ${dummyUsersError?.message}`);
            }

            // Combine real users and dummy users
            const allUsers = [];

            // Add real users
            if (realUsers) {
                allUsers.push(...realUsers.map(user => ({ ...user, isDummy: false })));
            }

            // Add dummy users
            if (dummyUsers) {
                allUsers.push(...dummyUsers.map(dummyUser => ({ ...dummyUser, isDummy: true })));
            }

            // Sort combined list by name
            allUsers.sort((a, b) => a.name.localeCompare(b.name));

            setUsers(allUsers);

            // Extract unique departments from all users
            const uniqueDepartments = [...new Set(allUsers
                ?.filter(user => user.department && user.department.trim() !== '')
                ?.map(user => user.department)
                .filter(dept => dept && dept.trim() !== '')
            )].sort();

            setDepartments(uniqueDepartments);

            // Department filter defaults to "All Departments" (empty string) - no auto-selection
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    };

    const loadCategories = async () => {
        try {
            console.log('🔍 Loading categories - checking dropdown_categories table...');

            // First, let's see all categories that exist
            const { data: allCategories, error: allCategoriesError } = await supabase
                .from('dropdown_categories')
                .select('id, name');

            console.log('📋 All categories in dropdown_categories:', allCategories);

            if (allCategoriesError) {
                console.error('❌ Error fetching all categories:', allCategoriesError);
                throw allCategoriesError;
            }

            // Look for vehicle_type category
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id, name')
                .eq('name', 'vehicle_type')
                .single();

            console.log('🎯 Vehicle type category:', categoryData);

            if (categoryError) {
                console.error('❌ Error fetching vehicle_type category:', categoryError);
                if (categoryError.code === 'PGRST116') {
                    console.log('📝 No vehicle_type category found');
                    setCategories([]);
                    return;
                }
                throw categoryError;
            }

            if (!categoryData) {
                console.log('📝 No vehicle_type category found');
                setCategories([]);
                return;
            }

            // Get the dropdown items for this category
            const { data: itemsData, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('id, value')
                .eq('category_id', categoryData.id)
                .order('value');

            console.log('📦 Vehicle type items:', itemsData);

            if (itemsError) {
                console.error('❌ Error fetching vehicle_type items:', itemsError);
                throw itemsError;
            }

            setCategories(itemsData || []);
            console.log('✅ Categories loaded successfully:', itemsData?.length || 0, 'items');

        } catch (err) {
            console.error('💥 Error in loadCategories:', err);
            setError('Failed to load vehicle categories: ' + err.message);
            setCategories([]);
        }
    };

    const loadAssignments = async () => {
        const { data, error } = await supabase
            .from('vehicle_assignments')
            .select('*')
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        setAssignments(data || []);
    };

    const loadComments = async () => {
        const { data, error } = await supabase
            .from('vehicle_comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
    };

    const loadAuditTrail = async () => {
        try {
            console.log('📋 Loading vehicle audit trail...');
            setAuditTrailError(null);

            const { data, error } = await supabase
                .from('vehicle_audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) {
                console.error('❌ Error loading audit trail:', error);
                // Check if it's a table doesn't exist error
                if (error.message?.includes('does not exist') ||
                    error.message?.includes('relation "vehicle_audit_log" does not exist') ||
                    error.code === 'PGRST116' ||
                    error.code === '42P01') {
                    console.log('🔧 Audit log table does not exist');
                    setAuditTrailError('table_not_found');
                } else {
                    setAuditTrailError(`Failed to load audit trail: ${error.message}`);
                }
                setAuditTrailData([]);
            } else {
                console.log('✅ Audit trail loaded:', data?.length || 0, 'entries');

                // Enhance the audit data with vehicle and user information
                const enhancedData = await enhanceAuditData(data || []);
                setAuditTrailData(enhancedData);
                setAuditTrailError(null);
            }
        } catch (err) {
            console.error('❌ Error loading audit trail:', err);
            setAuditTrailError(`System error: ${err.message}`);
            setAuditTrailData([]);
        }
    };

    const enhanceAuditData = async (auditData) => {
        if (!auditData || auditData.length === 0) return auditData;

        try {
            // Get unique IDs for batch queries
            const vehicleIds = [...new Set(auditData.map(entry => entry.vehicle_id).filter(Boolean))];
            const userIds = [...new Set(auditData.flatMap(entry =>
                [entry.user_id, entry.assigned_to_user_id, entry.performed_by_user_id, entry.previous_user_id]
                    .filter(Boolean)
            ))];

            // Batch load vehicle data from local state only
            // (Don't query DB for missing records - they're likely deleted and blocked by RLS)
            const vehicleMap = new Map();
            if (vehicleIds.length > 0) {
                vehicleIds.forEach(vehicleId => {
                    const localVehicle = vehicles.find(v => v.id === vehicleId);
                    if (localVehicle) {
                        vehicleMap.set(vehicleId, localVehicle);
                    }
                    // If not in local state, it's deleted - will show as "Unknown Vehicle"
                });
            }

            // Batch load user data from local state only (includes dummy users)
            // (Don't query DB for missing records - they're likely deleted and blocked by RLS)
            const userMap = new Map();
            if (userIds.length > 0) {
                userIds.forEach(userId => {
                    const localUser = users.find(u => u.id === userId);
                    if (localUser) {
                        userMap.set(userId, localUser);
                    }
                    // If not in local state, it's deleted - will show as "Unknown User"
                });
            }

            // Enhance audit data with loaded information
            return auditData.map(entry => ({
                ...entry,
                vehicle: entry.vehicle_id ? vehicleMap.get(entry.vehicle_id) : null,
                user: entry.user_id ? userMap.get(entry.user_id) : null,
                assigned_to_user: entry.assigned_to_user_id ? userMap.get(entry.assigned_to_user_id) : null,
                performed_by: entry.performed_by_user_id ? userMap.get(entry.performed_by_user_id) : null,
                previous_user: entry.previous_user_id ? userMap.get(entry.previous_user_id) : null
            }));

        } catch (error) {
            console.error('Error enhancing audit data:', error);
            return auditData; // Return original data if enhancement fails
        }
    };

    const clearAuditTrail = async () => {
        try {
            console.log('🗑️ Clearing vehicle audit trail...');

            const { error } = await supabase
                .from('vehicle_audit_log')
                .delete()
                .neq('id', 0); // Delete all records

            if (error) {
                console.error('❌ Error clearing audit trail:', error);
                setAuditTrailError(`Failed to clear audit trail: ${error.message}`);
            } else {
                console.log('✅ Audit trail cleared successfully');
                setAuditTrailData([]);
                setAuditTrailError(null);
                setShowClearAuditConfirm(false);
            }
        } catch (err) {
            console.error('❌ Error clearing audit trail:', err);
            setAuditTrailError(`System error: ${err.message}`);
        }
    };

    const exportAuditTrailCSV = () => {
        try {
            console.log('📁 Exporting vehicle audit trail to CSV...');

            if (!auditTrailData || auditTrailData.length === 0) {
                console.log('⚠️ No audit trail data to export');
                return;
            }

            // Define CSV headers
            const headers = [
                'Date',
                'Time',
                'Action',
                'Vehicle Name',
                'Serial Number',
                'Vehicle Type',
                'Brand',
                'Model',
                'Assigned To',
                'Previous User',
                'Performed By',
                'Details'
            ];

            // Convert audit data to CSV rows
            const csvRows = auditTrailData.map(entry => {
                const date = new Date(entry.created_at);

                return [
                    date.toLocaleDateString(), // Date
                    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Time
                    entry.action_type?.toUpperCase() || '', // Action
                    entry.vehicle?.name || 'Unknown Vehicle', // Vehicle Name
                    entry.vehicle?.serial_number || '', // Serial Number
                    entry.vehicle?.vehicle_type || '', // Vehicle Type
                    entry.vehicle?.brand || '', // Brand
                    entry.vehicle?.model || '', // Model
                    entry.assigned_to_user?.name || '', // Assigned To
                    entry.previous_user?.name || '', // Previous User
                    entry.performed_by?.name || '', // Performed By
                    entry.details || '' // Details
                ];
            });

            // Combine headers and rows
            const csvContent = [headers, ...csvRows]
                .map(row => row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    const cellStr = String(cell || '');
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                }).join(','))
                .join('\n');

            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `vehicle_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('✅ Vehicle audit trail CSV export completed');

        } catch (error) {
            console.error('❌ Error exporting vehicle audit trail CSV:', error);
        }
    };

    const logVehicleAudit = async (action, vehicleId, details = {}) => {
        try {
            const auditEntry = {
                vehicle_id: vehicleId,
                action_type: action, // 'assigned', 'returned', 'transferred', 'created', 'updated', 'deleted'
                user_id: details.user_id || null,
                assigned_to_user_id: details.assigned_to_user_id || null,
                performed_by_user_id: currentUser.id,
                previous_user_id: details.previous_user_id || null,
                details: details.message || '',
                metadata: JSON.stringify({
                    location: details.location || null,
                    notes: details.notes || null,
                    transfer_reason: details.transfer_reason || null,
                    vehicle_name: details.vehicle_name || null,
                    ...details.extra_data
                }),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('vehicle_audit_log')
                .insert([auditEntry]);

            if (error) {
                // Check if it's a table doesn't exist error
                if (error.message?.includes('does not exist') ||
                    error.message?.includes('relation "vehicle_audit_log" does not exist') ||
                    error.code === 'PGRST116' ||
                    error.code === '42P01') {
                    console.log('⚠️ Vehicle audit log table does not exist - audit entry not recorded');
                    console.log('📋 To create the table, please run the SQL script from the Vehicle Audit Trail');
                } else {
                    console.error('❌ Error logging vehicle audit:', error);
                }
            } else {
                console.log('✅ Vehicle audit log entry created successfully');
            }
        } catch (err) {
            console.error('❌ Error in logVehicleAudit:', err);
        }
    };

    // Helper functions for multi-select filters
    const handleCategoryToggle = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleDepartmentToggle = (department) => {
        setSelectedDepartments(prev =>
            prev.includes(department)
                ? prev.filter(d => d !== department)
                : [...prev, department]
        );
    };

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(u => u !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAllCategories = () => {
        if (selectedCategories.length === categories.length) {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(categories.map(cat => cat.value));
        }
    };

    const handleSelectAllDepartments = () => {
        if (selectedDepartments.length === departments.length) {
            setSelectedDepartments([]);
        } else {
            setSelectedDepartments([...departments]);
        }
    };

    const handleSelectAllUsers = () => {
        const allUserIds = users
            .filter(user => user.name && user.name.trim() !== '')
            .map(user => user.id);

        if (selectedUsers.length === allUserIds.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(allUserIds);
        }
    };

    // Filter vehicles based on search and filters
    const filteredVehicles = vehicles.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             item.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             item.serial_number?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.length === categories.length || selectedCategories.includes(item.category);

        return matchesSearch && matchesCategory;
    });

    // Get current assignment for vehicle
    const getCurrentAssignment = (vehicleId) => {
        return assignments.find(a => a.vehicle_id === vehicleId && !a.returned_at);
    };

    // Get user by ID
    const getUserById = (userId) => {
        return users.find(u => u.id === userId);
    };

    // Handle vehicle addition
    const handleAddVehicle = async (e) => {
        e.preventDefault();
        setError(''); // Clear any previous errors

        try {
            // Validate required fields
            if (!vehicleForm.name?.trim()) {
                throw new Error('Vehicle name is required');
            }


            // Validate serial number uniqueness if provided
            if (vehicleForm.serial_number?.trim()) {
                const existingVehicle = vehicles.find(eq =>
                    eq.serial_number &&
                    eq.serial_number.toLowerCase() === vehicleForm.serial_number.trim().toLowerCase()
                );
                if (existingVehicle) {
                    throw new Error('A vehicle with this serial number already exists');
                }
            }

            // Prepare form data with proper null handling for dates
            const formData = {
                ...vehicleForm,
                name: vehicleForm.name.trim(),
                description: vehicleForm.description?.trim() || '',
                serial_number: vehicleForm.serial_number?.trim() || null,
                purchase_date: vehicleForm.purchase_date || null,
                warranty_expiry: vehicleForm.warranty_expiry || null,
                created_by: currentUser.id,
                updated_by: currentUser.id
            };

            const { data, error } = await supabase
                .from('vehicles')
                .insert([formData])
                .select();

            if (error) {
                // Handle specific database errors
                if (error.code === '23505') {
                    throw new Error('Vehicle with this serial number already exists');
                } else if (error.code === '23502') {
                    throw new Error('Missing required field');
                } else {
                    throw new Error(`Database error: ${error.message}`);
                }
            }

            if (!data || data.length === 0) {
                throw new Error('Failed to create vehicle - no data returned');
            }

            // Success - update state and close modal
            setVehicles([...vehicles, ...data]);
            setVehicleForm({
                name: '',
                description: '',
                category: '',
                serial_number: '',
                status: 'available',
                purchase_date: '',
                warranty_expiry: '',
                location: ''
            });
            setShowAddVehicle(false);

            // Optional: Show success message (could add a success state)
            console.log('Vehicle added successfully:', data[0].name);

        } catch (err) {
            console.error('Error adding vehicle:', err);
            setError(err.message || 'An unexpected error occurred while adding vehicle');
        }
    };

    // Handle vehicle edit
    const handleEditVehicle = async (e) => {
        e.preventDefault();
        try {
            // Check if serial number is being changed and if it already exists
            if (vehicleForm.serial_number !== vehicleToEdit.serial_number) {
                const { data: existingVehicle, error: checkError } = await supabase
                    .from('vehicles')
                    .select('id')
                    .eq('serial_number', vehicleForm.serial_number)
                    .neq('id', vehicleToEdit.id)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw checkError;
                }

                if (existingVehicle) {
                    setError('Serial number already exists. Please use a unique serial number.');
                    return;
                }
            }

            // Prepare form data with proper null handling for dates
            const formData = {
                ...vehicleForm,
                purchase_date: vehicleForm.purchase_date || null,
                warranty_expiry: vehicleForm.warranty_expiry || null,
                updated_by: currentUser.id
            };

            const { data, error } = await supabase
                .from('vehicles')
                .update(formData)
                .eq('id', vehicleToEdit.id)
                .select();

            if (error) {
                if (error.code === '23505' && error.message.includes('vehicles_serial_number_key')) {
                    setError('Serial number already exists. Please use a unique serial number.');
                } else {
                    setError(`Error updating vehicle: ${error.message}`);
                }
                return;
            }

            // Update vehicle in state
            const updatedVehicles = vehicles.map(veh =>
                veh.id === vehicleToEdit.id ? data[0] : veh
            );
            setVehicles(updatedVehicles);

            setVehicleForm({
                name: '',
                description: '',
                category: '',
                serial_number: '',
                status: 'available',
                purchase_date: '',
                warranty_expiry: '',
                location: ''
            });
            setShowEditVehicle(false);
            setVehicleToEdit(null);
        } catch (err) {
            if (err.message.includes('duplicate key value violates unique constraint')) {
                setError('Serial number already exists. Please use a unique serial number.');
            } else {
                setError(`Error updating vehicle: ${err.message}`);
            }
        }
    };

    // Handle vehicle delete
    const handleDeleteVehicle = async () => {
        try {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicleToDelete.id);

            if (error) throw error;

            setVehicles(vehicles.filter(veh => veh.id !== vehicleToDelete.id));
            setShowDeleteConfirm(false);
            setVehicleToDelete(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle vehicle assignment
    const handleAssignVehicle = async (vehicleId, userId) => {
        try {
            console.log('🚗 Vehicle Assignment Debug - vehicleId:', vehicleId, 'userId:', userId, 'typeof userId:', typeof userId);

            // Find the user to check if it's a dummy user
            const user = users.find(u => u.id === userId);
            console.log('🚗 Vehicle Assignment Debug - user found:', user);
            console.log('🚗 Vehicle Assignment Debug - isDummy:', user?.isDummy);

            const assignmentData = {
                vehicle_id: vehicleId,
                user_id: userId,
                assigned_by: currentUser.id
            };

            console.log('🚗 Vehicle Assignment Debug - assignment data:', assignmentData);

            const { data, error } = await supabase
                .from('vehicle_assignments')
                .insert([assignmentData])
                .select();

            if (error) {
                console.error('🚨 Vehicle Assignment Error:', error);
                throw error;
            }

            console.log('✅ Vehicle Assignment successful:', data);

            // Log vehicle audit
            const vehicle = vehicles.find(v => v.id === vehicleId);
            await logVehicleAudit('assigned', vehicleId, {
                assigned_to_user_id: userId,
                message: `Vehicle assigned to ${user?.name || 'Unknown User'}`,
                vehicle_name: vehicle?.name
            });

            // Update vehicle status to assigned
            await supabase
                .from('vehicles')
                .update({ status: 'assigned' })
                .eq('id', vehicleId);

            // Reload data
            await loadData();
            setShowAssignModal(false);
            setSelectedVehicle(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle vehicle return with confirmation
    const handleReturnVehicle = async () => {
        try {
            const assignment = getCurrentAssignment(vehicleToReturn.id);
            if (assignment) {
                // Get user info for audit logging
                const assignedUser = users.find(u => u.id === assignment.user_id);

                // Update assignment with return timestamp
                await supabase
                    .from('vehicle_assignments')
                    .update({
                        returned_at: new Date().toISOString(),
                        returned_by: currentUser.id
                    })
                    .eq('id', assignment.id);

                // Log vehicle audit
                await logVehicleAudit('returned', vehicleToReturn.id, {
                    user_id: assignment.user_id,
                    previous_user_id: assignment.user_id,
                    message: `Vehicle returned from ${assignedUser?.name || 'Unknown User'}`,
                    vehicle_name: vehicleToReturn?.name
                });

                // Update vehicle status to available
                await supabase
                    .from('vehicles')
                    .update({ status: 'available' })
                    .eq('id', vehicleToReturn.id);

                // Reload data
                await loadData();
            }
            setShowReturnConfirm(false);
            setVehicleToReturn(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle comment addition
    const handleAddComment = async (vehicleId) => {
        if (!newComment.trim()) return;

        try {
            const { data, error } = await supabase
                .from('vehicle_comments')
                .insert([{
                    vehicle_id: vehicleId,
                    comment: newComment.trim(),
                    created_by: currentUser.id
                }])
                .select();

            if (error) throw error;

            await loadComments();
            setNewComment('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle comment deletion
    const handleDeleteComment = async (commentId) => {
        try {
            const { error } = await supabase
                .from('vehicle_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;
            await loadComments();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    // Vehicle status sections
    const availableVehicles = filteredVehicles.filter(vehicle => vehicle.status === 'available');
    const maintenanceVehicles = filteredVehicles.filter(vehicle => vehicle.status === 'maintenance');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Vehicle Management</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowAuditTrail(true);
                            loadAuditTrail();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                        <History className="h-4 w-4" />
                        Vehicle Audit Trail
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-600 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    {/* Category Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowCategoryDropdown(!showCategoryDropdown);
                                setShowDepartmentDropdown(false);
                                setShowUserDropdown(false);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center"
                        >
                            <span>{selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} category${selectedCategories.length === 1 ? '' : 'ies'} selected`}</span>
                            <svg className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showCategoryDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <div className="p-2">
                                    <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.length === categories.length}
                                            onChange={handleSelectAllCategories}
                                            className="form-checkbox text-orange-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Select All Categories</span>
                                    </label>
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat.value)}
                                                onChange={() => handleCategoryToggle(cat.value)}
                                                className="form-checkbox text-orange-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{cat.value}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Department Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowDepartmentDropdown(!showDepartmentDropdown);
                                setShowCategoryDropdown(false);
                                setShowUserDropdown(false);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center"
                        >
                            <span>{selectedDepartments.length === 0 ? 'All Departments' : `${selectedDepartments.length} department${selectedDepartments.length === 1 ? '' : 's'} selected`}</span>
                            <svg className={`w-4 h-4 transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showDepartmentDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <div className="p-2">
                                    <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.length === departments.length}
                                            onChange={handleSelectAllDepartments}
                                            className="form-checkbox text-orange-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Select All Departments</span>
                                    </label>
                                    {departments.map(dept => (
                                        <label key={dept} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedDepartments.includes(dept)}
                                                onChange={() => handleDepartmentToggle(dept)}
                                                className="form-checkbox text-orange-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{dept}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowUserDropdown(!showUserDropdown);
                                setShowCategoryDropdown(false);
                                setShowDepartmentDropdown(false);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center"
                        >
                            <span>{selectedUsers.length === 0 ? 'All Users' : `${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected`}</span>
                            <svg className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showUserDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <div className="p-2">
                                    <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.length === users.filter(user => user.name && user.name.trim() !== '').length}
                                            onChange={handleSelectAllUsers}
                                            className="form-checkbox text-orange-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Select All Users</span>
                                    </label>
                                    {users
                                        .filter(user => user.name && user.name.trim() !== '')
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(user => (
                                            <label key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => handleUserToggle(user.id)}
                                                    className="form-checkbox text-orange-500"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                                                    {user.isDummy && (
                                                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                                                            Dummy
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                    {canAddVehicles && (
                        <div>
                            <button
                                onClick={() => {
                                    setError(''); // Clear any previous errors
                                    // Reset form to blank values
                                    setVehicleForm({
                                        name: '',
                                        description: '',
                                        category: '',
                                        serial_number: '',
                                        status: 'available',
                                        purchase_date: '',
                                        warranty_expiry: '',
                                        location: ''
                                    });
                                    setShowAddVehicle(true);
                                }}
                                className="w-full bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 flex items-center justify-center gap-2"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Vehicle
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Vehicle Sections */}
            <div className="space-y-6">
                {/* Available & Maintenance Vehicles - Merged Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h2 className={`text-xl font-semibold ${
                                showAvailableVehicles
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-yellow-600 dark:text-yellow-400'
                            }`}>
                                {showAvailableVehicles
                                    ? `Available Vehicles (${availableVehicles.length})`
                                    : `Maintenance Vehicles (${maintenanceVehicles.length})`
                                }
                            </h2>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setShowAvailableVehicles(true)}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                        showAvailableVehicles
                                            ? 'bg-green-500 text-white'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400'
                                    }`}
                                >
                                    Available ({availableVehicles.length})
                                </button>
                                <button
                                    onClick={() => setShowAvailableVehicles(false)}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                        !showAvailableVehicles
                                            ? 'bg-yellow-500 text-white'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400'
                                    }`}
                                >
                                    Maintenance ({maintenanceVehicles.length})
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        {showAvailableVehicles ? (
                            // Available Vehicles Content
                            availableVehicles.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No available vehicles found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availableVehicles.map(vehicle => {
                                        const assignment = getCurrentAssignment(vehicle.id);
                                        const isAssigned = assignment !== undefined;
                                        const assignedUser = isAssigned ? getUserById(assignment.user_id) : null;

                                        return (
                                            <div key={vehicle.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <h3 className="font-semibold text-gray-800 dark:text-white">{vehicle.name}</h3>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(isAssigned ? 'assigned' : 'available')}`}>
                                                                {isAssigned ? 'Assigned' : 'Available'}
                                                            </span>
                                                        </div>
                                                        {isAssigned && assignedUser && (
                                                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                                                Assigned to: {assignedUser.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {canAssignVehicles && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedVehicle(vehicle);
                                                                    setShowAssignModal(true);
                                                                }}
                                                                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                                                                title="Assign vehicle"
                                                            >
                                                                <Users className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isEditorOrAbove && (
                                                            <button
                                                                onClick={() => {
                                                                    setVehicleForm({
                                                                        name: vehicle.name || '',
                                                                        description: vehicle.description || '',
                                                                        category: vehicle.category || '',
                                                                        serial_number: vehicle.serial_number || '',
                                                                        status: vehicle.status || 'available',
                                                                        purchase_date: vehicle.purchase_date || '',
                                                                        warranty_expiry: vehicle.warranty_expiry || '',
                                                                        location: vehicle.location || ''
                                                                    });
                                                                    setVehicleToEdit(vehicle);
                                                                    setShowEditVehicle(true);
                                                                }}
                                                                className="p-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                                title="Edit vehicle"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isEditorOrAbove && (
                                                            <button
                                                                onClick={() => {
                                                                    setVehicleToDelete(vehicle);
                                                                    setShowDeleteConfirm(true);
                                                                }}
                                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                                                                title="Delete vehicle"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setShowComments(showComments === vehicle.id ? null : vehicle.id)}
                                                            className="p-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                            title="Comments"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                    {vehicle.purchase_date && (
                                                        <p><span className="font-medium">Purchased:</span> {new Date(vehicle.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                                    )}
                                                </div>

                                                {/* Comments Section */}
                                                {showComments === vehicle.id && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                        <h4 className="font-medium text-gray-800 dark:text-white mb-2">Comments</h4>
                                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                                            {comments.filter(c => c.vehicle_id === vehicle.id).map(comment => {
                                                                const user = getUserById(comment.created_by);
                                                                return (
                                                                    <div key={comment.id} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-grow">
                                                                                <p className="text-gray-800 dark:text-white">{comment.comment}</p>
                                                                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                                                                    {user?.name || 'Unknown'} - {new Date(comment.created_at).toLocaleString('en-US', {
                                                                                        year: 'numeric',
                                                                                        month: 'short',
                                                                                        day: 'numeric',
                                                                                        hour: 'numeric',
                                                                                        minute: '2-digit',
                                                                                        hour12: true
                                                                                    })}
                                                                                </p>
                                                                            </div>
                                                                            {(canDeleteVehicleComments || comment.created_by === currentUser.id) && (
                                                                                <button
                                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                                    className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                                                                                    title="Delete comment"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {canAddVehicleComments && (
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={newComment}
                                                                    onChange={(e) => setNewComment(e.target.value)}
                                                                    placeholder="Add a comment..."
                                                                    className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddComment(vehicle.id);
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleAddComment(vehicle.id)}
                                                                    className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            // Maintenance Vehicles Content
                            maintenanceVehicles.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No vehicles in maintenance found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {maintenanceVehicles.map(vehicle => (
                                        <div key={vehicle.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-semibold text-gray-800 dark:text-white">{vehicle.name}</h3>
                                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor('maintenance')}`}>
                                                            Maintenance
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setVehicleForm({
                                                                name: vehicle.name || '',
                                                                description: vehicle.description || '',
                                                                category: vehicle.category || '',
                                                                serial_number: vehicle.serial_number || '',
                                                                status: vehicle.status || 'available',
                                                                purchase_date: vehicle.purchase_date || '',
                                                                warranty_expiry: vehicle.warranty_expiry || '',
                                                                location: vehicle.location || ''
                                                            });
                                                            setVehicleToEdit(vehicle);
                                                            setShowEditVehicle(true);
                                                        }}
                                                        className="p-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                        title="Edit vehicle"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowComments(showComments === vehicle.id ? null : vehicle.id)}
                                                        className="p-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                        title="Comments"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            </div>

                                            {/* Comments Section */}
                                            {showComments === vehicle.id && (
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                    <h4 className="font-medium text-gray-800 dark:text-white mb-2">Comments</h4>
                                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                                        {comments.filter(c => c.vehicle_id === vehicle.id).map(comment => {
                                                            const user = getUserById(comment.created_by);
                                                            return (
                                                                <div key={comment.id} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-grow">
                                                                            <p className="text-gray-800 dark:text-white">{comment.comment}</p>
                                                                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                                                                {user?.name || 'Unknown'} - {new Date(comment.created_at).toLocaleString('en-US', {
                                                                                    year: 'numeric',
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: 'numeric',
                                                                                    minute: '2-digit',
                                                                                    hour12: true
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                        {(currentUser.privilege === 'Admin' || comment.created_by === currentUser.id) && (
                                                                            <button
                                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                                                                                title="Delete comment"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {canAddVehicleComments && (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newComment}
                                                                onChange={(e) => setNewComment(e.target.value)}
                                                                placeholder="Add a comment..."
                                                                className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleAddComment(vehicle.id);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => handleAddComment(vehicle.id)}
                                                                className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>


                {/* Team Vehicle Assignments Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">


                    {/* Users and Their Assigned Vehicles */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                Team Vehicle Assignments
                                {(selectedDepartments.length > 0 || selectedUsers.length > 0) && (
                                    <span className="text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                                        {selectedUsers.length > 0 ?
                                            `- ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected` :
                                            `- ${selectedDepartments.length} department${selectedDepartments.length === 1 ? '' : 's'} + Users with Vehicles`
                                        }
                                    </span>
                                )}
                            </h2>
                            <button
                                onClick={() => setShowOnlyUsersWithVehicles(!showOnlyUsersWithVehicles)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    showOnlyUsersWithVehicles
                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {showOnlyUsersWithVehicles ? 'Showing Users with Vehicles' : 'Show All Users'}
                            </button>
                        </div>
                        {selectedDepartments.length > 0 && selectedUsers.length === 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Showing selected department members and all users with assigned vehicles
                            </p>
                        )}
                        {selectedUsers.length > 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Showing vehicle assignments for selected users
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {users.filter(user => {
                            const userAssignments = assignments.filter(a => a.user_id === user.id && !a.returned_at);

                            // Apply category filter to user's assigned vehicles
                            const filteredUserVehicles = userAssignments.map(assignment => {
                                const vehicleItem = vehicles.find(e => e.id === assignment.vehicle_id);
                                return vehicleItem;
                            }).filter(Boolean).filter(item => {
                                const matchesCategory = selectedCategories.length === 0 || selectedCategories.length === categories.length || selectedCategories.includes(item.category);
                                return matchesCategory;
                            });

                            const hasAssignedVehicles = filteredUserVehicles.length > 0;
                            const matchesDepartmentFilter = selectedDepartments.length === 0 || selectedDepartments.length === departments.length || selectedDepartments.includes(user.department);
                            const matchesUserFilter = selectedUsers.length === 0 || selectedUsers.length === users.filter(u => u.name && u.name.trim() !== '').length || selectedUsers.includes(user.id);

                            // If "Only Users with Vehicles" is enabled, filter out users without vehicles
                            if (showOnlyUsersWithVehicles && !hasAssignedVehicles) {
                                return false;
                            }

                            // If category filter is active, only show users with vehicles in that category
                            if (selectedCategories.length > 0 && selectedCategories.length < categories.length) {
                                return hasAssignedVehicles && matchesDepartmentFilter && matchesUserFilter;
                            }

                            // Show user if they match both department and user filters, OR have assigned vehicles (when no specific filters)
                            if (selectedUsers.length > 0 && selectedUsers.length < users.filter(u => u.name && u.name.trim() !== '').length) {
                                return matchesUserFilter && (selectedDepartments.length === 0 || selectedDepartments.length === departments.length || matchesDepartmentFilter);
                            } else {
                                return matchesDepartmentFilter || hasAssignedVehicles;
                            }
                        }).map(user => {
                            const userAssignments = assignments.filter(a => a.user_id === user.id && !a.returned_at);
                            const userVehicles = userAssignments.map(assignment => {
                                const vehicleItem = vehicles.find(e => e.id === assignment.vehicle_id);
                                return { ...vehicleItem, assignment };
                            }).filter(Boolean).filter(item => {
                                // Apply category filter to assigned vehicles
                                const matchesCategory = selectedCategories.length === 0 || selectedCategories.length === categories.length || selectedCategories.includes(item.category);
                                return matchesCategory;
                            });

                            return (
                                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className={`w-12 h-12 ${getDepartmentColor(user.department)} rounded-full flex items-center justify-center text-white font-semibold`}>
                                            {getAvatarText(user)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{user.name}</h3>
                                                {user.isDummy && (
                                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                                                        Dummy User
                                                    </span>
                                                )}
                                                {selectedDepartments.length > 0 && !selectedDepartments.includes(user.department) && userVehicles.length > 0 && (
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                                                        Has Vehicles
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                {user.department || 'No Department'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                                {userVehicles.length} vehicle{userVehicles.length !== 1 ? 's' : ''} assigned
                                            </p>
                                        </div>
                                    </div>

                                    {userVehicles.length > 0 ? (
                                        <div className="space-y-3">
                                            {userVehicles.map((vehicleData, index) => (
                                                <div key={index} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-grow">
                                                            <h4 className="font-medium text-blue-800 dark:text-blue-300">{vehicleData.name}</h4>
                                                            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1 mt-1">
                                                                <p><span className="font-medium">Assigned:</span> {new Date(vehicleData.assignment.assigned_at).toLocaleString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {canReturnVehicles && (
                                                                <button
                                                                    onClick={() => {
                                                                        setVehicleToReturn(vehicleData);
                                                                        setShowReturnConfirm(true);
                                                                    }}
                                                                    className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                                                                    title="Return vehicle"
                                                                >
                                                                    <Users className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setShowComments(showComments === vehicleData.id ? null : vehicleData.id)}
                                                                className="p-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                                                title="Comments"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Comments Section */}
                                                    {showComments === vehicleData.id && (
                                                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                                                            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Comments</h4>
                                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                                {comments.filter(c => c.vehicle_id === vehicleData.id).map(comment => {
                                                                    const user = getUserById(comment.created_by);
                                                                    return (
                                                                        <div key={comment.id} className="text-xs bg-blue-100 dark:bg-blue-800/50 p-2 rounded">
                                                                            <div className="flex justify-between items-start">
                                                                                <div className="flex-grow">
                                                                                    <p className="text-blue-900 dark:text-blue-100">{comment.comment}</p>
                                                                                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                                                                                        {user?.name || 'Unknown'} - {new Date(comment.created_at).toLocaleString('en-US', {
                                                                                            year: 'numeric',
                                                                                            month: 'short',
                                                                                            day: 'numeric',
                                                                                            hour: 'numeric',
                                                                                            minute: '2-digit',
                                                                                            hour12: true
                                                                                        })}
                                                                                    </p>
                                                                                </div>
                                                                                {(currentUser.privilege === 'Admin' || comment.created_by === currentUser.id) && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteComment(comment.id)}
                                                                                        className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                                                                                        title="Delete comment"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {canAddVehicleComments && (
                                                                <div className="flex gap-2 mt-2">
                                                                    <input
                                                                        type="text"
                                                                        value={newComment}
                                                                        onChange={(e) => setNewComment(e.target.value)}
                                                                        placeholder="Add a comment..."
                                                                        className="flex-1 text-xs px-2 py-1 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-blue-900/30 dark:text-blue-100 placeholder-blue-400 dark:placeholder-blue-300"
                                                                        onKeyPress={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleAddComment(vehicleData.id);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleAddComment(vehicleData.id)}
                                                                        className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">No vehicles currently assigned</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Vehicle</h2>
                            <form onSubmit={handleAddVehicle}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.name}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            value={vehicleForm.description}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Category</label>
                                        <select
                                            value={vehicleForm.category}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.value}>{cat.value}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Registration</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.serial_number}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, serial_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Status</label>
                                        <select
                                            value={vehicleForm.status}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="available">Available</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={vehicleForm.purchase_date}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">MOT Expiry</label>
                                        <input
                                            type="date"
                                            value={vehicleForm.warranty_expiry}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, warranty_expiry: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.location}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
                                    >
                                        Add Vehicle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddVehicle(false)}
                                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Vehicle Modal */}
            {showEditVehicle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Edit Vehicle</h2>
                            <form onSubmit={handleEditVehicle}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.name}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            value={vehicleForm.description}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Category</label>
                                        <select
                                            value={vehicleForm.category}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.value}>{cat.value}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Registration</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.serial_number}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, serial_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Status</label>
                                        <select
                                            value={vehicleForm.status}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="available">Available</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={vehicleForm.purchase_date}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">MOT Expiry</label>
                                        <input
                                            type="date"
                                            value={vehicleForm.warranty_expiry}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, warranty_expiry: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={vehicleForm.location}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
                                    >
                                        Update Vehicle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditVehicle(false);
                                            setVehicleToEdit(null);
                                        }}
                                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Vehicle Modal */}
            {showAssignModal && selectedVehicle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Assign Vehicle</h2>
                            <p className="mb-4 text-gray-600 dark:text-gray-400">
                                Assign <strong>{selectedVehicle.name}</strong> to:
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {users.filter(user => {
                                    const matchesDepartmentFilter = selectedDepartments.length === 0 || selectedDepartments.length === departments.length || selectedDepartments.includes(user.department);
                                    const matchesUserFilter = selectedUsers.length === 0 || selectedUsers.length === users.filter(u => u.name && u.name.trim() !== '').length || selectedUsers.includes(user.id);
                                    return matchesDepartmentFilter && matchesUserFilter;
                                }).map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAssignVehicle(selectedVehicle.id, user.id)}
                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{user.name}</span>
                                            {user.isDummy && (
                                                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                                                    Dummy
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            <div>{user.department || 'No Department'}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedVehicle(null);
                                }}
                                className="w-full mt-4 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Confirmation Modal */}
            {showReturnConfirm && vehicleToReturn && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Confirm Vehicle Return</h2>
                            <p className="mb-4 text-gray-600 dark:text-gray-400">
                                Are you sure you want to return <strong>{vehicleToReturn.name}</strong>?
                                {(() => {
                                    const assignment = getCurrentAssignment(vehicleToReturn.id);
                                    const assignedUser = assignment ? getUserById(assignment.user_id) : null;
                                    return assignedUser ? (
                                        <span className="block mt-2">
                                            Currently assigned to: <strong>{assignedUser.name}</strong> ({assignedUser.department || 'No Department'})
                                        </span>
                                    ) : null;
                                })()}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReturnVehicle}
                                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
                                >
                                    Confirm Return
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReturnConfirm(false);
                                        setVehicleToReturn(null);
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && vehicleToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
                            <p className="mb-4 text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete <strong>{vehicleToDelete.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDeleteVehicle}
                                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setVehicleToDelete(null);
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Audit Trail Modal */}
            {showAuditTrail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <History className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vehicle Audit Trail</h2>
                            </div>
                            <button
                                onClick={() => setShowAuditTrail(false)}
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
                                {auditTrailError ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                        <div className="text-center max-w-2xl">
                                            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            {auditTrailError === 'table_not_found' ? (
                                                <>
                                                    <h3 className="text-lg font-medium mb-2">Vehicle Audit Trail Setup Required</h3>
                                                    <p className="mb-4">The vehicle audit trail table needs to be created in your database to track vehicle movements.</p>
                                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
                                                        <h4 className="font-medium mb-2">Run this SQL in your Supabase SQL Editor:</h4>
                                                        <pre className="text-sm bg-gray-200 dark:bg-gray-900 p-2 rounded overflow-x-auto">
{`CREATE TABLE vehicle_audit_log (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID,
    action_type VARCHAR(50) NOT NULL,
    user_id UUID,
    assigned_to_user_id UUID,
    performed_by_user_id UUID,
    previous_user_id UUID,
    details TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vehicle_audit_log_vehicle_id
ON vehicle_audit_log(vehicle_id);

CREATE INDEX idx_vehicle_audit_log_created_at
ON vehicle_audit_log(created_at DESC);`}
                                                        </pre>
                                                    </div>
                                                    <p className="mt-4 text-sm">After creating the table, refresh this page to start tracking vehicle movements.</p>
                                                    <button
                                                        onClick={loadAuditTrail}
                                                        className="mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                                                    >
                                                        Retry Loading
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <h3 className="text-lg font-medium mb-2">Error Loading Audit Trail</h3>
                                                    <p className="mb-4 text-red-600 dark:text-red-400">{auditTrailError}</p>
                                                    <button
                                                        onClick={loadAuditTrail}
                                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                                                    >
                                                        Retry Loading
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : auditTrailData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                        <div className="text-center">
                                            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <h3 className="text-lg font-medium mb-2">No Audit Trail Entries</h3>
                                            <p>No vehicle movements have been recorded yet.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {auditTrailData.map(entry => {
                                            const actionColor = {
                                                'assigned': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                                                'returned': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                                                'transferred': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
                                                'created': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
                                                'updated': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                                                'deleted': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }[entry.action_type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';

                                            // Generate meaningful description based on action type
                                            const getActionDescription = (entry) => {
                                                const vehicleName = entry.vehicle?.name || 'Unknown Vehicle';
                                                const performedBy = entry.performed_by?.name || 'Unknown User';

                                                switch (entry.action_type) {
                                                    case 'assigned':
                                                        const assignedTo = entry.assigned_to_user?.name || 'Unknown User';
                                                        return `${vehicleName} was assigned to ${assignedTo} by ${performedBy}`;

                                                    case 'returned':
                                                        const returnedFrom = entry.user?.name || entry.previous_user?.name || 'Unknown User';
                                                        return `${vehicleName} was returned from ${returnedFrom} by ${performedBy}`;

                                                    case 'transferred':
                                                        const transferredFrom = entry.previous_user?.name || 'Unknown User';
                                                        const transferredTo = entry.assigned_to_user?.name || 'Unknown User';
                                                        return `${vehicleName} was transferred from ${transferredFrom} to ${transferredTo} by ${performedBy}`;

                                                    default:
                                                        return `${vehicleName} was ${entry.action_type} by ${performedBy}`;
                                                }
                                            };

                                            return (
                                                <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${actionColor} flex-shrink-0 mt-0.5`}>
                                                                {entry.action_type.toUpperCase()}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-gray-900 dark:text-white font-medium leading-relaxed">
                                                                    {getActionDescription(entry)}
                                                                </p>
                                                                {entry.vehicle?.serial_number && (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                        Serial Number: {entry.vehicle.serial_number}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 text-right flex-shrink-0 ml-4">
                                                            <div>
                                                                {new Date(entry.created_at).toLocaleDateString([], {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="text-xs">
                                                                {new Date(entry.created_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {auditTrailData.length} {auditTrailData.length === 1 ? 'entry' : 'entries'} shown
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={loadAuditTrail}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Refresh
                                </button>
                                {auditTrailData.length > 0 && (
                                    <>
                                        <button
                                            onClick={exportAuditTrailCSV}
                                            className="px-4 py-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 border border-green-300 dark:border-green-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Export CSV
                                        </button>
                                        <button
                                            onClick={() => setShowClearAuditConfirm(true)}
                                            className="px-4 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Clear All
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowAuditTrail(false)}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Audit Trail Confirmation Modal */}
            {showClearAuditConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Clear Vehicle Audit Trail
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to clear all vehicle audit trail entries? This will permanently delete all vehicle movement records and cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearAuditConfirm(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearAuditTrail}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehiclesPage;