import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const UserAdmin = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teamRoles, setTeamRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
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
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [newAvatar, setNewAvatar] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [newName, setNewName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  useEffect(() => {
    fetchUsers();
    fetchTeamRoles();
    fetchDepartments();
    fetchOrganisations();
  }, []);

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
      const { data, error } = await supabase
        .from('dropdown_items')
        .select(`
          display_text,
          dropdown_categories!inner(name)
        `)
        .eq('dropdown_categories.name', 'Department')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching departments:', error);
        setDepartments([]);
        return;
      }

      if (data && data.length > 0) {
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
      const { data, error } = await supabase
        .from('dropdown_items')
        .select(`
          display_text,
          dropdown_categories!inner(name)
        `)
        .eq('dropdown_categories.name', 'Organisation')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching organisations:', error);
        setOrganisations([]);
        return;
      }

      if (data && data.length > 0) {
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
        supabase.from('users').select('*').order('created_at', { ascending: false }),
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

  const deleteUser = async (userId, userEmail) => {
    if (!isAdmin) {
      alert('Only administrators can delete users');
      return;
    }

    if (userId === user?.id) {
      alert('You cannot delete your own account');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete user ${userEmail}? This will also delete their authentication account and cannot be undone.`);
    
    if (!confirmDelete) return;

    try {
      const deleteQuery = Promise.race([
        supabase.from('users').delete().eq('id', userId),
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
      case 'Editor': return 'bg-yellow-100 text-yellow-800';
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
          Manage all users registered in the system. Total users: {users.length}
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">All Users</h2>
            <button
              onClick={fetchUsers}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
            >
              Refresh
            </button>
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
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
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
                          userItem.avatar || 'N/A'
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userItem.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userItem.last_login)}
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
                          <option value="Editor" style={{ backgroundColor: 'white', color: 'black' }}>Editor</option>
                          {isSuperAdmin && <option value="Admin" style={{ backgroundColor: 'white', color: 'black' }}>Admin</option>}
                        </select>
                        {userItem.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(userItem.id, userItem.email)}
                            className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                          >
                            Delete
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
    </div>
  );
};

export default UserAdmin;