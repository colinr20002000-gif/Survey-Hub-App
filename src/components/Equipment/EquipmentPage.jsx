import React, { useState, useEffect, useCallback } from 'react';
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


// Equipment Management Page Component
const EquipmentPage = () => {
    const { user: currentUser } = useAuth();
    const { canAssignEquipment, canReturnEquipment, canAddEquipment, canAddEquipmentComments, canDeleteEquipmentComments, isEditorOrAbove } = usePermissions();
    const [equipment, setEquipment] = useState([]);
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
    const [showAddEquipment, setShowAddEquipment] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [showComments, setShowComments] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [showEditEquipment, setShowEditEquipment] = useState(false);
    const [equipmentToEdit, setEquipmentToEdit] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [equipmentToDelete, setEquipmentToDelete] = useState(null);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const [equipmentToReturn, setEquipmentToReturn] = useState(null);
    const [showMaintenanceEquipment, setShowMaintenanceEquipment] = useState(false);
    const [showAuditTrail, setShowAuditTrail] = useState(false);
    const [auditTrailData, setAuditTrailData] = useState([]);
    const [auditTrailError, setAuditTrailError] = useState(null);
    const [showClearAuditConfirm, setShowClearAuditConfirm] = useState(false);
    const [showOnlyUsersWithEquipment, setShowOnlyUsersWithEquipment] = useState(true);
    const [showDiscrepancies, setShowDiscrepancies] = useState(false);
    const [discrepanciesData, setDiscrepanciesData] = useState([]); // eslint-disable-line no-unused-vars
    const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false); // eslint-disable-line no-unused-vars
    const [copied, setCopied] = useState(false);

    // Equipment form state
    const [equipmentForm, setEquipmentForm] = useState({
        name: '',
        model: '',
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

        // Set up real-time subscriptions for equipment, assignments, and comments
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
                    console.log('🔧 Equipment table changed:', payload.eventType, payload);
                    loadEquipment(); // Reload equipment data
                }
            )
            .subscribe((status) => {
                console.log('📡 Equipment subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to equipment real-time updates');
                } else if (status === 'CLOSED') {
                    console.log('❌ Equipment subscription closed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Equipment subscription error');
                }
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
                    console.log('📋 Equipment assignments changed:', payload.eventType, payload);
                    loadAssignments(); // Reload assignments
                }
            )
            .subscribe((status) => {
                console.log('📡 Assignments subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to assignments real-time updates');
                } else if (status === 'CLOSED') {
                    console.log('❌ Assignments subscription closed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Assignments subscription error');
                }
            });

        const commentsSubscription = supabase
            .channel('equipment-comments-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment_comments'
                },
                (payload) => {
                    console.log('💬 Equipment comments changed:', payload.eventType, payload);
                    loadComments(); // Reload comments
                }
            )
            .subscribe((status) => {
                console.log('📡 Comments subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to comments real-time updates');
                } else if (status === 'CLOSED') {
                    console.log('❌ Comments subscription closed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Comments subscription error');
                }
            });

        return () => {
            console.log('🧹 Cleaning up equipment subscriptions');
            try {
                supabase.removeChannel(equipmentSubscription);
                supabase.removeChannel(assignmentsSubscription);
                supabase.removeChannel(commentsSubscription);
            } catch (error) {
                console.warn('⚠️ Error during subscription cleanup (non-critical):', error);
            }
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
                loadEquipment(),
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

    const loadEquipment = async () => {
        const { data, error } = await supabase
            .from('equipment')
            .select('*')
            .order('name');

        if (error) throw error;
        setEquipment(data || []);
    };

    const loadUsers = async () => {
        try {
            // Fetch real users (exclude soft deleted users)
            const { data: realUsers, error: realUsersError } = await supabase
                .from('users')
                .select('id, name, email, department')
                .is('deleted_at', null)
                .order('name');

            // Fetch active dummy users (exclude soft deleted users)
            const { data: dummyUsers, error: dummyUsersError } = await supabase
                .from('dummy_users')
                .select('id, name, email, department')
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

            console.log('👥 Users loaded - total:', allUsers.length);
            console.log('👥 Real users:', allUsers.filter(u => !u.isDummy).length);
            console.log('👥 Dummy users:', allUsers.filter(u => u.isDummy).length);
            console.log('👥 Sample users:', allUsers.slice(0, 3).map(u => ({ id: u.id, name: u.name, isDummy: u.isDummy })));

            setUsers(allUsers);

            // Extract unique departments from all users
            const uniqueDepartments = [...new Set(allUsers
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
            }

            // Now look specifically for equipment_type
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id, name')
                .eq('name', 'equipment_type')
                .maybeSingle();

            console.log('🎯 equipment_type category search result:', categoryData);

            if (categoryError) {
                console.error('❌ Error fetching equipment_type category:', categoryError);
                setCategories([]);
                return;
            }

            if (!categoryData) {
                console.log('⚠️ equipment_type category not found in dropdown_categories');
                console.log('💡 Make sure the category name is exactly "equipment_type"');
                setCategories([]);
                return;
            }

            console.log('✅ Found equipment_type category with ID:', categoryData.id);

            // Then get all items for that category
            const { data, error } = await supabase
                .from('dropdown_items')
                .select('*')
                .eq('category_id', categoryData.id)
                .order('value');

            console.log('📦 equipment_type items found:', data);

            if (error) {
                console.error('❌ Error fetching equipment_type items:', error);
                setCategories([]);
                return;
            }

            setCategories(data || []);
            console.log('✅ Categories loaded successfully:', data?.length || 0, 'items');
        } catch (err) {
            console.error('💥 Error in loadCategories:', err);
            setCategories([]);
        }
    };

    const loadAssignments = async () => {
        const { data, error } = await supabase
            .from('equipment_assignments')
            .select('*')
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        console.log('📋 Assignments loaded:', data?.length || 0, 'total assignments');
        console.log('📋 Active assignments:', data?.filter(a => !a.returned_at)?.length || 0);
        console.log('📋 Assignment data sample:', data?.slice(0, 3));
        setAssignments(data || []);
    };

    const loadComments = async () => {
        const { data, error } = await supabase
            .from('equipment_comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
    };

    const loadAuditTrail = async () => {
        try {
            console.log('📋 Loading equipment audit trail...');
            setAuditTrailError(null);

            const { data, error } = await supabase
                .from('equipment_audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) {
                console.error('❌ Error loading audit trail:', error);
                // Check if it's a table doesn't exist error
                if (error.message?.includes('does not exist') ||
                    error.message?.includes('relation "equipment_audit_log" does not exist') ||
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

                // Enhance the audit data with equipment and user information
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
            const equipmentIds = [...new Set(auditData.map(entry => entry.equipment_id).filter(Boolean))];
            const userIds = [...new Set(auditData.flatMap(entry =>
                [entry.user_id, entry.assigned_to_user_id, entry.performed_by_user_id, entry.previous_user_id]
                    .filter(Boolean)
            ))];

            // Batch load equipment data from local state only
            // (Don't query DB for missing records - they're likely deleted and blocked by RLS)
            const equipmentMap = new Map();
            if (equipmentIds.length > 0) {
                equipmentIds.forEach(equipmentId => {
                    const localEquipment = equipment.find(eq => eq.id === equipmentId);
                    if (localEquipment) {
                        equipmentMap.set(equipmentId, localEquipment);
                    }
                    // If not in local state, it's deleted - will show as "Unknown Equipment"
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
                equipment: entry.equipment_id ? equipmentMap.get(entry.equipment_id) : null,
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
            console.log('🗑️ Clearing equipment audit trail...');

            const { error } = await supabase
                .from('equipment_audit_log')
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
            console.log('📁 Exporting audit trail to CSV...');

            if (!auditTrailData || auditTrailData.length === 0) {
                console.log('⚠️ No audit trail data to export');
                return;
            }

            // Define CSV headers
            const headers = [
                'Date',
                'Time',
                'Action',
                'Equipment Name',
                'Serial Number',
                'Equipment Type',
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
                    entry.equipment?.name || 'Unknown Equipment', // Equipment Name
                    entry.equipment?.serial_number || '', // Serial Number
                    entry.equipment?.device_type || '', // Equipment Type
                    entry.equipment?.brand || '', // Brand
                    entry.equipment?.model || '', // Model
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
            link.setAttribute('download', `equipment_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('✅ Audit trail CSV export completed');

        } catch (error) {
            console.error('❌ Error exporting audit trail CSV:', error);
        }
    };

    /*
    const createAuditLogTable = async () => {
        try {
            console.log('🔧 Creating equipment_audit_log table...');

            // Try to create the table using a basic approach
            // Note: This might require manual database creation
            const { error } = await supabase
                .from('equipment_audit_log')
                .insert([{
                    equipment_id: '00000000-0000-0000-0000-000000000000',
                    action_type: 'test',
                    performed_by_user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000',
                    details: 'Table creation test',
                    metadata: '{}',
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.log('⚠️ Audit log table creation failed. Please create the table manually in your database.');
                console.log('SQL to create table:');
                console.log(`
CREATE TABLE equipment_audit_log (
    id SERIAL PRIMARY KEY,
    equipment_id UUID,
    action_type VARCHAR(50) NOT NULL,
    user_id UUID,
    assigned_to_user_id UUID,
    performed_by_user_id UUID,
    previous_user_id UUID,
    details TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
                `);
                return false;
            } else {
                console.log('✅ Audit log table created successfully');
                // Remove the test entry
                await supabase
                    .from('equipment_audit_log')
                    .delete()
                    .eq('action_type', 'test');
                return true;
            }
        } catch (err) {
            console.error('Error in createAuditLogTable:', err);
            console.log('⚠️ Please create the equipment_audit_log table manually in your database.');
            return false;
        }
    };
    */

    const logEquipmentAudit = async (action, equipmentId, details = {}) => {
        try {
            const auditEntry = {
                equipment_id: equipmentId,
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
                    equipment_name: details.equipment_name || null,
                    ...details.extra_data
                }),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('equipment_audit_log')
                .insert([auditEntry]);

            if (error) {
                // Check if it's a table doesn't exist error
                if (error.message?.includes('does not exist') ||
                    error.message?.includes('relation "equipment_audit_log" does not exist') ||
                    error.code === 'PGRST116' ||
                    error.code === '42P01') {
                    console.log('⚠️ Audit log table does not exist - audit entry not recorded');
                    console.log('📋 To create the table, please run the SQL script from the Equipment Audit Trail');
                } else {
                    console.error('❌ Error logging equipment audit:', error);
                }
            } else {
                console.log('✅ Audit log entry created successfully');
            }
        } catch (err) {
            console.error('❌ Error in logEquipmentAudit:', err);
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

    // Filter equipment based on search and filters
    const filteredEquipment = equipment.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             item.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             item.serial_number?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.length === categories.length || selectedCategories.includes(item.category);

        return matchesSearch && matchesCategory;
    });

    // Get current assignment for equipment
    const getCurrentAssignment = (equipmentId) => {
        return assignments.find(a => a.equipment_id === equipmentId && !a.returned_at);
    };

    // Get most recent assignment for equipment (including returned ones)
    const getMostRecentAssignment = (equipmentId) => {
        return assignments
            .filter(a => a.equipment_id === equipmentId)
            .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0];
    };

    // Handle equipment form submission
    const handleAddEquipment = async (e) => {
        e.preventDefault();
        setError(''); // Clear any previous errors

        try {
            // Validate required fields
            if (!equipmentForm.name?.trim()) {
                throw new Error('Equipment name is required');
            }


            // Validate serial number uniqueness if provided
            if (equipmentForm.serial_number?.trim()) {
                const existingEquipment = equipment.find(eq =>
                    eq.serial_number &&
                    eq.serial_number.toLowerCase() === equipmentForm.serial_number.trim().toLowerCase()
                );
                if (existingEquipment) {
                    throw new Error('An equipment with this serial number already exists');
                }
            }

            // Prepare form data with proper null handling for dates
            const formData = {
                ...equipmentForm,
                name: equipmentForm.name.trim(),
                model: equipmentForm.model?.trim() || '',
                description: equipmentForm.description?.trim() || '',
                serial_number: equipmentForm.serial_number?.trim() || null,
                purchase_date: equipmentForm.purchase_date || null,
                warranty_expiry: equipmentForm.warranty_expiry || null,
                created_by: currentUser.id,
                updated_by: currentUser.id
            };

            const { data, error } = await supabase
                .from('equipment')
                .insert([formData])
                .select();

            if (error) {
                // Handle specific database errors
                if (error.code === '23505') {
                    throw new Error('Equipment with this serial number already exists');
                } else if (error.code === '23502') {
                    throw new Error('Missing required field');
                } else {
                    throw new Error(`Database error: ${error.message}`);
                }
            }

            if (!data || data.length === 0) {
                throw new Error('Failed to create equipment - no data returned');
            }

            // Success - update state and close modal
            setEquipment([...equipment, ...data]);
            setEquipmentForm({
                name: '',
                model: '',
                description: '',
                category: '',
                serial_number: '',
                status: 'available',
                purchase_date: '',
                warranty_expiry: '',
                location: ''
            });
            setShowAddEquipment(false);

            // Optional: Show success message (could add a success state)
            console.log('Equipment added successfully:', data[0].name);

        } catch (err) {
            console.error('Error adding equipment:', err);
            setError(err.message || 'An unexpected error occurred while adding equipment');
        }
    };

    // Handle equipment edit
    const handleEditEquipment = async (e) => {
        e.preventDefault();
        try {
            console.log('🔧 Editing equipment:', {
                equipmentId: equipmentToEdit.id,
                originalSerial: equipmentToEdit.serial_number,
                formSerial: equipmentForm.serial_number,
                serialChanged: equipmentForm.serial_number !== equipmentToEdit.serial_number
            });

            // Check if serial number is being changed and if it already exists
            // Only check if both serial numbers are not empty/null
            const formSerial = equipmentForm.serial_number?.trim();
            const originalSerial = equipmentToEdit.serial_number?.trim();

            if (formSerial && originalSerial && formSerial !== originalSerial) {
                console.log('🔍 Serial number changed, checking for duplicates...');
                const { data: existingEquipment, error: checkError } = await supabase
                    .from('equipment')
                    .select('id')
                    .eq('serial_number', formSerial)
                    .neq('id', equipmentToEdit.id)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                    console.error('❌ Error checking serial number:', checkError);
                    throw checkError;
                }

                if (existingEquipment) {
                    console.log('⚠️ Serial number conflict found:', existingEquipment);
                    setError('Serial number already exists. Please use a unique serial number.');
                    return;
                }
                console.log('✅ Serial number is unique');
            } else if (formSerial && !originalSerial) {
                // Adding a new serial number to equipment that didn't have one
                console.log('🔍 Adding new serial number, checking for duplicates...');
                const { data: existingEquipment, error: checkError } = await supabase
                    .from('equipment')
                    .select('id')
                    .eq('serial_number', formSerial)
                    .neq('id', equipmentToEdit.id)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                    console.error('❌ Error checking new serial number:', checkError);
                    throw checkError;
                }

                if (existingEquipment) {
                    console.log('⚠️ Serial number conflict found:', existingEquipment);
                    setError('Serial number already exists. Please use a unique serial number.');
                    return;
                }
                console.log('✅ New serial number is unique');
            } else {
                console.log('🔄 No serial number validation needed (both empty or same)');
            }

            // Check if equipment name is unique (since name should be unique)
            if (equipmentForm.name.trim() !== equipmentToEdit.name.trim()) {
                console.log('🔍 Equipment name changed, checking for duplicates...');
                const { data: existingEquipment, error: nameCheckError } = await supabase
                    .from('equipment')
                    .select('id')
                    .eq('name', equipmentForm.name.trim())
                    .neq('id', equipmentToEdit.id)
                    .single();

                if (nameCheckError && nameCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
                    console.error('❌ Error checking equipment name:', nameCheckError);
                    throw nameCheckError;
                }

                if (existingEquipment) {
                    console.log('⚠️ Equipment name conflict found:', existingEquipment);
                    setError('Equipment name already exists. Please use a unique equipment name.');
                    return;
                }
                console.log('✅ Equipment name is unique');
            }

            // Prepare form data with proper null handling for dates and serial number
            const formData = {
                name: equipmentForm.name.trim(),
                model: equipmentForm.model?.trim() || '',
                description: equipmentForm.description?.trim() || '',
                category: equipmentForm.category,
                status: equipmentForm.status,
                location: equipmentForm.location?.trim() || '',
                serial_number: equipmentForm.serial_number?.trim() || null, // Convert empty string to null
                purchase_date: equipmentForm.purchase_date || null,
                warranty_expiry: equipmentForm.warranty_expiry || null,
                updated_by: currentUser.id
            };

            console.log('💾 Updating equipment with data:', formData);

            const { data, error } = await supabase
                .from('equipment')
                .update(formData)
                .eq('id', equipmentToEdit.id)
                .select();

            if (error) {
                console.error('❌ Database update error:', error);
                if (error.code === '23505' && error.message.includes('equipment_serial_number_key')) {
                    setError('Serial number already exists. Please use a unique serial number.');
                } else {
                    setError(`Error updating equipment: ${error.message}`);
                }
                return;
            }

            console.log('✅ Equipment updated successfully:', data);

            // Log equipment audit
            await logEquipmentAudit('updated', equipmentToEdit.id, {
                message: `Equipment updated`,
                equipment_name: equipmentForm.name
            });

            // Update equipment in state
            const updatedEquipment = equipment.map(eq =>
                eq.id === equipmentToEdit.id ? data[0] : eq
            );
            setEquipment(updatedEquipment);

            setEquipmentForm({
                name: '',
                model: '',
                description: '',
                category: '',
                serial_number: '',
                status: 'available',
                purchase_date: '',
                warranty_expiry: '',
                location: ''
            });
            setShowEditEquipment(false);
            setEquipmentToEdit(null);
        } catch (err) {
            console.error('❌ Error in handleEditEquipment:', err);
            if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
                setError('Serial number already exists. Please use a unique serial number.');
            } else {
                setError(`Error updating equipment: ${err.message}`);
            }
        }
    };

    // Handle equipment return
    const handleReturnEquipment = async (equipmentId) => {
        try {
            const assignment = getCurrentAssignment(equipmentId);
            if (!assignment) return;

            // Update assignment with return date
            // Store return info including user in return_notes as JSON for compatibility
            const returnInfo = {
                message: 'Returned via Equipment Management',
                returned_by_user_id: currentUser.id,
                returned_by_user_name: currentUser.name,
                returned_at: new Date().toISOString()
            };

            // Try with returned_by field first, fall back without it if field doesn't exist
            let { error: updateError } = await supabase
                .from('equipment_assignments')
                .update({
                    returned_at: new Date().toISOString(),
                    returned_by: currentUser.id,
                    return_notes: JSON.stringify(returnInfo)
                })
                .eq('id', assignment.id);

            // If returned_by field doesn't exist, try without it
            if (updateError && updateError.message?.includes('returned_by')) {
                const { error: fallbackError } = await supabase
                    .from('equipment_assignments')
                    .update({
                        returned_at: new Date().toISOString(),
                        return_notes: JSON.stringify(returnInfo)
                    })
                    .eq('id', assignment.id);

                if (fallbackError) throw fallbackError;
            } else if (updateError) {
                throw updateError;
            }

            // Update equipment status
            const { error: equipmentUpdateError } = await supabase
                .from('equipment')
                .update({
                    status: 'available',
                    updated_by: currentUser.id
                })
                .eq('id', equipmentId);

            if (equipmentUpdateError) {
                console.error('❌ Failed to update equipment status:', equipmentUpdateError);
                throw equipmentUpdateError;
            }

            // Log audit trail
            const equipmentItem = equipment.find(e => e.id === equipmentId);
            const assignedUser = users.find(u => u.id === assignment.user_id);

            await logEquipmentAudit('returned', equipmentId, {
                user_id: assignment.user_id,
                previous_user_id: assignment.user_id,
                message: `Equipment returned by ${assignedUser?.name || 'Unknown User'}`,
                equipment_name: equipmentItem?.name || 'Unknown Equipment',
                extra_data: {
                    assignment_id: assignment.id,
                    returned_at: new Date().toISOString()
                }
            });

            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle equipment assignment
    const handleAssignEquipment = async (equipmentId, userId) => {
        try {
            // Check for existing assignment and return/transfer if needed
            const currentAssignment = getCurrentAssignment(equipmentId);
            if (currentAssignment) {
                 // Mark as returned (transfer logic)
                 const { error: returnError } = await supabase
                    .from('equipment_assignments')
                    .update({
                        returned_at: new Date().toISOString(),
                        return_notes: JSON.stringify({
                            message: 'Transferred via new assignment',
                            transferred_to: userId,
                            transferred_by: currentUser.id
                        })
                    })
                    .eq('id', currentAssignment.id);
                 if (returnError) throw returnError;
            }

            // Create new assignment
            const { error } = await supabase
                .from('equipment_assignments')
                .insert([{
                    equipment_id: equipmentId,
                    user_id: userId,
                    assigned_at: new Date().toISOString(),
                    assigned_by: currentUser.id
                }]);

            if (error) throw error;

            // Update equipment status
            await supabase.from('equipment').update({ status: 'assigned', updated_by: currentUser.id }).eq('id', equipmentId);

            // Audit log
            await logEquipmentAudit('assigned', equipmentId, { assigned_to_user_id: userId });

            setShowAssignModal(false);
            setSelectedEquipment(null);
            loadData();
        } catch (err) {
            console.error('Error assigning equipment:', err);
            setError(err.message);
        }
    };

    // Confirm return
    const confirmReturn = async () => {
        if (!equipmentToReturn) return;
        await handleReturnEquipment(equipmentToReturn.id);
        setShowReturnConfirm(false);
        setEquipmentToReturn(null);
    };

    // Open edit modal
    const openEditModal = (equipmentItem) => {
        setEquipmentToEdit(equipmentItem);
        setEquipmentForm({
            name: equipmentItem.name,
            model: equipmentItem.model || '',
            description: equipmentItem.description || '',
            category: equipmentItem.category || '',
            serial_number: equipmentItem.serial_number || '',
            status: equipmentItem.status,
            purchase_date: equipmentItem.purchase_date || '',
            warranty_expiry: equipmentItem.warranty_expiry || '',
            location: equipmentItem.location || ''
        });
        setShowEditEquipment(true);
    };

    // Open delete confirmation
    const openDeleteConfirm = (equipmentItem) => {
        setEquipmentToDelete(equipmentItem);
        setShowDeleteConfirm(true);
    };

    // Handle delete equipment
    const handleDeleteEquipment = async () => {
        if (!equipmentToDelete) return;
        try {
            const { error } = await supabase.from('equipment').delete().eq('id', equipmentToDelete.id);
            if (error) throw error;
            
            await logEquipmentAudit('deleted', equipmentToDelete.id, { equipment_name: equipmentToDelete.name });
            
            setShowDeleteConfirm(false);
            setEquipmentToDelete(null);
            setShowEditEquipment(false);
            loadData();
        } catch (err) {
            console.error('Error deleting equipment:', err);
            setError(err.message);
        }
    };

    // Open return confirmation
    const openReturnConfirm = (equipmentId) => {
        const item = equipment.find(e => e.id === equipmentId);
        setEquipmentToReturn(item);
        setShowReturnConfirm(true);
    };

    // Handle adding comment
    const handleAddComment = async (equipmentId) => {
        if (!newComment.trim()) return;

        try {
            await supabase
                .from('equipment_comments')
                .insert([{
                    equipment_id: equipmentId,
                    user_id: currentUser.id,
                    comment: newComment.trim()
                }]);

            setNewComment('');
            loadComments();
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle deleting comment
    const handleDeleteComment = async (commentId) => {
        try {
            const { error } = await supabase
                .from('equipment_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            // Remove comment from state
            const updatedComments = comments.filter(c => c.id !== commentId);
            setComments(updatedComments);
        } catch (err) {
            setError(err.message);
        }
    };

    // Get comments for specific equipment
    const getEquipmentComments = (equipmentId) => {
        return comments.filter(c => c.equipment_id === equipmentId);
    };

    // Get user by ID
    const getUserById = (userId) => {
        return users.find(u => u.id === userId) || { name: 'Unknown User', email: '' };
    };

    // Extract returned by user from return_notes (fallback for when returned_by field doesn't exist)
    const getReturnedByUser = (assignment) => {
        // First try the returned_by field if it exists
        if (assignment.returned_by) {
            return getUserById(assignment.returned_by);
        }

        // Fallback: try to parse from return_notes
        if (assignment.return_notes) {
            try {
                const returnInfo = JSON.parse(assignment.return_notes);
                if (returnInfo.returned_by_user_name) {
                    return { name: returnInfo.returned_by_user_name };
                }
                if (returnInfo.returned_by_user_id) {
                    return getUserById(returnInfo.returned_by_user_id);
                }
            } catch (e) {
                // If return_notes is not JSON, it's just a regular note
            }
        }

        return null;
    };

    // Check for discrepancies between calendar and assignments
    /*
    const checkDiscrepancies = async () => {
        setLoadingDiscrepancies(true);
        try {
            // Get all equipment calendar entries
            const { data: calendarData, error: calendarError } = await supabase
                .from('equipment_calendar')
                .select('user_id, equipment_id, allocation_date');

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
                    const user = getUserById(calEntry.user_id);
                    const equipmentItem = equipment.find(e => e.id === calEntry.equipment_id);

                    discrepancies.push({
                        userId: calEntry.user_id,
                        userName: user.name,
                        equipmentId: calEntry.equipment_id,
                        equipmentName: equipmentItem?.name || 'Unknown Equipment'
                    });
                }
            });

            setDiscrepanciesData(discrepancies);
            setShowDiscrepancies(true);
            setCopied(false); // Reset copied state when opening modal
        } catch (err) {
            console.error('Error checking discrepancies:', err);
            setError('Failed to check discrepancies: ' + err.message);
        } finally {
            setLoadingDiscrepancies(false);
        }
    };
    */

    // Copy discrepancies to clipboard
    const copyDiscrepanciesToClipboard = async () => {
        try {
            let text = 'Calendar vs Assignment Discrepancies\n';
            text += '=====================================\n\n';
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

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-lg">Loading equipment...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h3 className="font-bold">Error Loading Equipment</h3>
                <p>{error}</p>
                <button
                    onClick={loadData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Assignments</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage equipment assignments and track usage</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setShowAuditTrail(true);
                                loadAuditTrail();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            <History className="w-5 h-5" />
                            Audit Trail
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Search equipment..."
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
                </div>
            </div>

            {/* Equipment Grid View */}
            <div className="space-y-6">
                    {/* Available Equipment Section with Toggle */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {showMaintenanceEquipment ? 'Equipment Under Maintenance' : 'Available Equipment'}
                            </h3>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setShowMaintenanceEquipment(false)}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                        !showMaintenanceEquipment
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    Available ({filteredEquipment.filter(item => item.status === 'available').length})
                                </button>
                                <button
                                    onClick={() => setShowMaintenanceEquipment(true)}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                        showMaintenanceEquipment
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    Maintenance ({filteredEquipment.filter(item => item.status === 'maintenance').length})
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredEquipment.filter(item =>
                                showMaintenanceEquipment ? item.status === 'maintenance' : item.status === 'available'
                            ).map(item => {
                                const equipmentComments = getEquipmentComments(item.id);
                                const mostRecentAssignment = getMostRecentAssignment(item.id);
                                return (
                                    <div key={item.id} className={`rounded-lg p-4 border ${
                                        item.status === 'maintenance'
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                            : item.status === 'assigned'
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    }`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800 dark:text-white">{item.name}</h4>
                                                {item.status === 'available' && mostRecentAssignment && mostRecentAssignment.returned_at && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                        Last returned: {new Date(mostRecentAssignment.returned_at).toLocaleString([], {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                        {(() => {
                                                            const returnedByUser = getReturnedByUser(mostRecentAssignment);
                                                            return returnedByUser ? ` by ${returnedByUser.name}` : '';
                                                        })()}
                                                    </p>
                                                )}
                                                {item.status === 'assigned' && (() => {
                                                    const currentAssignment = getCurrentAssignment(item.id);
                                                    const assignedUser = currentAssignment ? getUserById(currentAssignment.user_id) : null;
                                                    return assignedUser && (
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                            Assigned to: <strong>{assignedUser.name}</strong>
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status === 'maintenance' ? 'Maintenance' : item.status === 'assigned' ? 'Assigned' : 'Available'}
                                            </span>
                                        </div>

                                        <div className="flex gap-1 mt-3 flex-wrap">
                                            {item.status === 'available' && canAssignEquipment && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedEquipment(item);
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                                >
                                                    Assign
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowComments(showComments === item.id ? null : item.id)}
                                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                                            >
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                {equipmentComments.length}
                                            </button>
                                        </div>

                                        {/* Comments Section */}
                                        {showComments === item.id && (
                                            <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded">
                                                <h5 className="text-xs font-medium mb-2">Comments</h5>
                                                <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                                                    {equipmentComments.map(comment => {
                                                        const commentUser = getUserById(comment.user_id);
                                                        const canDeleteComment = comment.user_id === currentUser.id || canDeleteEquipmentComments;
                                                        return (
                                                            <div key={comment.id} className="text-xs">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <strong>{commentUser.name}</strong>
                                                                            <span className="text-gray-500">
                                                                                {new Date(comment.created_at).toLocaleString([], {
                                                                                    year: 'numeric',
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-700 dark:text-gray-300">{comment.comment}</p>
                                                                    </div>
                                                                    {canDeleteComment && (
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
                                                {canAddEquipmentComments && (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Add comment..."
                                                            value={newComment}
                                                            onChange={(e) => setNewComment(e.target.value)}
                                                            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-500"
                                                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(item.id)}
                                                        />
                                                        <button
                                                            onClick={() => handleAddComment(item.id)}
                                                            className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {item.location && (
                                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                                📍 {item.location}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredEquipment.filter(item =>
                                showMaintenanceEquipment ? item.status === 'maintenance' : item.status === 'available'
                            ).length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                                    {showMaintenanceEquipment ? 'No equipment under maintenance' : 'No available equipment'}
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Users and Their Assigned Equipment */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                Team Equipment Assignments
                                {(selectedDepartments.length > 0 || selectedUsers.length > 0) && (
                                    <span className="text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                                        {selectedUsers.length > 0 ?
                                            `- ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected` :
                                            `- ${selectedDepartments.length} department${selectedDepartments.length === 1 ? '' : 's'} + Users with Equipment`
                                        }
                                    </span>
                                )}
                            </h2>
                            <button
                                onClick={() => setShowOnlyUsersWithEquipment(!showOnlyUsersWithEquipment)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    showOnlyUsersWithEquipment
                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {showOnlyUsersWithEquipment ? 'Showing Users with Equipment' : 'Show All Users'}
                            </button>
                        </div>
                        {selectedDepartments.length > 0 && selectedUsers.length === 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Showing selected department members and all users with assigned equipment
                            </p>
                        )}
                        {selectedUsers.length > 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Showing equipment assignments for selected users
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {users.filter(user => {
                            const userAssignments = assignments.filter(a => a.user_id === user.id && !a.returned_at);

                            // Apply category filter to user's assigned equipment
                            const filteredUserEquipment = userAssignments.map(assignment => {
                                const equipmentItem = equipment.find(e => e.id === assignment.equipment_id);
                                return equipmentItem;
                            }).filter(Boolean).filter(item => {
                                const matchesCategory = selectedCategories.length === 0 || selectedCategories.length === categories.length || selectedCategories.includes(item.category);
                                return matchesCategory;
                            });

                            const hasAssignedEquipment = filteredUserEquipment.length > 0;
                            const matchesDepartmentFilter = selectedDepartments.length === 0 || selectedDepartments.length === departments.length || selectedDepartments.includes(user.department);
                            const matchesUserFilter = selectedUsers.length === 0 || selectedUsers.length === users.filter(u => u.name && u.name.trim() !== '').length || selectedUsers.includes(user.id);

                            // If "Only Users with Equipment" is enabled, filter out users without equipment
                            if (showOnlyUsersWithEquipment && !hasAssignedEquipment) {
                                return false;
                            }

                            // If category filter is active, only show users with equipment in that category
                            if (selectedCategories.length > 0 && selectedCategories.length < categories.length) {
                                return hasAssignedEquipment && matchesDepartmentFilter && matchesUserFilter;
                            }

                            // Show user if they match both department and user filters, OR have assigned equipment (when no specific filters)
                            if (selectedUsers.length > 0 && selectedUsers.length < users.filter(u => u.name && u.name.trim() !== '').length) {
                                return matchesUserFilter && (selectedDepartments.length === 0 || selectedDepartments.length === departments.length || matchesDepartmentFilter);
                            } else {
                                return matchesDepartmentFilter || hasAssignedEquipment;
                            }
                        }).map(user => {
                            const userAssignments = assignments.filter(a => a.user_id === user.id && !a.returned_at);
                            const userEquipment = userAssignments.map(assignment => {
                                const equipmentItem = equipment.find(e => e.id === assignment.equipment_id);
                                return { ...equipmentItem, assignment };
                            }).filter(Boolean).filter(item => {
                                // Apply category filter to assigned equipment
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
                                                {selectedDepartments.length > 0 && !selectedDepartments.includes(user.department) && userEquipment.length > 0 && (
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                                                        Has Equipment
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                {user.department || 'No Department'}
                                            </p>
                                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                                {userEquipment.length} item{userEquipment.length !== 1 ? 's' : ''} assigned
                                            </p>
                                        </div>
                                    </div>

                                    {userEquipment.length > 0 ? (
                                        <div className="space-y-3">
                                            {userEquipment.map(item => {
                                                const equipmentComments = getEquipmentComments(item.id);
                                                const assignedByUser = item.assignment.assigned_by ? getUserById(item.assignment.assigned_by) : null;
                                                return (
                                                    <div key={item.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                <h4 className="font-medium text-blue-800 dark:text-blue-300">{item.name}</h4>
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                    Assigned: {new Date(item.assignment.assigned_at).toLocaleString([], {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                    {assignedByUser && ` by ${assignedByUser.name}`}
                                                                </p>
                                                            </div>
                                                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                                                                Assigned
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2 mt-3">
                                                            {canReturnEquipment && (
                                                                <button
                                                                    onClick={() => openReturnConfirm(item.id)}
                                                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                                >
                                                                    Return Equipment
                                                                </button>
                                                            )}
                                                            {canAssignEquipment && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedEquipment(item);
                                                                        setShowAssignModal(true);
                                                                    }}
                                                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                                >
                                                                    Transfer
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setShowComments(showComments === item.id ? null : item.id)}
                                                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                                                            >
                                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                                {equipmentComments.length}
                                                            </button>
                                                        </div>

                                                        {/* Comments Section */}
                                                        {showComments === item.id && (
                                                            <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded">
                                                                <h5 className="text-xs font-medium mb-2">Comments</h5>
                                                                <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                                                                    {equipmentComments.map(comment => {
                                                                        const commentUser = getUserById(comment.user_id);
                                                                        return (
                                                                            <div key={comment.id} className="text-xs">
                                                                                <div className="flex justify-between">
                                                                                    <strong>{commentUser.name}</strong>
                                                                                    <span className="text-gray-500">
                                                                                        {new Date(comment.created_at).toLocaleString([], {
                                                                                    year: 'numeric',
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-gray-700 dark:text-gray-300">{comment.comment}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {canAddEquipmentComments && (
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Add comment..."
                                                                            value={newComment}
                                                                            onChange={(e) => setNewComment(e.target.value)}
                                                                            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-500"
                                                                            onKeyPress={(event) => event.key === 'Enter' && handleAddComment(item.id)}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleAddComment(item.id)}
                                                                            className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
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
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No equipment assigned</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            {/* Add Equipment Modal */}
            {showAddEquipment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add New Equipment</h2>
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                        <form onSubmit={handleAddEquipment}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={equipmentForm.name}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Model (Optional)</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.model}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, model: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter equipment model"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                    <textarea
                                        value={equipmentForm.description}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, description: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows="3"
                                        placeholder="Enter equipment description (optional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        value={equipmentForm.category}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, category: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.value}>{cat.value}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Serial Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.serial_number}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, serial_number: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter serial number if available"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.location}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={equipmentForm.purchase_date}
                                            onChange={(e) => setEquipmentForm({...equipmentForm, purchase_date: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Calibration Expiry</label>
                                        <input
                                            type="date"
                                            value={equipmentForm.warranty_expiry}
                                            onChange={(e) => setEquipmentForm({...equipmentForm, warranty_expiry: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Reset form to blank values when cancelling
                                        setEquipmentForm({
                                            name: '',
                                            description: '',
                                            category: '',
                                            status: 'available',
                                            serial_number: '',
                                            purchase_date: '',
                                            warranty_expiry: '',
                                            location: ''
                                        });
                                        setShowAddEquipment(false);
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                                >
                                    Add Equipment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && selectedEquipment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {getCurrentAssignment(selectedEquipment.id) ? 'Transfer Equipment' : 'Assign Equipment'}
                        </h2>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">
                            {getCurrentAssignment(selectedEquipment.id) ? 'Transfer' : 'Assign'} <strong>{selectedEquipment.name}</strong> to:
                        </p>
                        {getCurrentAssignment(selectedEquipment.id) && (() => {
                            const currentAssignment = getCurrentAssignment(selectedEquipment.id);
                            const currentUser = currentAssignment ? getUserById(currentAssignment.user_id) : null;
                            return currentUser && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        Currently assigned to: <strong>{currentUser.name}</strong>
                                    </p>
                                </div>
                            );
                        })()}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {users.filter(user => {
                                const matchesDepartmentFilter = selectedDepartments.length === 0 || selectedDepartments.length === departments.length || selectedDepartments.includes(user.department);
                                const matchesUserFilter = selectedUsers.length === 0 || selectedUsers.length === users.filter(u => u.name && u.name.trim() !== '').length || selectedUsers.includes(user.id);

                                // For transfers, exclude the currently assigned user
                                const currentAssignment = getCurrentAssignment(selectedEquipment.id);
                                if (currentAssignment && currentAssignment.user_id === user.id) {
                                    return false;
                                }

                                return matchesDepartmentFilter && matchesUserFilter;
                            }).map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleAssignEquipment(selectedEquipment.id, user.id)}
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
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.department || 'No Department'}</div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedEquipment(null);
                                }}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Equipment Modal */}
            {showEditEquipment && equipmentToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Equipment</h2>
                        <form onSubmit={handleEditEquipment}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={equipmentForm.name}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Model (Optional)</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.model}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, model: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter equipment model"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Model (Optional)</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.model}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, model: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter equipment model"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                    <textarea
                                        value={equipmentForm.description}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, description: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows="3"
                                        placeholder="Enter equipment description (optional)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        value={equipmentForm.category}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, category: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.value}>{cat.value}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Serial Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.serial_number}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, serial_number: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter serial number if available"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        value={equipmentForm.status}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, status: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="available">Available</option>
                                        <option value="assigned">Assigned</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={equipmentForm.location}
                                        onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Purchase Date</label>
                                        <input
                                            type="date"
                                            value={equipmentForm.purchase_date}
                                            onChange={(e) => setEquipmentForm({...equipmentForm, purchase_date: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Calibration Expiry</label>
                                        <input
                                            type="date"
                                            value={equipmentForm.warranty_expiry}
                                            onChange={(e) => setEquipmentForm({...equipmentForm, warranty_expiry: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-6">
                                <button
                                    type="button"
                                    onClick={() => openDeleteConfirm(equipmentToEdit)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Equipment
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditEquipment(false);
                                            setEquipmentToEdit(null);
                                        }}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Update Equipment
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Equipment Confirmation Modal */}
            {showDeleteConfirm && equipmentToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-red-600">Delete Equipment</h2>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete <strong>{equipmentToDelete.name}</strong>?
                        </p>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                            This action cannot be undone. All assignment history and comments will also be deleted.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setEquipmentToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEquipment}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete Equipment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Equipment Confirmation Modal */}
            {showReturnConfirm && equipmentToReturn && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-green-600">Return Equipment</h2>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">
                            Are you sure you want to return <strong>{equipmentToReturn.name}</strong>?
                        </p>
                        {(() => {
                            const currentAssignment = getCurrentAssignment(equipmentToReturn.id);
                            const assignedUser = currentAssignment ? users.find(u => u.id === currentAssignment.user_id) : null;
                            return assignedUser && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        Currently assigned to: <strong>{assignedUser.name}</strong>
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Since: {new Date(currentAssignment.assigned_at).toLocaleString([], {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            );
                        })()}
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                            This will mark the equipment as available and end the current assignment.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowReturnConfirm(false);
                                    setEquipmentToReturn(null);
                                }}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReturn}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Return Equipment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Equipment Audit Trail Modal */}
            {showAuditTrail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <History className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Equipment Audit Trail</h2>
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
                                                    <h3 className="text-lg font-medium mb-2">Audit Trail Setup Required</h3>
                                                    <p className="mb-4">The audit trail table needs to be created in your database to track equipment movements.</p>
                                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
                                                        <h4 className="font-medium mb-2">Run this SQL in your Supabase SQL Editor:</h4>
                                                        <pre className="text-sm bg-gray-200 dark:bg-gray-900 p-2 rounded overflow-x-auto">
{`CREATE TABLE equipment_audit_log (
    id SERIAL PRIMARY KEY,
    equipment_id UUID,
    action_type VARCHAR(50) NOT NULL,
    user_id UUID,
    assigned_to_user_id UUID,
    performed_by_user_id UUID,
    previous_user_id UUID,
    details TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_audit_log_equipment_id
ON equipment_audit_log(equipment_id);

CREATE INDEX idx_equipment_audit_log_created_at
ON equipment_audit_log(created_at DESC);`}
                                                        </pre>
                                                    </div>
                                                    <p className="mt-4 text-sm">After creating the table, refresh this page to start tracking equipment movements.</p>
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
                                            <p>No equipment movements have been recorded yet.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {auditTrailData.map(entry => {
                                            const actionColor = (() => {
                                                switch (entry.action_type) {
                                                    case 'assigned':
                                                        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
                                                    case 'returned':
                                                        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                                                    case 'transferred':
                                                        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
                                                    case 'created':
                                                        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
                                                    case 'updated':
                                                        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
                                                    case 'deleted':
                                                        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                                                    default:
                                                        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
                                                }
                                            })();

                                            // Generate meaningful description based on action type
                                            const getActionDescription = (entry) => {
                                                const equipmentName = entry.equipment?.name || 'Unknown Equipment';
                                                const performedBy = entry.performed_by?.name || 'Unknown User';

                                                switch (entry.action_type) {
                                                    case 'assigned': {
                                                        const assignedTo = entry.assigned_to_user?.name || 'Unknown User';
                                                        return `${equipmentName} was assigned to ${assignedTo} by ${performedBy}`;
                                                    }
                                                    case 'returned': {
                                                        const returnedFrom = entry.user?.name || entry.previous_user?.name || 'Unknown User';
                                                        return `${equipmentName} was returned from ${returnedFrom} by ${performedBy}`;
                                                    }
                                                    case 'transferred': {
                                                        const transferredFrom = entry.previous_user?.name || 'Unknown User';
                                                        const transferredTo = entry.assigned_to_user?.name || 'Unknown User';
                                                        return `${equipmentName} was transferred from ${transferredFrom} to ${transferredTo} by ${performedBy}`;
                                                    }
                                                    default:
                                                        return `${equipmentName} was ${entry.action_type} by ${performedBy}`;
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
                                                                {entry.equipment?.serial_number && (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                        Serial Number: {entry.equipment.serial_number}
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
                                Clear Audit Trail
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to clear all audit trail entries? This will permanently delete all equipment movement records and cannot be undone.
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

            {/* Discrepancies Modal */}
            {showDiscrepancies && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar vs Assignment Discrepancies</h2>
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
                                            <p>All equipment in the calendar has matching assignments in the equipment register.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                <strong>{discrepanciesData.length}</strong> user{discrepanciesData.length === 1 ? '' : 's'} {discrepanciesData.length === 1 ? 'has' : 'have'} equipment assigned in the calendar but not in the equipment register.
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

export default EquipmentPage;