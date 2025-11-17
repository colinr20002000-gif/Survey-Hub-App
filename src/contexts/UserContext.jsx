import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch only active real users (not deleted)
            const { data: realUsers, error: realUsersError} = await supabase
                .from('users')
                .select('*')
                .is('deleted_at', null)
                .order('name', { ascending: true });

            // Fetch only active dummy users (not deleted and is_active = true)
            const { data: dummyUsers, error: dummyUsersError } = await supabase
                .from('dummy_users')
                .select('*')
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('name', { ascending: true });

            if (realUsersError && dummyUsersError) {
                throw new Error(`Failed to fetch users: ${realUsersError.message} and ${dummyUsersError.message}`);
            }

            // Combine real users and dummy users
            const allUsers = [];

            // Add real users (mark them as real users)
            if (realUsers) {
                allUsers.push(...realUsers.map(user => ({ ...user, isDummy: false })));
            }

            // Add dummy users (mark them as dummy users and normalize fields)
            if (dummyUsers) {
                allUsers.push(...dummyUsers.map(dummyUser => ({
                    ...dummyUser,
                    isDummy: true,
                    privilege: 'Dummy', // Special privilege for dummy users
                    last_login: null // Dummy users don't login
                })));
            }

            // Sort combined list by name
            allUsers.sort((a, b) => a.name.localeCompare(b.name));

            setUsers(allUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getUsers();

        // Set up real-time subscription to refresh when users change
        const subscription = supabase
            .channel('user-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users'
                },
                () => {
                    console.log('👥 User table changed, refreshing users...');
                    getUsers();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dummy_users'
                },
                () => {
                    console.log('👥 Dummy users table changed, refreshing users...');
                    getUsers();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [getUsers]);

    const addUser = useCallback(async (userData) => {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();

        if (error) {
             console.error('Error adding user:', error);
             alert(`Error adding user: ${error.message}`);
             return;
        }
        if (data) setUsers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const addAuthUser = useCallback(async (userData) => {
        try {
            // Get the current session token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('No active session');
            }

            // Call the Edge Function to create auth user
            const { data, error } = await supabase.functions.invoke('create-auth-user', {
                body: {
                    email: userData.email,
                    password: userData.password,
                    name: userData.name,
                    username: userData.username,
                    privilege: userData.privilege,
                    teamRole: userData.team_role || userData.teamRole,
                    hire_date: userData.hire_date,
                    termination_date: userData.termination_date
                }
            });

            if (error) {
                console.error('Error calling create-auth-user function:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to create user');
            }

            // Add the new user to local state
            setUsers(prev => [...prev, data.user].sort((a, b) => a.name.localeCompare(b.name)));

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error adding auth user:', error);
            alert(`Error creating user: ${error.message}`);
            return { success: false, error: error.message };
        }
    }, []);

    const updateUser = useCallback(async (updatedUser) => {
        const { data, error } = await supabase
            .from('users')
            .update(updatedUser)
            .eq('id', updatedUser.id)
            .select();

        if (error) {
            console.error('Error updating user:', error);
            alert(`Error updating user: ${error.message}`);
        } else if (data) {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? data[0] : u));
        }
    }, []);

    const deleteUser = useCallback(async (userId) => {
        // Soft delete by setting deleted_at timestamp instead of hard delete
        const { error } = await supabase
            .from('users')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Error deleting user:', error);
            alert(`Error deleting user: ${error.message}`);
        } else {
            // Remove from local state since getUsers filters by deleted_at IS NULL
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        users,
        addUser,
        addAuthUser,
        updateUser,
        deleteUser,
        loading,
        error,
        refreshUsers: getUsers
    }), [users, addUser, addAuthUser, updateUser, deleteUser, loading, error, getUsers]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUsers = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
};
