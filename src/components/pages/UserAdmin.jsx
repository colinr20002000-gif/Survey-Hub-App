import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ShieldAlert, X, Save, UserPlus, Mail, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  checkUserActiveAssignments,
  returnAllUserAssignments
} from '../../utils/userAssignmentCleanup';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';
import { Combobox } from '../ui';

const UserAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('real-users');
  const [users, setUsers] = useState([]);
  const [dummyUsers, setDummyUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedDummyUsers, setDeletedDummyUsers] = useState([]);
  const [teamRoles, setTeamRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Modern Editing State
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDummyUserEdit, setIsDummyUserEdit] = useState(false);

  // MFA management states
  const [mfaStatuses, setMfaStatuses] = useState({});
  const [isResetMFAModalOpen, setIsResetMFAModalOpen] = useState(false);
  const [userToResetMFA, setUserToResetMFA] = useState(null);

  // Real user states
  const [showAddRealUser, setShowAddRealUser] = useState(false);
  const [realUserForm, setRealUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    privilege: 'Viewer',
    team_role: '',
    department: '',
    organisation: '',
    mobile_number: '',
    avatar: '',
    pts_number: '',
    hire_date: '',
    termination_date: ''
  });

  // Invite user states (same as real user but without password)
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviteUserForm, setInviteUserForm] = useState({
    name: '',
    username: '',
    email: '',
    privilege: 'Viewer',
    team_role: '',
    department: '',
    organisation: '',
    mobile_number: '',
    avatar: '',
    pts_number: '',
    hire_date: '',
    termination_date: ''
  });

  // Dummy user states
  const [showAddDummyUser, setShowAddDummyUser] = useState(false);
  const [dummyUserForm, setDummyUserForm] = useState({
    name: '',
    username: '',
    email: '',
    avatar: '',
    team_role: '',
    department: '',
    organisation: '',
    mobile_number: '',
    privilege: 'Viewer',
    competencies: '',
    pts_number: '',
    available_saturday: false,
    available_sunday: false,
    hire_date: '',
    termination_date: ''
  });

  const handleEditUser = (userItem, isDummy = false) => {
    setEditingUser({
      ...userItem,
      competencies: userItem.competencies || '', // Ensure string for inputs
      // Format dates for date inputs (YYYY-MM-DD)
      hire_date: userItem.hire_date ? new Date(userItem.hire_date).toISOString().split('T')[0] : '',
      termination_date: userItem.termination_date ? new Date(userItem.termination_date).toISOString().split('T')[0] : ''
    });
    setIsDummyUserEdit(isDummy);
    setShowEditModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const table = isDummyUserEdit ? 'dummy_users' : 'users';
      const updates = {
        name: editingUser.name,
        username: editingUser.username,
        email: editingUser.email,
        team_role: editingUser.team_role,
        department: editingUser.department,
        organisation: editingUser.organisation,
        mobile_number: editingUser.mobile_number,
        avatar: editingUser.avatar,
        competencies: editingUser.competencies,
        pts_number: editingUser.pts_number,
        hire_date: editingUser.hire_date || null,
        termination_date: editingUser.termination_date || null,
        // Only update privilege if not dummy (or if dummy supports it, which it does)
        privilege: editingUser.privilege
      };

      if (isDummyUserEdit) {
        updates.updated_by = user.id;
      }

      const updateQuery = Promise.race([
        supabase.from(table).update(updates).eq('id', editingUser.id).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) throw error;

      if (data && data[0]) {
        if (isDummyUserEdit) {
          setDummyUsers(prev => prev.map(u => u.id === editingUser.id ? data[0] : u));
        } else {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? data[0] : u));
        }
        alert('User updated successfully');
        setShowEditModal(false);
        setEditingUser(null);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      alert(`Error updating user: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDummyUsers();
    fetchDeletedUsers();
    fetchDeletedDummyUsers();
    fetchTeamRoles();
    fetchDepartments();
    fetchOrganisations();
    fetchCompetencies();
  }, []);

  // Fetch MFA statuses for all users
  useEffect(() => {
    const fetchMFAStatuses = async () => {
      const statuses = {};
      for (const userItem of users) {
        try {
          const { data, error } = await supabase.rpc('user_has_mfa', {
            check_user_id: userItem.id
          });

          if (error) {
            console.error('Error fetching MFA status for user:', userItem.email, error);
            statuses[userItem.id] = false;
          } else {
            statuses[userItem.id] = data === true;
          }
        } catch (err) {
          console.error('Error fetching MFA status for user:', userItem.email, err);
          statuses[userItem.id] = false;
        }
      }
      setMfaStatuses(statuses);
    };

    if (users.length > 0) {
      fetchMFAStatuses();
    }
  }, [users]);

  // Check if current user has admin privileges
  const isAdmin = user?.privilege === 'Admin';
  const isSuperAdmin = user?.email === 'colin.rogers@inorail.co.uk';

  // Fetch team roles from database
  const fetchTeamRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('dropdown_items')
        .select(`
          display_text,
          dropdown_categories!inner(name)
        `)
        .eq('dropdown_categories.name', 'team_role')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching team roles:', error);
        // Fallback to hardcoded roles if database query fails
        setTeamRoles(['Site Team', 'Project Team', 'Delivery Team', 'Design Team', 'Office Staff', 'Subcontractor']);
        return;
      }

      if (data && data.length > 0) {
        setTeamRoles(data.map(role => role.display_text));
      } else {
        // If no team roles found in database, use hardcoded fallback
        console.log('No team roles found in database, using fallback');
        setTeamRoles(['Site Team', 'Project Team', 'Delivery Team', 'Design Team', 'Office Staff', 'Subcontractor']);
      }
    } catch (error) {
      console.error('Error fetching team roles:', error);
      // Fallback to hardcoded roles if there's an error
      setTeamRoles(['Site Team', 'Project Team', 'Delivery Team', 'Design Team', 'Office Staff', 'Subcontractor']);
    }
  };

  // Fetch departments from database
  const fetchDepartments = async () => {
    try {
      console.log('🏢 Fetching departments...');
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
        console.log('🏢 Trying with capitalized "Department"...');
        const { data: capitalData, error: capitalError } = await supabase
          .from('dropdown_items')
          .select(`
            display_text,
            dropdown_categories!inner(name)
          `)
          .eq('dropdown_categories.name', 'Department')
          .eq('is_active', true)
          .order('sort_order');

        if (capitalError) {
          console.error('Error fetching departments with capital D:', capitalError);
          setDepartments([]);
          return;
        }

        if (capitalData && capitalData.length > 0) {
          console.log('🏢 Found departments with capital D:', capitalData);
          setDepartments(capitalData.map(dept => dept.display_text));
        } else {
          console.log('No departments found with capital D either');
          setDepartments([]);
        }
        return;
      }

      if (data && data.length > 0) {
        console.log('🏢 Found departments:', data);
        setDepartments(data.map(dept => dept.display_text));
      } else {
        console.log('No departments found in database');
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  // Fetch organisations from database
  const fetchOrganisations = async () => {
    try {
      console.log('🏛️ Fetching organisations...');
      const { data, error } = await supabase
        .from('dropdown_items')
        .select(`
          display_text,
          dropdown_categories!inner(name)
        `)
        .eq('dropdown_categories.name', 'organisation')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching organisations:', error);
        // Try with capitalized name as fallback
        console.log('🏛️ Trying with capitalized "Organisation"...');
        const { data: capitalData, error: capitalError } = await supabase
          .from('dropdown_items')
          .select(`
            display_text,
            dropdown_categories!inner(name)
          `)
          .eq('dropdown_categories.name', 'Organisation')
          .eq('is_active', true)
          .order('sort_order');

        if (capitalError) {
          console.error('Error fetching organisations with capital O:', capitalError);
          setOrganisations([]);
          return;
        }

        if (capitalData && capitalData.length > 0) {
          console.log('🏛️ Found organisations with capital O:', capitalData);
          setOrganisations(capitalData.map(org => org.display_text));
        } else {
          console.log('No organisations found with capital O either');
          setOrganisations([]);
        }
        return;
      }

      if (data && data.length > 0) {
        console.log('🏛️ Found organisations:', data);
        setOrganisations(data.map(org => org.display_text));
      } else {
        console.log('No organisations found in database');
        setOrganisations([]);
      }
    } catch (error) {
      console.error('Error fetching organisations:', error);
      setOrganisations([]);
    }
  };

  // Fetch competencies from database
  const fetchCompetencies = async () => {
    try {
      console.log('🎓 Fetching competencies...');
      const { data, error } = await supabase
        .from('dropdown_items')
        .select(`
          display_text,
          dropdown_categories!inner(name)
        `)
        .eq('dropdown_categories.name', 'competencies')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching competencies:', error);
        // Try with capitalized name as fallback
        console.log('🎓 Trying with capitalized "Competencies"...');
        const { data: capitalData, error: capitalError } = await supabase
          .from('dropdown_items')
          .select(`
            display_text,
            dropdown_categories!inner(name)
          `)
          .eq('dropdown_categories.name', 'Competencies')
          .eq('is_active', true)
          .order('sort_order');

        if (capitalError) {
          console.error('Error fetching competencies with capital C:', capitalError);
          setCompetencies([]);
          return;
        }

        if (capitalData && capitalData.length > 0) {
          console.log('🎓 Found competencies with capital C:', capitalData);
          setCompetencies(capitalData.map(comp => comp.display_text));
        } else {
          console.log('No competencies found with capital C either');
          setCompetencies([]);
        }
        return;
      }

      if (data && data.length > 0) {
        console.log('🎓 Found competencies:', data);
        setCompetencies(data.map(comp => comp.display_text));
      } else {
        console.log('No competencies found in database');
        setCompetencies([]);
      }
    } catch (error) {
      console.error('Error fetching competencies:', error);
      setCompetencies([]);
    }
  };

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    const sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        // Convert to string for comparison if needed
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Handle date fields
        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login' || sortConfig.key === 'hire_date' || sortConfig.key === 'termination_date' || sortConfig.key === 'deleted_at') {
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '⇅'; // Both arrows when not sorted
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const fetchUsers = async () => {
    if (!isAdmin) return; // Only fetch users if admin
    try {
      setLoading(true);
      setError(null);

      const userQuery = Promise.race([
        supabase.from('users').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        )
      ]);

      const { data, error: fetchError } = await userQuery;

      if (fetchError) {
        throw fetchError;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDummyUsers = async () => {
    if (!isAdmin) return; // Only fetch dummy users if admin
    try {
      setLoading(true);
      setError(null);

      const dummyUserQuery = Promise.race([
        supabase.from('dummy_users').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        )
      ]);

      const { data, error: fetchError } = await dummyUserQuery;

      if (fetchError) {
        throw fetchError;
      }

      setDummyUsers(data || []);
    } catch (err) {
      console.error('Error fetching dummy users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedUsers = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('deleted_at', 'is', null) // Get only deleted users
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsers(data || []);
    } catch (err) {
      console.error('Error fetching deleted users:', err);
    }
  };

  const fetchDeletedDummyUsers = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from('dummy_users')
        .select('*')
        .not('deleted_at', 'is', null) // Get only deleted dummy users
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedDummyUsers(data || []);
    } catch (err) {
      console.error('Error fetching deleted dummy users:', err);
    }
  };

  // [Deleted individual update functions to use unified modal editing]

  const deleteUser = async (userId, userEmail) => {
    if (!isAdmin) {
      alert('Only administrators can delete users');
      return;
    }

    if (userId === user?.id) {
      alert('You cannot delete your own account');
      return;
    }

    // Check if user has any active equipment or vehicle assignments
    const assignments = await checkUserActiveAssignments(userId);

    let confirmMessage = `Are you sure you want to delete user ${userEmail}? This will also delete their authentication account and cannot be undone.`;

    if (assignments.total > 0) {
      confirmMessage += `\n\nWARNING: This user has ${assignments.equipment} equipment item(s) and ${assignments.vehicles} vehicle(s) currently assigned. These will be automatically returned before deletion.`;

      if (assignments.equipmentList.length > 0) {
        confirmMessage += `\n\nEquipment to be returned:\n${assignments.equipmentList.map(eq => `• ${eq.name}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`).join('\n')}`;
      }

      if (assignments.vehicleList.length > 0) {
        confirmMessage += `\n\nVehicles to be returned:\n${assignments.vehicleList.map(v => `• ${v.name}${v.serialNumber ? ` (${v.serialNumber})` : ''}`).join('\n')}`;
      }
    }

    const confirmDelete = window.confirm(confirmMessage);

    if (!confirmDelete) return;

    try {
      // First, return all equipment and vehicles assigned to the user
      if (assignments.total > 0) {
        console.log(`Returning ${assignments.total} assignments for user ${userEmail}...`);

        const returnResult = await returnAllUserAssignments(userId, user.id, 'User deleted');

        if (!returnResult.success) {
          const errorMsg = `Failed to return some assignments before deletion:\n${returnResult.errors.join('\n')}\n\nDo you want to continue with deletion anyway?`;
          if (!window.confirm(errorMsg)) {
            return;
          }
        } else {
          console.log(`Successfully returned ${returnResult.totalReturned} assignments before user deletion`);
        }
      }
      // Soft delete by setting deleted_at timestamp instead of hard delete
      const deleteQuery = Promise.race([
        supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', userId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database delete timeout')), 8000)
        )
      ]);

      const { error } = await deleteQuery;

      if (error) {
        throw error;
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(`Error deleting user: ${err.message}`);
    }
  };

  // MFA Reset Function
  const confirmResetMFA = async () => {
    try {
      // Delete MFA factors from auth.mfa_factors table using RPC
      const { data, error } = await supabase.rpc('admin_reset_user_mfa', {
        target_user_id: userToResetMFA.id
      });

      if (error) {
        console.error('Error calling admin_reset_user_mfa:', error);
        throw error;
      }

      console.log('MFA reset successful for user:', userToResetMFA.email);

      // Update MFA status in state
      setMfaStatuses(prev => ({
        ...prev,
        [userToResetMFA.id]: false
      }));

      alert(`MFA has been reset for ${userToResetMFA.name}. They can now log in with just their password.`);
    } catch (err) {
      console.error('Error resetting MFA:', err);
      alert(`Failed to reset MFA: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsResetMFAModalOpen(false);
      setUserToResetMFA(null);
    }
  };

  // Real User CRUD Operations
  const createRealUser = async () => {
    try {
      // Validate required fields
      if (!realUserForm.name || !realUserForm.username || !realUserForm.email || !realUserForm.password) {
        alert('Please fill in all required fields (Name, Username, Email, Password)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(realUserForm.email)) {
        alert('Please enter a valid email address');
        return;
      }

      // Validate password length
      if (realUserForm.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      // Prepare the request body
      const requestBody = {
        email: realUserForm.email,
        password: realUserForm.password,
        name: realUserForm.name,
        username: realUserForm.username,
        privilege: realUserForm.privilege,
        teamRole: realUserForm.team_role,
        department: realUserForm.department,
        organisation: realUserForm.organisation,
        mobile_number: realUserForm.mobile_number,
        avatar: realUserForm.avatar || realUserForm.name.split(' ').map(n => n[0]).join('').substring(0, 3),
        pts_number: realUserForm.pts_number,
        hire_date: realUserForm.hire_date || null,
        termination_date: realUserForm.termination_date || null
      };

      console.log('📤 Sending request to Edge Function:', JSON.stringify(requestBody, null, 2));

      // Call the Edge Function to create auth user
      const { data, error } = await supabase.functions.invoke('create-auth-user', {
        body: requestBody
      });

      console.log('📡 Edge Function response:', { data, error });

      // Check if there's an error response in data (even when error is set)
      if (data && !data.success) {
        const errorMsg = data.error || 'Failed to create user';
        console.error('❌ Edge Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (error) {
        console.error('❌ Error calling create-auth-user function:', error);
        console.error('❌ Error context:', error.context);

        // Try to read the response body if available
        if (error.context && error.context instanceof Response) {
          try {
            const responseBody = await error.context.text();
            console.error('❌ Response body:', responseBody);
            const parsedError = JSON.parse(responseBody);
            if (parsedError.error) {
              throw new Error(parsedError.error);
            }
          } catch (parseError) {
            console.error('❌ Could not parse error response:', parseError);
          }
        }

        // Try to get more error details from the error object
        const errorMessage = error.message || error.toString();
        throw new Error(`Failed to call Edge Function: ${errorMessage}`);
      }

      if (!data) {
        throw new Error('No response data from Edge Function');
      }

      // Refresh the users list
      await fetchUsers();

      // Reset form
      setRealUserForm({
        name: '',
        username: '',
        email: '',
        password: '',
        privilege: 'Viewer',
        team_role: '',
        department: '',
        organisation: '',
        mobile_number: '',
        avatar: '',
        pts_number: '',
        hire_date: '',
        termination_date: ''
      });
      setShowAddRealUser(false);
      alert('User created successfully! They can now log in with their email and password.');
    } catch (err) {
      console.error('Error creating real user:', err);
      alert(`Error creating user: ${err.message}`);
    }
  };

  const sendInvite = async () => {
    try {
      // Validate required fields (no password needed for invite)
      if (!inviteUserForm.name || !inviteUserForm.username || !inviteUserForm.email) {
        alert('Please fill in all required fields (Name, Username, Email)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteUserForm.email)) {
        alert('Please enter a valid email address');
        return;
      }

      // Prepare the request body
      const requestBody = {
        email: inviteUserForm.email,
        name: inviteUserForm.name,
        username: inviteUserForm.username,
        privilege: inviteUserForm.privilege,
        teamRole: inviteUserForm.team_role,
        department: inviteUserForm.department,
        organisation: inviteUserForm.organisation,
        mobile_number: inviteUserForm.mobile_number,
        avatar: inviteUserForm.avatar || inviteUserForm.name.split(' ').map(n => n[0]).join('').substring(0, 3),
        pts_number: inviteUserForm.pts_number,
        hire_date: inviteUserForm.hire_date || null,
        termination_date: inviteUserForm.termination_date || null
      };

      console.log('📤 Sending invite request to Edge Function:', JSON.stringify(requestBody, null, 2));

      // Call the Edge Function to invite user
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: requestBody
      });

      console.log('📡 Edge Function response:', { data, error });

      // Check if there's an error response in data
      if (data && !data.success) {
        const errorMsg = data.error || 'Failed to invite user';
        console.error('❌ Edge Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (error) {
        console.error('❌ Error calling invite-user function:', error);
        console.error('❌ Error context:', error.context);

        // Try to read the response body if available
        if (error.context && error.context instanceof Response) {
          try {
            const responseBody = await error.context.text();
            console.error('❌ Response body:', responseBody);
            const parsedError = JSON.parse(responseBody);
            if (parsedError.error) {
              throw new Error(parsedError.error);
            }
          } catch (parseError) {
            console.error('❌ Could not parse error response:', parseError);
          }
        }

        const errorMessage = error.message || error.toString();
        throw new Error(`Failed to call Edge Function: ${errorMessage}`);
      }

      if (!data) {
        throw new Error('No response data from Edge Function');
      }

      // Refresh the users list
      await fetchUsers();

      // Reset form
      setInviteUserForm({
        name: '',
        username: '',
        email: '',
        privilege: 'Viewer',
        team_role: '',
        department: '',
        organisation: '',
        mobile_number: '',
        avatar: '',
        pts_number: '',
        hire_date: '',
        termination_date: ''
      });
      setShowInviteUser(false);
      alert(`Invitation sent successfully to ${inviteUserForm.email}! They will receive an email to set their password.`);
    } catch (err) {
      console.error('Error inviting user:', err);
      alert(`Error inviting user: ${err.message}`);
    }
  };

  const handleAddRealUserClick = () => {
    // Refresh dropdown data before opening modal
    fetchTeamRoles();
    fetchDepartments();
    fetchOrganisations();
    setShowAddRealUser(true);
  };

  // Dummy User CRUD Operations
  const createDummyUser = async () => {
    if (!isAdmin) {
      alert('Only administrators can create dummy users');
      return;
    }

    if (!dummyUserForm.name || !dummyUserForm.username || !dummyUserForm.email) {
      alert('Name, username, and email are required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dummy_users')
        .insert([{
          name: dummyUserForm.name,
          username: dummyUserForm.username,
          email: dummyUserForm.email,
          avatar: dummyUserForm.avatar || dummyUserForm.name.substring(0, 3).toUpperCase(),
          team_role: dummyUserForm.team_role || null,
          department: dummyUserForm.department || null,
          organisation: dummyUserForm.organisation || null,
          mobile_number: dummyUserForm.mobile_number || null,
          privilege: dummyUserForm.privilege || 'Viewer',
          competencies: dummyUserForm.competencies || null,
          pts_number: dummyUserForm.pts_number || null,
          available_saturday: dummyUserForm.available_saturday || false,
          available_sunday: dummyUserForm.available_sunday || false,
          hire_date: dummyUserForm.hire_date || null,
          termination_date: dummyUserForm.termination_date || null,
          created_by: user.id,
          updated_by: user.id
        }])
        .select();

      if (error) {
        throw error;
      }

      setDummyUsers(prev => [data[0], ...prev]);
      setDummyUserForm({
        name: '',
        username: '',
        email: '',
        avatar: '',
        team_role: '',
        department: '',
        organisation: '',
        mobile_number: '',
        privilege: 'Viewer',
        competencies: '',
        pts_number: '',
        available_saturday: false,
        available_sunday: false,
        hire_date: '',
        termination_date: ''
      });
      setShowAddDummyUser(false);
      alert('Dummy user created successfully');
    } catch (err) {
      console.error('Error creating dummy user:', err);
      alert(`Error creating dummy user: ${err.message}`);
    }
  };

  // Function to refresh dropdown data when modal opens
  const handleAddDummyUserClick = () => {
    // Refresh dropdown data before opening modal
    fetchTeamRoles();
    fetchDepartments();
    fetchOrganisations();
    setShowAddDummyUser(true);
  };

  // Fallback data if database queries fail
  const fallbackTeamRoles = ['Site Team', 'Project Team', 'Delivery Team', 'Design Team', 'Office Staff', 'Subcontractor'];
  const fallbackDepartments = ['Engineering', 'Operations', 'Administration', 'Finance', 'HR', 'IT'];
  const fallbackOrganisations = ['Main Office', 'Field Office', 'Remote', 'Client Site'];

  const updateDummyUser = async (dummyUserId, field, value) => {
    if (!isAdmin) {
      alert('Only administrators can modify dummy users');
      return;
    }

    // Special handling for deactivation - check for active assignments
    if (field === 'is_active' && value === false) {
      const assignments = await checkUserActiveAssignments(dummyUserId);

      if (assignments.total > 0) {
        const dummyUser = dummyUsers.find(du => du.id === dummyUserId);
        const userName = dummyUser?.name || 'Unknown User';

        let confirmMessage = `Are you sure you want to deactivate dummy user ${userName}? This user has ${assignments.equipment} equipment item(s) and ${assignments.vehicles} vehicle(s) currently assigned.`;

        confirmMessage += '\n\nAll assigned items will be automatically returned before deactivation.';

        if (assignments.equipmentList.length > 0) {
          confirmMessage += `\n\nEquipment to be returned:\n${assignments.equipmentList.map(eq => `• ${eq.name}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`).join('\n')}`;
        }

        if (assignments.vehicleList.length > 0) {
          confirmMessage += `\n\nVehicles to be returned:\n${assignments.vehicleList.map(v => `• ${v.name}${v.serialNumber ? ` (${v.serialNumber})` : ''}`).join('\n')}`;
        }

        const confirmDeactivate = window.confirm(confirmMessage);

        if (!confirmDeactivate) return;

        // Return all assignments before deactivation
        console.log(`Returning ${assignments.total} assignments before deactivating dummy user ${userName}...`);

        const returnResult = await returnAllUserAssignments(dummyUserId, user.id, 'User deactivated');

        if (!returnResult.success) {
          const errorMsg = `Failed to return some assignments before deactivation:\n${returnResult.errors.join('\n')}\n\nDo you want to continue with deactivation anyway?`;
          if (!window.confirm(errorMsg)) {
            return;
          }
        } else {
          console.log(`Successfully returned ${returnResult.totalReturned} assignments before user deactivation`);
        }
      }
    }

    try {
      const { data, error } = await supabase
        .from('dummy_users')
        .update({
          [field]: value,
          updated_by: user.id
        })
        .eq('id', dummyUserId)
        .select();

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setDummyUsers(prev => prev.map(du => du.id === dummyUserId ? data[0] : du));
        alert(`Dummy user ${field} updated successfully`);
      }
    } catch (err) {
      console.error('Error updating dummy user:', err);
      alert(`Error updating dummy user: ${err.message}`);
    }
  };

  const deleteDummyUser = async (dummyUserId, dummyUserName) => {
    if (!isAdmin) {
      alert('Only administrators can delete dummy users');
      return;
    }

    // Check if dummy user has any active equipment or vehicle assignments
    const assignments = await checkUserActiveAssignments(dummyUserId);

    let confirmMessage = `Are you sure you want to delete dummy user ${dummyUserName}? This will move them to the deleted users section.`;

    if (assignments.total > 0) {
      confirmMessage += `\n\nWARNING: This user has ${assignments.equipment} equipment item(s) and ${assignments.vehicles} vehicle(s) currently assigned. These will be automatically returned before deletion.`;

      if (assignments.equipmentList.length > 0) {
        confirmMessage += `\n\nEquipment to be returned:\n${assignments.equipmentList.map(eq => `• ${eq.name}${eq.serialNumber ? ` (${eq.serialNumber})` : ''}`).join('\n')}`;
      }

      if (assignments.vehicleList.length > 0) {
        confirmMessage += `\n\nVehicles to be returned:\n${assignments.vehicleList.map(v => `• ${v.name}${v.serialNumber ? ` (${v.serialNumber})` : ''}`).join('\n')}`;
      }
    }

    const confirmDelete = window.confirm(confirmMessage);

    if (!confirmDelete) return;

    try {
      // First, return all equipment and vehicles assigned to the dummy user
      if (assignments.total > 0) {
        console.log(`Returning ${assignments.total} assignments for dummy user ${dummyUserName}...`);

        const returnResult = await returnAllUserAssignments(dummyUserId, user.id, 'Dummy user deleted');

        if (!returnResult.success) {
          const errorMsg = `Failed to return some assignments before deletion:\n${returnResult.errors.join('\n')}\n\nDo you want to continue with deletion anyway?`;
          if (!window.confirm(errorMsg)) {
            return;
          }
        } else {
          console.log(`Successfully returned ${returnResult.totalReturned} assignments before dummy user deletion`);
        }
      }
      const { error } = await supabase
        .from('dummy_users')
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', dummyUserId);

      if (error) {
        throw error;
      }

      // Remove from active dummy users list and refresh deleted users
      setDummyUsers(prev => prev.filter(du => du.id !== dummyUserId));
      fetchDeletedDummyUsers(); // Refresh deleted users list
      alert('Dummy user moved to deleted users successfully');
    } catch (err) {
      console.error('Error deleting dummy user:', err);
      alert(`Error deleting dummy user: ${err.message}`);
    }
  };

  const restoreRealUser = async (userId, userName) => {
    if (!isAdmin) {
      alert('Only administrators can restore users');
      return;
    }

    const confirmRestore = window.confirm(`Are you sure you want to restore user ${userName}?`);

    if (!confirmRestore) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: null })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Refresh both lists
      fetchUsers(); // Refresh active users list
      fetchDeletedUsers(); // Refresh deleted users list
      alert('User restored successfully');
    } catch (err) {
      console.error('Error restoring user:', err);
      alert(`Error restoring user: ${err.message}`);
    }
  };

  const restoreDummyUser = async (dummyUserId, dummyUserName) => {
    if (!isAdmin) {
      alert('Only administrators can restore dummy users');
      return;
    }

    const confirmRestore = window.confirm(`Are you sure you want to restore dummy user ${dummyUserName}?`);

    if (!confirmRestore) return;

    try {
      const { error } = await supabase
        .from('dummy_users')
        .update({
          deleted_at: null,
          updated_by: user.id
        })
        .eq('id', dummyUserId);

      if (error) {
        throw error;
      }

      // Refresh both lists
      fetchDummyUsers(); // Refresh active users list
      fetchDeletedDummyUsers(); // Refresh deleted users list
      alert('Dummy user restored successfully');
    } catch (err) {
      console.error('Error restoring dummy user:', err);
      alert(`Error restoring dummy user: ${err.message}`);
    }
  };

  // [Deleted dummy field editing functions]

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPrivilegeColor = (privilege) => {
    switch (privilege) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Editor+': return 'bg-orange-100 text-orange-800';
      case 'Editor': return 'bg-yellow-100 text-yellow-800';
      case 'Viewer+': return 'bg-green-100 text-green-800';
      case 'Viewer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Admin Panel Access Restricted</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You need administrator privileges to view the user list.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Users</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchUsers}
                  className="bg-red-100 px-3 py-1 rounded text-red-800 hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Administration</h1>
        <p className="text-gray-600 mt-2">
          Manage all users and dummy users in the system. Real users: {users.length}, Dummy users: {dummyUsers.length}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('real-users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'real-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Real Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('dummy-users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dummy-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dummy Users ({dummyUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('deleted-users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'deleted-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Deleted Users ({deletedUsers.length + deletedDummyUsers.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'real-users' ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Real Users</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAddRealUserClick}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
              >
                <UserPlus size={16} /> Add Real User
              </button>
              <button
                onClick={() => setShowInviteUser(true)}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Mail size={16} /> Invite User
              </button>
              <button
                onClick={fetchUsers}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Avatar', 'Name', 'Username', 'Email', 'Mobile', 'Privilege', 'Role & Dept', 'Organisation', 'Status', 'Actions'].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedData(users).map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`h-10 w-10 rounded-full ${getDepartmentColor(userItem.department)} flex items-center justify-center text-white font-medium shadow-sm`}>
                        {getAvatarText(userItem)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      @{userItem.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.mobile_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getPrivilegeColor(userItem.privilege)}`}>
                        {userItem.privilege}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700">{userItem.team_role || '-'}</span>
                        <span className="text-xs text-gray-400">{userItem.department || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.organisation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mfaStatuses[userItem.id] ? (
                        <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                          <Check size={14} className="mr-1" />
                          <span className="text-xs font-medium">MFA On</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">MFA Off</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleEditUser(userItem)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                              title="Edit User"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => { setUserToResetMFA(userItem); setIsResetMFAModalOpen(true); }}
                              className="p-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded transition-colors"
                              title="Reset MFA"
                            >
                              <ShieldAlert size={18} />
                            </button>
                          </>
                        )}
                        {userItem.id !== user?.id && isSuperAdmin && (
                          <button
                            onClick={() => deleteUser(userItem.id, userItem.email)}
                            className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus size={32} className="text-gray-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new user account.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'dummy-users' ? (
        // Dummy Users Tab
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Dummy Users</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddDummyUserClick}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm"
                >
                  Add Dummy User
                </button>
                <button
                  onClick={fetchDummyUsers}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { label: 'Avatar', key: 'avatar' },
                    { label: 'Name', key: 'name' },
                    { label: 'Username', key: 'username' },
                    { label: 'Email', key: 'email' },
                    { label: 'Mobile', key: 'mobile_number' },
                    { label: 'Role & Dept', key: 'team_role' }, // Sort by team_role primarily
                    { label: 'Organisation', key: 'organisation' },
                    { label: 'Competencies', key: 'competencies' },
                    { label: 'PTS', key: 'pts_number' },
                    { label: 'Status', key: 'is_active' },
                    { label: 'Created', key: 'created_at' }
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center">
                        {col.label}
                        <span className="ml-1">{getSortIcon(col.key)}</span>
                      </div>
                    </th>
                  ))}
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedData(dummyUsers).map((dummyUser) => (
                  <tr key={dummyUser.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-medium shadow-sm">
                        {dummyUser.avatar || 'DU'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{dummyUser.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      @{dummyUser.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dummyUser.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dummyUser.mobile_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700">{dummyUser.team_role || '-'}</span>
                        <span className="text-xs text-gray-400">{dummyUser.department || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dummyUser.organisation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="truncate max-w-[150px] block" title={dummyUser.competencies}>
                        {dummyUser.competencies || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dummyUser.pts_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => isAdmin && updateDummyUser(dummyUser.id, 'is_active', !dummyUser.is_active)}
                        className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                          dummyUser.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        disabled={!isAdmin}
                        title={isAdmin ? "Click to toggle status" : "Status"}
                      >
                        {dummyUser.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(dummyUser.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditUser(dummyUser, true)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Dummy User"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteDummyUser(dummyUser.id, dummyUser.name)}
                              className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                              title="Delete Dummy User"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dummyUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No dummy users found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new dummy user.</p>
            </div>
          )}
        </div>
      ) : (
        // Deleted Users Tab
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Deleted Users ({deletedUsers.length + deletedDummyUsers.length})</h2>
          </div>

          {(deletedUsers.length > 0 || deletedDummyUsers.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">Name <span className="ml-1">{getSortIcon('name')}</span></div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">Email <span className="ml-1">{getSortIcon('email')}</span></div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center">Type <span className="ml-1">{getSortIcon('type')}</span></div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('deleted_at')}
                    >
                      <div className="flex items-center">Deleted At <span className="ml-1">{getSortIcon('deleted_at')}</span></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedData([
                    ...deletedUsers.map(u => ({ ...u, type: 'Real User' })),
                    ...deletedDummyUsers.map(u => ({ ...u, type: 'Dummy User' }))
                  ]).map((deletedUser) => (
                    <tr key={`${deletedUser.type}-${deletedUser.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full ${deletedUser.type === 'Real User' ? 'bg-gray-300' : 'bg-blue-300'} flex items-center justify-center`}>
                              <span className={`text-sm font-medium ${deletedUser.type === 'Real User' ? 'text-gray-700' : 'text-white'}`}>
                                {deletedUser.type === 'Real User'
                                  ? deletedUser.username?.substring(0, 2).toUpperCase()
                                  : (deletedUser.avatar || deletedUser.name?.substring(0, 2).toUpperCase())}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {deletedUser.type === 'Real User' ? deletedUser.username : deletedUser.name}
                            </div>
                            {deletedUser.type === 'Dummy User' && (
                              <div className="text-sm text-gray-500">{deletedUser.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deletedUser.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deletedUser.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(deletedUser.deleted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                          onClick={() => deletedUser.type === 'Real User' 
                            ? restoreRealUser(deletedUser.id, deletedUser.username) 
                            : restoreDummyUser(deletedUser.id, deletedUser.name)}
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No deleted users</h3>
              <p className="mt-1 text-sm text-gray-500">All users are currently active.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Real User Modal */}
      {showAddRealUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Real User</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will create a real authentication user who can log in to the application.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={realUserForm.name}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  value={realUserForm.username}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="john.doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={realUserForm.email}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input
                  type="password"
                  value={realUserForm.password}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                  required
                  minLength="6"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Privilege</label>
                <Combobox
                  value={realUserForm.privilege}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, privilege: e.target.value }))}
                  options={["Viewer", "Viewer+", "Editor", "Editor+", "Admin"]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Role</label>
                <Combobox
                  value={realUserForm.team_role}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, team_role: e.target.value }))}
                  options={teamRoles}
                  placeholder="Select Team Role"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                <input
                  type="date"
                  value={realUserForm.hire_date}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Termination Date</label>
                <input
                  type="date"
                  value={realUserForm.termination_date}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, termination_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Leave blank for active employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <Combobox
                  value={realUserForm.department}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, department: e.target.value }))}
                  options={departments}
                  placeholder="Select Department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation</label>
                <Combobox
                  value={realUserForm.organisation}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, organisation: e.target.value }))}
                  options={organisations}
                  placeholder="Select Organisation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <input
                  type="tel"
                  value={realUserForm.mobile_number}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Avatar (max 3 chars)</label>
                <input
                  type="text"
                  value={realUserForm.avatar}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, avatar: e.target.value.substring(0, 3) }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Auto-generated from name if empty"
                  maxLength="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PTS Number</label>
                <input
                  type="text"
                  value={realUserForm.pts_number}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, pts_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter PTS number"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={createRealUser}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowAddRealUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send an invitation email to create a new user account. They will set their own password.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={inviteUserForm.name}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  value={inviteUserForm.username}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="john.doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={inviteUserForm.email}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="john.doe@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">An invitation email will be sent to this address</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Privilege</label>
                <Combobox
                  value={inviteUserForm.privilege}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, privilege: e.target.value }))}
                  options={["Viewer", "Viewer+", "Editor", "Editor+", "Admin"]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Role</label>
                <Combobox
                  value={inviteUserForm.team_role}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, team_role: e.target.value }))}
                  options={teamRoles}
                  placeholder="Select Team Role"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                <input
                  type="date"
                  value={inviteUserForm.hire_date}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Termination Date</label>
                <input
                  type="date"
                  value={inviteUserForm.termination_date}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, termination_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Leave blank for active employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <Combobox
                  value={inviteUserForm.department}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, department: e.target.value }))}
                  options={departments}
                  placeholder="Select Department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation</label>
                <Combobox
                  value={inviteUserForm.organisation}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, organisation: e.target.value }))}
                  options={organisations}
                  placeholder="Select Organisation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <input
                  type="tel"
                  value={inviteUserForm.mobile_number}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Avatar (max 3 chars)</label>
                <input
                  type="text"
                  value={inviteUserForm.avatar}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, avatar: e.target.value.substring(0, 3) }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Auto-generated from name if empty"
                  maxLength="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PTS Number</label>
                <input
                  type="text"
                  value={inviteUserForm.pts_number}
                  onChange={(e) => setInviteUserForm(prev => ({ ...prev, pts_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter PTS number"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={sendInvite}
                  className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
                >
                  Send Invitation
                </button>
                <button
                  onClick={() => setShowInviteUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Dummy User Modal */}
      {showAddDummyUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Dummy User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a dummy user for resource planning. Dummy users don't have login access.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={dummyUserForm.name}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  value={dummyUserForm.username}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={dummyUserForm.email}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <input
                  type="tel"
                  value={dummyUserForm.mobile_number}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Avatar (max 3 chars)</label>
                <input
                  type="text"
                  value={dummyUserForm.avatar}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, avatar: e.target.value.substring(0, 3) }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ABC (auto-generated if empty)"
                  maxLength="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Role</label>
                <Combobox
                  value={dummyUserForm.team_role}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, team_role: e.target.value }))}
                  options={teamRoles.length > 0 ? teamRoles : fallbackTeamRoles}
                  placeholder="Select Team Role"
                />
                {teamRoles.length === 0 && fallbackTeamRoles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback team roles. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <Combobox
                  value={dummyUserForm.department}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, department: e.target.value }))}
                  options={departments.length > 0 ? departments : fallbackDepartments}
                  placeholder="Select Department"
                />
                {departments.length === 0 && fallbackDepartments.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback departments. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation</label>
                <Combobox
                  value={dummyUserForm.organisation}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, organisation: e.target.value }))}
                  options={organisations.length > 0 ? organisations : fallbackOrganisations}
                  placeholder="Select Organisation"
                />
                {organisations.length === 0 && fallbackOrganisations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback organisations. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PTS Number</label>
                <input
                  type="text"
                  value={dummyUserForm.pts_number}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, pts_number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter PTS number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                <input
                  type="date"
                  value={dummyUserForm.hire_date}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Termination Date</label>
                <input
                  type="date"
                  value={dummyUserForm.termination_date}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, termination_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Leave blank for active employees"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddDummyUser(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={createDummyUser}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Create Dummy User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit {isDummyUserEdit ? 'Dummy' : 'Real'} User
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">@</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full border border-gray-300 rounded-md pl-7 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={editingUser.mobile_number || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, mobile_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Role & Access */}
                <div className="col-span-2 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Role & Access</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team Role</label>
                      <Combobox
                        value={editingUser.team_role || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, team_role: e.target.value })}
                        options={teamRoles}
                        placeholder="Select Role"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Privilege</label>
                      <Combobox
                        value={editingUser.privilege || 'Viewer'}
                        onChange={(e) => setEditingUser({ ...editingUser, privilege: e.target.value })}
                        disabled={editingUser.privilege === 'Admin' && !isSuperAdmin}
                        options={["Viewer", "Viewer+", "Editor", "Editor+", "Admin"]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <Combobox
                        value={editingUser.department || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                        options={departments}
                        placeholder="Select Department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                      <Combobox
                        value={editingUser.organisation || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, organisation: e.target.value })}
                        options={organisations}
                        placeholder="Select Organisation"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="col-span-2 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Employment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PTS Number</label>
                      <input
                        type="text"
                        value={editingUser.pts_number || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, pts_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                      <input
                        type="date"
                        value={editingUser.hire_date || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, hire_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date</label>
                      <input
                        type="date"
                        value={editingUser.termination_date || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, termination_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Competencies */}
                <div className="col-span-2 border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Competencies</label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {competencies.map(comp => {
                        const currentCompetencies = editingUser.competencies ? editingUser.competencies.split(',').map(c => c.trim()) : [];
                        return (
                          <label key={comp} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentCompetencies.includes(comp)}
                              onChange={(e) => {
                                let newComps = [...currentCompetencies];
                                if (e.target.checked) {
                                  newComps.push(comp);
                                } else {
                                  newComps = newComps.filter(c => c !== comp);
                                }
                                setEditingUser({ ...editingUser, competencies: newComps.join(', ') });
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{comp}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MFA Reset Confirmation Modal */}
      {isResetMFAModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Multi-Factor Authentication</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to reset MFA for <strong>{userToResetMFA?.name}</strong>?
              <br /><br />
              They will be able to log in with just their password until they re-enable MFA.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsResetMFAModalOpen(false);
                  setUserToResetMFA(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetMFA}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reset MFA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAdmin;