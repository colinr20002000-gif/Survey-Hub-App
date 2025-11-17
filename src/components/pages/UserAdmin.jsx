import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  checkUserActiveAssignments,
  returnAllUserAssignments
} from '../../utils/userAssignmentCleanup';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';

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
  const [editingUsername, setEditingUsername] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [editingTeamRole, setEditingTeamRole] = useState(null);
  const [newTeamRole, setNewTeamRole] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [editingOrganisation, setEditingOrganisation] = useState(null);
  const [newOrganisation, setNewOrganisation] = useState('');
  const [editingCompetencies, setEditingCompetencies] = useState(null);
  const [newCompetencies, setNewCompetencies] = useState('');
  const [editingPtsNumber, setEditingPtsNumber] = useState(null);
  const [newPtsNumber, setNewPtsNumber] = useState('');
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [newAvatar, setNewAvatar] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [newName, setNewName] = useState('');
  const [editingMobileNumber, setEditingMobileNumber] = useState(null);
  const [newMobileNumber, setNewMobileNumber] = useState('');
  const [editingHireDate, setEditingHireDate] = useState(null);
  const [newHireDate, setNewHireDate] = useState('');
  const [editingTerminationDate, setEditingTerminationDate] = useState(null);
  const [newTerminationDate, setNewTerminationDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

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

  // Dummy user editing states
  const [editingDummyUsername, setEditingDummyUsername] = useState(null);
  const [editingDummyName, setEditingDummyName] = useState(null);
  const [editingDummyEmail, setEditingDummyEmail] = useState(null);
  const [editingDummyAvatar, setEditingDummyAvatar] = useState(null);
  const [editingDummyTeamRole, setEditingDummyTeamRole] = useState(null);
  const [editingDummyDepartment, setEditingDummyDepartment] = useState(null);
  const [editingDummyOrganisation, setEditingDummyOrganisation] = useState(null);
  const [editingDummyMobileNumber, setEditingDummyMobileNumber] = useState(null);
  const [editingDummyCompetencies, setEditingDummyCompetencies] = useState(null);
  const [editingDummyPtsNumber, setEditingDummyPtsNumber] = useState(null);

  const [newDummyUsername, setNewDummyUsername] = useState('');
  const [newDummyName, setNewDummyName] = useState('');
  const [newDummyEmail, setNewDummyEmail] = useState('');
  const [newDummyAvatar, setNewDummyAvatar] = useState('');
  const [newDummyTeamRole, setNewDummyTeamRole] = useState('');
  const [newDummyDepartment, setNewDummyDepartment] = useState('');
  const [newDummyOrganisation, setNewDummyOrganisation] = useState('');
  const [newDummyMobileNumber, setNewDummyMobileNumber] = useState('');
  const [newDummyCompetencies, setNewDummyCompetencies] = useState('');
  const [newDummyPtsNumber, setNewDummyPtsNumber] = useState('');
  const [editingDummyHireDate, setEditingDummyHireDate] = useState(null);
  const [newDummyHireDate, setNewDummyHireDate] = useState('');
  const [editingDummyTerminationDate, setEditingDummyTerminationDate] = useState(null);
  const [newDummyTerminationDate, setNewDummyTerminationDate] = useState('');

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

  const getSortedUsers = () => {
    const sortableUsers = [...users];
    if (sortConfig.key) {
      sortableUsers.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        // Convert to string for comparison if needed
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Handle date fields
        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login') {
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
    return sortableUsers;
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

  const updateUserPrivilege = async (userId, newPrivilege) => {
    if (!isAdmin) {
      alert('Only administrators can modify user privileges');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ privilege: newPrivilege }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('User privilege updated successfully');
      }
    } catch (err) {
      console.error('Error updating user privilege:', err);
      alert(`Error updating user privilege: ${err.message}`);
    }
  };

  const updateUsername = async (userId, username) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify usernames');
      return;
    }

    if (!username || username.trim() === '') {
      alert('Username cannot be empty');
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .neq('id', userId);

      if (checkError) {
        throw checkError;
      }

      if (existingUser && existingUser.length > 0) {
        alert('Username already exists. Please choose a different username.');
        return;
      }

      const updateQuery = Promise.race([
        supabase.from('users').update({ username: username.trim() }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Username updated successfully');
        setEditingUsername(null);
        setNewUsername('');
      }
    } catch (err) {
      console.error('Error updating username:', err);
      alert(`Error updating username: ${err.message}`);
    }
  };

  const startEditingUsername = (userItem) => {
    setEditingUsername(userItem.id);
    setNewUsername(userItem.username);
  };

  const cancelEditingUsername = () => {
    setEditingUsername(null);
    setNewUsername('');
  };

  const updateTeamRole = async (userId, teamRole) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify team roles');
      return;
    }

    if (!teamRole || teamRole.trim() === '') {
      alert('Team role cannot be empty');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ team_role: teamRole.trim() }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Team role updated successfully');
        setEditingTeamRole(null);
        setNewTeamRole('');
      }
    } catch (err) {
      console.error('Error updating team role:', err);
      alert(`Error updating team role: ${err.message}`);
    }
  };

  const startEditingTeamRole = (userItem) => {
    setEditingTeamRole(userItem.id);
    setNewTeamRole(userItem.team_role || '');
  };

  const cancelEditingTeamRole = () => {
    setEditingTeamRole(null);
    setNewTeamRole('');
  };

  const updateDepartment = async (userId, department) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify departments');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ department: department }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Department updated successfully');
        setEditingDepartment(null);
        setNewDepartment('');
      }
    } catch (err) {
      console.error('Error updating department:', err);
      alert(`Error updating department: ${err.message}`);
    }
  };

  const startEditingDepartment = (userItem) => {
    setEditingDepartment(userItem.id);
    setNewDepartment(userItem.department || '');
  };

  const cancelEditingDepartment = () => {
    setEditingDepartment(null);
    setNewDepartment('');
  };

  const updateOrganisation = async (userId, organisation) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify organisations');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ organisation: organisation }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Organisation updated successfully');
        setEditingOrganisation(null);
        setNewOrganisation('');
      }
    } catch (err) {
      console.error('Error updating organisation:', err);
      alert(`Error updating organisation: ${err.message}`);
    }
  };

  const startEditingOrganisation = (userItem) => {
    setEditingOrganisation(userItem.id);
    setNewOrganisation(userItem.organisation || '');
  };

  const cancelEditingOrganisation = () => {
    setEditingOrganisation(null);
    setNewOrganisation('');
  };

  const updateCompetencies = async (userId, competencies) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify competencies');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ competencies: competencies }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Competencies updated successfully');
        setEditingCompetencies(null);
        setNewCompetencies('');
      }
    } catch (err) {
      console.error('Error updating competencies:', err);
      alert(`Error updating competencies: ${err.message}`);
    }
  };

  const startEditingCompetencies = (userItem) => {
    setEditingCompetencies(userItem.id);
    setNewCompetencies(userItem.competencies || '');
  };

  const cancelEditingCompetencies = () => {
    setEditingCompetencies(null);
    setNewCompetencies('');
  };

  const updatePtsNumber = async (userId, ptsNumber) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify PTS numbers');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ pts_number: ptsNumber }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('PTS Number updated successfully');
        setEditingPtsNumber(null);
        setNewPtsNumber('');
      }
    } catch (err) {
      console.error('Error updating PTS number:', err);
      alert(`Error updating PTS number: ${err.message}`);
    }
  };

  const startEditingPtsNumber = (userItem) => {
    setEditingPtsNumber(userItem.id);
    setNewPtsNumber(userItem.pts_number || '');
  };

  const cancelEditingPtsNumber = () => {
    setEditingPtsNumber(null);
    setNewPtsNumber('');
  };

  const updateAvatar = async (userId, avatar) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify avatars');
      return;
    }

    if (!avatar || avatar.trim() === '') {
      alert('Avatar cannot be empty');
      return;
    }

    // Limit avatar to 3 characters maximum for display purposes
    const trimmedAvatar = avatar.trim().toUpperCase().substring(0, 3);

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ avatar: trimmedAvatar }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Avatar updated successfully');
        setEditingAvatar(null);
        setNewAvatar('');
      }
    } catch (err) {
      console.error('Error updating avatar:', err);
      alert(`Error updating avatar: ${err.message}`);
    }
  };

  const startEditingAvatar = (userItem) => {
    setEditingAvatar(userItem.id);
    setNewAvatar(userItem.avatar || '');
  };

  const cancelEditingAvatar = () => {
    setEditingAvatar(null);
    setNewAvatar('');
  };

  const updateName = async (userId, name) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify names');
      return;
    }

    if (!name || name.trim() === '') {
      alert('Name cannot be empty');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ name: name.trim() }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Name updated successfully');
        setEditingName(null);
        setNewName('');
      }
    } catch (err) {
      console.error('Error updating name:', err);
      alert(`Error updating name: ${err.message}`);
    }
  };

  const startEditingName = (userItem) => {
    setEditingName(userItem.id);
    setNewName(userItem.name || '');
  };

  const cancelEditingName = () => {
    setEditingName(null);
    setNewName('');
  };

  const updateMobileNumber = async (userId, mobileNumber) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify mobile numbers');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ mobile_number: mobileNumber }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Mobile number updated successfully');
        setEditingMobileNumber(null);
        setNewMobileNumber('');
      }
    } catch (err) {
      console.error('Error updating mobile number:', err);
      alert(`Error updating mobile number: ${err.message}`);
    }
  };

  const startEditingMobileNumber = (userItem) => {
    setEditingMobileNumber(userItem.id);
    setNewMobileNumber(userItem.mobile_number || '');
  };

  const cancelEditingMobileNumber = () => {
    setEditingMobileNumber(null);
    setNewMobileNumber('');
  };

  const handleUpdateHireDate = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify hire dates');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ hire_date: newHireDate || null }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Hire date updated successfully');
        setEditingHireDate(null);
        setNewHireDate('');
      }
    } catch (err) {
      console.error('Error updating hire date:', err);
      alert(`Error updating hire date: ${err.message}`);
    }
  };

  const handleUpdateTerminationDate = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super administrators can modify termination dates');
      return;
    }

    try {
      const updateQuery = Promise.race([
        supabase.from('users').update({ termination_date: newTerminationDate || null }).eq('id', userId).select(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 8000)
        )
      ]);

      const { data, error } = await updateQuery;

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        setUsers(prev => prev.map(u => u.id === userId ? data[0] : u));
        alert('Termination date updated successfully');
        setEditingTerminationDate(null);
        setNewTerminationDate('');
      }
    } catch (err) {
      console.error('Error updating termination date:', err);
      alert(`Error updating termination date: ${err.message}`);
    }
  };

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
          ...dummyUserForm,
          created_by: user.id,
          updated_by: user.id,
          avatar: dummyUserForm.avatar || dummyUserForm.name.substring(0, 3).toUpperCase()
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
        privilege: 'Viewer'
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

  // Dummy user editing helper functions
  const startEditingDummyField = (dummyUserId, field, currentValue) => {
    switch (field) {
      case 'username':
        setEditingDummyUsername(dummyUserId);
        setNewDummyUsername(currentValue || '');
        break;
      case 'name':
        setEditingDummyName(dummyUserId);
        setNewDummyName(currentValue || '');
        break;
      case 'email':
        setEditingDummyEmail(dummyUserId);
        setNewDummyEmail(currentValue || '');
        break;
      case 'avatar':
        setEditingDummyAvatar(dummyUserId);
        setNewDummyAvatar(currentValue || '');
        break;
      case 'team_role':
        setEditingDummyTeamRole(dummyUserId);
        setNewDummyTeamRole(currentValue || '');
        break;
      case 'department':
        setEditingDummyDepartment(dummyUserId);
        setNewDummyDepartment(currentValue || '');
        break;
      case 'organisation':
        setEditingDummyOrganisation(dummyUserId);
        setNewDummyOrganisation(currentValue || '');
        break;
      case 'mobile_number':
        setEditingDummyMobileNumber(dummyUserId);
        setNewDummyMobileNumber(currentValue || '');
        break;
      case 'competencies':
        setEditingDummyCompetencies(dummyUserId);
        setNewDummyCompetencies(currentValue || '');
        break;
      case 'pts_number':
        setEditingDummyPtsNumber(dummyUserId);
        setNewDummyPtsNumber(currentValue || '');
        break;
    }
  };

  const cancelEditingDummyField = (field) => {
    switch (field) {
      case 'username':
        setEditingDummyUsername(null);
        setNewDummyUsername('');
        break;
      case 'name':
        setEditingDummyName(null);
        setNewDummyName('');
        break;
      case 'email':
        setEditingDummyEmail(null);
        setNewDummyEmail('');
        break;
      case 'avatar':
        setEditingDummyAvatar(null);
        setNewDummyAvatar('');
        break;
      case 'team_role':
        setEditingDummyTeamRole(null);
        setNewDummyTeamRole('');
        break;
      case 'department':
        setEditingDummyDepartment(null);
        setNewDummyDepartment('');
        break;
      case 'organisation':
        setEditingDummyOrganisation(null);
        setNewDummyOrganisation('');
        break;
      case 'mobile_number':
        setEditingDummyMobileNumber(null);
        setNewDummyMobileNumber('');
        break;
      case 'competencies':
        setEditingDummyCompetencies(null);
        setNewDummyCompetencies('');
        break;
      case 'pts_number':
        setEditingDummyPtsNumber(null);
        setNewDummyPtsNumber('');
        break;
    }
  };

  const saveDummyField = async (dummyUserId, field) => {
    let value;
    switch (field) {
      case 'username':
        value = newDummyUsername;
        break;
      case 'name':
        value = newDummyName;
        break;
      case 'email':
        value = newDummyEmail;
        break;
      case 'avatar':
        value = newDummyAvatar;
        break;
      case 'team_role':
        value = newDummyTeamRole;
        break;
      case 'department':
        value = newDummyDepartment;
        break;
      case 'organisation':
        value = newDummyOrganisation;
        break;
      case 'mobile_number':
        value = newDummyMobileNumber;
        break;
      case 'competencies':
        value = newDummyCompetencies;
        break;
      case 'pts_number':
        value = newDummyPtsNumber;
        break;
    }

    await updateDummyUser(dummyUserId, field, value);
    cancelEditingDummyField(field);
  };

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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Real Users</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRealUserClick}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm"
                >
                  Add Real User
                </button>
                <button
                  onClick={fetchUsers}
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
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('avatar')}
                >
                  <div className="flex items-center">
                    Avatar
                    <span className="ml-1">{getSortIcon('avatar')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    <span className="ml-1">{getSortIcon('name')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('username')}
                >
                  <div className="flex items-center">
                    Username
                    <span className="ml-1">{getSortIcon('username')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Email
                    <span className="ml-1">{getSortIcon('email')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('mobile_number')}
                >
                  <div className="flex items-center">
                    Mobile Number
                    <span className="ml-1">{getSortIcon('mobile_number')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('privilege')}
                >
                  <div className="flex items-center">
                    Privilege
                    <span className="ml-1">{getSortIcon('privilege')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('team_role')}
                >
                  <div className="flex items-center">
                    Team Role
                    <span className="ml-1">{getSortIcon('team_role')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center">
                    Department
                    <span className="ml-1">{getSortIcon('department')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('organisation')}
                >
                  <div className="flex items-center">
                    Organisation
                    <span className="ml-1">{getSortIcon('organisation')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('competencies')}
                >
                  <div className="flex items-center">
                    Competencies
                    <span className="ml-1">{getSortIcon('competencies')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pts_number')}
                >
                  <div className="flex items-center">
                    PTS Number
                    <span className="ml-1">{getSortIcon('pts_number')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Created
                    <span className="ml-1">{getSortIcon('created_at')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_login')}
                >
                  <div className="flex items-center">
                    Last Login
                    <span className="ml-1">{getSortIcon('last_login')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('hire_date')}
                >
                  <div className="flex items-center">
                    Hire Date
                    <span className="ml-1">{getSortIcon('hire_date')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('termination_date')}
                >
                  <div className="flex items-center">
                    Termination Date
                    <span className="ml-1">{getSortIcon('termination_date')}</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MFA Status
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedUsers().map((userItem) => (
                <tr key={userItem.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                      <div className={`h-10 w-10 rounded-full ${getDepartmentColor(userItem.department)} flex items-center justify-center text-white font-medium`}>
                        {isSuperAdmin && editingAvatar === userItem.id ? (
                          <input
                            type="text"
                            value={newAvatar}
                            onChange={(e) => setNewAvatar(e.target.value)}
                            className="w-8 h-8 text-center text-xs text-white bg-transparent border border-white rounded-full focus:outline-none focus:ring-1 focus:ring-white"
                            maxLength="3"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateAvatar(userItem.id, newAvatar);
                              } else if (e.key === 'Escape') {
                                cancelEditingAvatar();
                              }
                            }}
                            placeholder="ABC"
                          />
                        ) : (
                          getAvatarText(userItem)
                        )}
                      </div>
                      {isSuperAdmin && editingAvatar !== userItem.id && (
                        <button
                          onClick={() => startEditingAvatar(userItem)}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-blue-700"
                          title="Edit avatar"
                        >
                          ✏️
                        </button>
                      )}
                      {isSuperAdmin && editingAvatar === userItem.id && (
                        <div className="absolute -bottom-1 -right-1 flex gap-1">
                          <button
                            onClick={() => updateAvatar(userItem.id, newAvatar)}
                            className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-green-700"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditingAvatar}
                            className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-700"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {isSuperAdmin && editingName === userItem.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateName(userItem.id, newName);
                              } else if (e.key === 'Escape') {
                                cancelEditingName();
                              }
                            }}
                          />
                          <button
                            onClick={() => updateName(userItem.id, newName)}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditingName}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{userItem.name}</span>
                          {isSuperAdmin && (
                            <button
                              onClick={() => startEditingName(userItem)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit name"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {isSuperAdmin && editingUsername === userItem.id ? (
                        <div className="flex items-center gap-1">
                          <span>@</span>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-20"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateUsername(userItem.id, newUsername);
                              } else if (e.key === 'Escape') {
                                cancelEditingUsername();
                              }
                            }}
                          />
                          <button
                            onClick={() => updateUsername(userItem.id, newUsername)}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditingUsername}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>@{userItem.username}</span>
                          {isSuperAdmin && (
                            <button
                              onClick={() => startEditingUsername(userItem)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit username"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userItem.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingMobileNumber === userItem.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="tel"
                          value={newMobileNumber}
                          onChange={(e) => setNewMobileNumber(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateMobileNumber(userItem.id, newMobileNumber);
                            } else if (e.key === 'Escape') {
                              cancelEditingMobileNumber();
                            }
                          }}
                          placeholder="Phone number"
                        />
                        <button
                          onClick={() => updateMobileNumber(userItem.id, newMobileNumber)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingMobileNumber}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Cancel"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{userItem.mobile_number || 'Not set'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingMobileNumber(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit mobile number"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrivilegeColor(userItem.privilege)}`}>
                      {userItem.email === 'colin.rogers@inorail.co.uk' ? 'Super Admin' : userItem.privilege}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingTeamRole === userItem.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={newTeamRole}
                          onChange={(e) => setNewTeamRole(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateTeamRole(userItem.id, newTeamRole);
                            } else if (e.key === 'Escape') {
                              cancelEditingTeamRole();
                            }
                          }}
                          style={{
                            backgroundColor: 'white',
                            color: 'black'
                          }}
                        >
                          {teamRoles.map(role => (
                            <option key={role} value={role} style={{ backgroundColor: 'white', color: 'black' }}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateTeamRole(userItem.id, newTeamRole)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingTeamRole}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Cancel"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{userItem.team_role || 'Not assigned'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingTeamRole(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit team role"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingDepartment === userItem.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateDepartment(userItem.id, newDepartment);
                            } else if (e.key === 'Escape') {
                              cancelEditingDepartment();
                            }
                          }}
                          style={{
                            backgroundColor: 'white',
                            color: 'black'
                          }}
                        >
                          <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept} style={{ backgroundColor: 'white', color: 'black' }}>
                              {dept}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateDepartment(userItem.id, newDepartment)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingDepartment}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Cancel"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{userItem.department || 'Not assigned'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingDepartment(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit department"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingOrganisation === userItem.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={newOrganisation}
                          onChange={(e) => setNewOrganisation(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateOrganisation(userItem.id, newOrganisation);
                            } else if (e.key === 'Escape') {
                              cancelEditingOrganisation();
                            }
                          }}
                          style={{
                            backgroundColor: 'white',
                            color: 'black'
                          }}
                        >
                          <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select Organisation</option>
                          {organisations.map(org => (
                            <option key={org} value={org} style={{ backgroundColor: 'white', color: 'black' }}>
                              {org}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateOrganisation(userItem.id, newOrganisation)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingOrganisation}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Cancel"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{userItem.organisation || 'Not assigned'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingOrganisation(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit organisation"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingCompetencies === userItem.id ? (
                      <div className="flex flex-col gap-1 w-full">
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
                          {competencies.map(comp => {
                            const selectedCompetencies = newCompetencies ? newCompetencies.split(',').map(c => c.trim()) : [];
                            return (
                              <label key={comp} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedCompetencies.includes(comp)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const updated = selectedCompetencies.length > 0
                                        ? [...selectedCompetencies, comp].join(', ')
                                        : comp;
                                      setNewCompetencies(updated);
                                    } else {
                                      const updated = selectedCompetencies.filter(c => c !== comp);
                                      setNewCompetencies(updated.join(', '));
                                    }
                                  }}
                                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-xs">{comp}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateCompetencies(userItem.id, newCompetencies)}
                            className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded bg-green-50"
                            title="Save"
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={cancelEditingCompetencies}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded bg-red-50"
                            title="Cancel"
                          >
                            ✗ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{userItem.competencies || 'Not assigned'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingCompetencies(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit competencies"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isSuperAdmin && editingPtsNumber === userItem.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newPtsNumber}
                          onChange={(e) => setNewPtsNumber(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updatePtsNumber(userItem.id, newPtsNumber);
                            } else if (e.key === 'Escape') {
                              cancelEditingPtsNumber();
                            }
                          }}
                          placeholder="Enter PTS Number"
                        />
                        <button
                          onClick={() => updatePtsNumber(userItem.id, newPtsNumber)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingPtsNumber}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Cancel"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{userItem.pts_number || 'Not assigned'}</span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEditingPtsNumber(userItem)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                            title="Edit PTS number"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userItem.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userItem.last_login)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isSuperAdmin && editingHireDate === userItem.id ? (
                      <>
                        <input
                          type="date"
                          value={newHireDate}
                          onChange={(e) => setNewHireDate(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateHireDate(userItem.id);
                            }
                          }}
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleUpdateHireDate(userItem.id)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingHireDate(null)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <span
                        onClick={() => {
                          if (isSuperAdmin) {
                            setEditingHireDate(userItem.id);
                            setNewHireDate(userItem.hire_date || '');
                          }
                        }}
                        className={isSuperAdmin ? "cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" : ""}
                      >
                        {userItem.hire_date ? formatDate(userItem.hire_date) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isSuperAdmin && editingTerminationDate === userItem.id ? (
                      <>
                        <input
                          type="date"
                          value={newTerminationDate}
                          onChange={(e) => setNewTerminationDate(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateTerminationDate(userItem.id);
                            }
                          }}
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleUpdateTerminationDate(userItem.id)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTerminationDate(null)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <span
                        onClick={() => {
                          if (isSuperAdmin) {
                            setEditingTerminationDate(userItem.id);
                            setNewTerminationDate(userItem.termination_date || '');
                          }
                        }}
                        className={isSuperAdmin ? "cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" : ""}
                      >
                        {userItem.termination_date ? formatDate(userItem.termination_date) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {mfaStatuses[userItem.id] ? (
                      <div className="flex items-center">
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                          Enabled
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setUserToResetMFA(userItem); setIsResetMFAModalOpen(true); }}
                            className="ml-2 p-1 text-orange-600 hover:text-orange-800"
                            title="Reset MFA"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Disabled
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <select
                          value={userItem.privilege}
                          onChange={(e) => updateUserPrivilege(userItem.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          disabled={!isSuperAdmin && userItem.privilege === 'Admin'}
                          style={{
                            backgroundColor: 'white',
                            color: 'black'
                          }}
                        >
                          <option value="Viewer" style={{ backgroundColor: 'white', color: 'black' }}>Viewer</option>
                          <option value="Viewer+" style={{ backgroundColor: 'white', color: 'black' }}>Viewer+</option>
                          <option value="Editor" style={{ backgroundColor: 'white', color: 'black' }}>Editor</option>
                          <option value="Editor+" style={{ backgroundColor: 'white', color: 'black' }}>Editor+</option>
                          {isSuperAdmin && <option value="Admin" style={{ backgroundColor: 'white', color: 'black' }}>Admin</option>}
                        </select>
                        {userItem.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(userItem.id, userItem.email)}
                            className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                          >
                            Soft Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avatar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competencies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PTS Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dummyUsers.map((dummyUser) => (
                  <tr key={dummyUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
                          {isAdmin && editingDummyAvatar === dummyUser.id ? (
                            <input
                              type="text"
                              value={newDummyAvatar}
                              onChange={(e) => setNewDummyAvatar(e.target.value)}
                              className="w-8 h-8 text-center text-xs text-white bg-transparent border border-white rounded-full focus:outline-none focus:ring-1 focus:ring-white"
                              maxLength="3"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveDummyField(dummyUser.id, 'avatar');
                                } else if (e.key === 'Escape') {
                                  cancelEditingDummyField('avatar');
                                }
                              }}
                              placeholder="ABC"
                            />
                          ) : (
                            dummyUser.avatar || 'DU'
                          )}
                        </div>
                        {isAdmin && editingDummyAvatar !== dummyUser.id && (
                          <button
                            onClick={() => startEditingDummyField(dummyUser.id, 'avatar', dummyUser.avatar)}
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-green-700"
                            title="Edit avatar"
                          >
                            ✏️
                          </button>
                        )}
                        {isAdmin && editingDummyAvatar === dummyUser.id && (
                          <div className="absolute -bottom-1 -right-1 flex gap-1">
                            <button
                              onClick={() => saveDummyField(dummyUser.id, 'avatar')}
                              className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-green-700"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => cancelEditingDummyField('avatar')}
                              className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-700"
                              title="Cancel"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {isAdmin && editingDummyName === dummyUser.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newDummyName}
                              onChange={(e) => setNewDummyName(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveDummyField(dummyUser.id, 'name');
                                } else if (e.key === 'Escape') {
                                  cancelEditingDummyField('name');
                                }
                              }}
                            />
                            <button
                              onClick={() => saveDummyField(dummyUser.id, 'name')}
                              className="text-green-600 hover:text-green-800 text-xs"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => cancelEditingDummyField('name')}
                              className="text-red-600 hover:text-red-800 text-xs"
                              title="Cancel"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{dummyUser.name}</span>
                            {isAdmin && (
                              <button
                                onClick={() => startEditingDummyField(dummyUser.id, 'name', dummyUser.name)}
                                className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                                title="Edit name"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {isAdmin && editingDummyUsername === dummyUser.id ? (
                          <div className="flex items-center gap-1">
                            <span>@</span>
                            <input
                              type="text"
                              value={newDummyUsername}
                              onChange={(e) => setNewDummyUsername(e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-20"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveDummyField(dummyUser.id, 'username');
                                } else if (e.key === 'Escape') {
                                  cancelEditingDummyField('username');
                                }
                              }}
                            />
                            <button
                              onClick={() => saveDummyField(dummyUser.id, 'username')}
                              className="text-green-600 hover:text-green-800 text-xs"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => cancelEditingDummyField('username')}
                              className="text-red-600 hover:text-red-800 text-xs"
                              title="Cancel"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>@{dummyUser.username}</span>
                            {isAdmin && (
                              <button
                                onClick={() => startEditingDummyField(dummyUser.id, 'username', dummyUser.username)}
                                className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                                title="Edit username"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyEmail === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="email"
                            value={newDummyEmail}
                            onChange={(e) => setNewDummyEmail(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'email');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('email');
                              }
                            }}
                          />
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'email')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('email')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.email}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'email', dummyUser.email)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit email"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyMobileNumber === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="tel"
                            value={newDummyMobileNumber}
                            onChange={(e) => setNewDummyMobileNumber(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'mobile_number');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('mobile_number');
                              }
                            }}
                            placeholder="Phone number"
                          />
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'mobile_number')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('mobile_number')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.mobile_number || 'Not set'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'mobile_number', dummyUser.mobile_number)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit mobile number"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyTeamRole === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={newDummyTeamRole}
                            onChange={(e) => setNewDummyTeamRole(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'team_role');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('team_role');
                              }
                            }}
                            style={{ backgroundColor: 'white', color: 'black' }}
                          >
                            <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select Team Role</option>
                            {teamRoles.map(role => (
                              <option key={role} value={role} style={{ backgroundColor: 'white', color: 'black' }}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'team_role')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('team_role')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.team_role || 'Not assigned'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'team_role', dummyUser.team_role)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit team role"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyDepartment === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={newDummyDepartment}
                            onChange={(e) => setNewDummyDepartment(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'department');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('department');
                              }
                            }}
                            style={{ backgroundColor: 'white', color: 'black' }}
                          >
                            <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select Department</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept} style={{ backgroundColor: 'white', color: 'black' }}>
                                {dept}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'department')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('department')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.department || 'Not assigned'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'department', dummyUser.department)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit department"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyOrganisation === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={newDummyOrganisation}
                            onChange={(e) => setNewDummyOrganisation(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'organisation');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('organisation');
                              }
                            }}
                            style={{ backgroundColor: 'white', color: 'black' }}
                          >
                            <option value="" style={{ backgroundColor: 'white', color: 'black' }}>Select Organisation</option>
                            {organisations.map(org => (
                              <option key={org} value={org} style={{ backgroundColor: 'white', color: 'black' }}>
                                {org}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'organisation')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('organisation')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.organisation || 'Not assigned'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'organisation', dummyUser.organisation)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit organisation"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyCompetencies === dummyUser.id ? (
                        <div className="flex flex-col gap-1 w-full">
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
                            {competencies.map(comp => {
                              const selectedCompetencies = newDummyCompetencies ? newDummyCompetencies.split(',').map(c => c.trim()) : [];
                              return (
                                <label key={comp} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedCompetencies.includes(comp)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const updated = selectedCompetencies.length > 0
                                          ? [...selectedCompetencies, comp].join(', ')
                                          : comp;
                                        setNewDummyCompetencies(updated);
                                      } else {
                                        const updated = selectedCompetencies.filter(c => c !== comp);
                                        setNewDummyCompetencies(updated.join(', '));
                                      }
                                    }}
                                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <span className="text-xs">{comp}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveDummyField(dummyUser.id, 'competencies')}
                              className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded bg-green-50"
                              title="Save"
                            >
                              ✓ Save
                            </button>
                            <button
                              onClick={() => cancelEditingDummyField('competencies')}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded bg-red-50"
                              title="Cancel"
                            >
                              ✗ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{dummyUser.competencies || 'Not assigned'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'competencies', dummyUser.competencies)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit competencies"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isAdmin && editingDummyPtsNumber === dummyUser.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newDummyPtsNumber}
                            onChange={(e) => setNewDummyPtsNumber(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveDummyField(dummyUser.id, 'pts_number');
                              } else if (e.key === 'Escape') {
                                cancelEditingDummyField('pts_number');
                              }
                            }}
                            placeholder="Enter PTS Number"
                          />
                          <button
                            onClick={() => saveDummyField(dummyUser.id, 'pts_number')}
                            className="text-green-600 hover:text-green-800 text-xs"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => cancelEditingDummyField('pts_number')}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{dummyUser.pts_number || 'Not assigned'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => startEditingDummyField(dummyUser.id, 'pts_number', dummyUser.pts_number)}
                              className="text-blue-600 hover:text-blue-800 text-xs ml-1"
                              title="Edit PTS number"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        dummyUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {dummyUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(dummyUser.created_at)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateDummyUser(dummyUser.id, 'is_active', !dummyUser.is_active)}
                            className={`text-xs px-2 py-1 rounded ${
                              dummyUser.is_active
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {dummyUser.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteDummyUser(dummyUser.id, dummyUser.name)}
                            className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Deleted Real Users */}
                  {deletedUsers.map((deletedUser) => (
                    <tr key={`real-${deletedUser.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">{deletedUser.username?.substring(0, 2).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{deletedUser.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deletedUser.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Real User</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(deletedUser.deleted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                          onClick={() => restoreRealUser(deletedUser.id, deletedUser.username)}
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Deleted Dummy Users */}
                  {deletedDummyUsers.map((deletedDummyUser) => (
                    <tr key={`dummy-${deletedDummyUser.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">{deletedDummyUser.avatar || deletedDummyUser.name?.substring(0, 2).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{deletedDummyUser.name}</div>
                            <div className="text-sm text-gray-500">{deletedDummyUser.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deletedDummyUser.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dummy User</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(deletedDummyUser.deleted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                          onClick={() => restoreDummyUser(deletedDummyUser.id, deletedDummyUser.name)}
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
                <select
                  value={realUserForm.privilege}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, privilege: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Viewer+">Viewer+</option>
                  <option value="Editor">Editor</option>
                  <option value="Editor+">Editor+</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Role</label>
                <select
                  value={realUserForm.team_role}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, team_role: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Team Role</option>
                  {teamRoles.map((role, index) => (
                    <option key={`team-role-${index}`} value={role}>{role}</option>
                  ))}
                </select>
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
                <select
                  value={realUserForm.department}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, index) => (
                    <option key={`dept-${index}`} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation</label>
                <select
                  value={realUserForm.organisation}
                  onChange={(e) => setRealUserForm(prev => ({ ...prev, organisation: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Organisation</option>
                  {organisations.map((org, index) => (
                    <option key={`org-${index}`} value={org}>{org}</option>
                  ))}
                </select>
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

      {/* Add Dummy User Modal */}
      {showAddDummyUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Dummy User</h3>
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
                <select
                  value={dummyUserForm.team_role}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, team_role: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                  style={{
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'white', color: '#111827' }}>Select Team Role</option>
                  {(teamRoles.length > 0 ? teamRoles : fallbackTeamRoles).map(role => (
                    <option key={role} value={role} style={{ backgroundColor: 'white', color: '#111827' }}>{role}</option>
                  ))}
                </select>
                {teamRoles.length === 0 && fallbackTeamRoles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback team roles. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={dummyUserForm.department}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                  style={{
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'white', color: '#111827' }}>Select Department</option>
                  {(departments.length > 0 ? departments : fallbackDepartments).map(dept => (
                    <option key={dept} value={dept} style={{ backgroundColor: 'white', color: '#111827' }}>{dept}</option>
                  ))}
                </select>
                {departments.length === 0 && fallbackDepartments.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback departments. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organisation</label>
                <select
                  value={dummyUserForm.organisation}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, organisation: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                  style={{
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'white', color: '#111827' }}>Select Organisation</option>
                  {(organisations.length > 0 ? organisations : fallbackOrganisations).map(org => (
                    <option key={org} value={org} style={{ backgroundColor: 'white', color: '#111827' }}>{org}</option>
                  ))}
                </select>
                {organisations.length === 0 && fallbackOrganisations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using fallback organisations. Check database configuration for dynamic options.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Competencies</label>
                <div className="mt-1 border border-gray-300 rounded-md p-3 bg-white max-h-40 overflow-y-auto">
                  {competencies.map(comp => {
                    const selectedCompetencies = dummyUserForm.competencies ? dummyUserForm.competencies.split(',').map(c => c.trim()) : [];
                    return (
                      <label key={comp} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCompetencies.includes(comp)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const updated = selectedCompetencies.length > 0
                                ? [...selectedCompetencies, comp].join(', ')
                                : comp;
                              setDummyUserForm(prev => ({ ...prev, competencies: updated }));
                            } else {
                              const updated = selectedCompetencies.filter(c => c !== comp);
                              setDummyUserForm(prev => ({ ...prev, competencies: updated.join(', ') }));
                            }
                          }}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm">{comp}</span>
                      </label>
                    );
                  })}
                  {competencies.length === 0 && (
                    <p className="text-xs text-gray-500">No competencies available. Please add them in Dropdown Menu Management.</p>
                  )}
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Weekend Availability</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dummyUserForm.available_saturday}
                      onChange={(e) => setDummyUserForm(prev => ({ ...prev, available_saturday: e.target.checked }))}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm">Available Saturdays</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dummyUserForm.available_sunday}
                      onChange={(e) => setDummyUserForm(prev => ({ ...prev, available_sunday: e.target.checked }))}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm">Available Sundays</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Privilege</label>
                <select
                  value={dummyUserForm.privilege}
                  onChange={(e) => setDummyUserForm(prev => ({ ...prev, privilege: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                  style={{
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                >
                  <option value="Viewer" style={{ backgroundColor: 'white', color: '#111827' }}>Viewer</option>
                  <option value="Viewer+" style={{ backgroundColor: 'white', color: '#111827' }}>Viewer+</option>
                  <option value="Editor" style={{ backgroundColor: 'white', color: '#111827' }}>Editor</option>
                  <option value="Editor+" style={{ backgroundColor: 'white', color: '#111827' }}>Editor+</option>
                  {isSuperAdmin && <option value="Admin" style={{ backgroundColor: 'white', color: '#111827' }}>Admin</option>}
                </select>
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