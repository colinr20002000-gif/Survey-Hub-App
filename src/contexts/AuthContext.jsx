import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';

// This context manages user authentication across the entire app
// It keeps track of who's logged in and provides login/logout functions
// Any component can access this info without passing props down multiple levels
const AuthContext = createContext(null);

// This hook lets any component access authentication info
// It's like a shortcut to get the current user, login function, etc.
// Must be used inside a component wrapped by AuthProvider
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  // Get the authentication data from context
  const context = useContext(AuthContext);
  
  // If someone tries to use this hook outside AuthProvider, show helpful error
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// This component wraps our entire app and provides authentication state
// It manages the current logged-in user and provides login/logout functions
// Any component inside this provider can use the useAuth hook
export const AuthProvider = ({ children }) => {
  console.log('🚀 AuthProvider component rendered');
  
  // Keep track of the currently logged-in user (null = not logged in)
  const [user, setUser] = useState(null);
  
  // Keep track of whether we're in the middle of logging in
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch or create user data from users table
  const fetchUserData = async (authUser) => {
    if (!authUser) return null;
    
    console.log('🔐 fetchUserData started for:', authUser.email);
    
    try {
      // First, try to get user data from the users table
      console.log('🔐 Querying users table for id:', authUser.id);
      
      // Skip connection test since it's working fine
      
      // If connection works, try the actual query with timeout
      console.log('🔐 Attempting user query...');
      const userQuery = Promise.race([
        supabase.from('users').select('*').eq('id', authUser.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout')), 8000)
        )
      ]);
      
      let userArray, fetchError;
      try {
        const result = await userQuery;
        userArray = result.data;
        fetchError = result.error;
        console.log('🔐 User query result:', { userArray, fetchError });
      } catch (timeoutError) {
        console.error('🔐 User query timed out:', timeoutError);
        
        // Return fallback user data if query times out
        // Special handling for known Admin user
        const isAdminUser = authUser.email === 'colin.rogers@inorail.co.uk';
        
        return {
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0].replace(/[._]/g, ' '),
          username: authUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''),
          teamRole: 'Site Team',
          avatar: authUser.email.charAt(0).toUpperCase(),
          privilege: isAdminUser ? 'Admin' : 'Site Staff',
          last_sign_in_at: authUser.last_sign_in_at,
          auth_user: authUser
        };
      }
      
      const existingUser = userArray && userArray.length > 0 ? userArray[0] : null;
      
      if (existingUser && !fetchError) {
        // User exists in our users table, return combined data
        return {
          ...existingUser,
          email: authUser.email, // Always use auth email as source of truth
          teamRole: existingUser.team_role, // Map snake_case to camelCase
          last_sign_in_at: authUser.last_sign_in_at,
          auth_user: authUser
        };
      }
      
      // Only proceed with creation if error is "not found" (PGRST116)
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Database error:', fetchError);
        return null;
      }
      
      // User doesn't exist in users table, create a new entry
      console.log('Creating new user entry for:', authUser.email);
      
      // Extract name from email or user_metadata
      const email = authUser.email;
      const name = authUser.user_metadata?.name || 
                   authUser.user_metadata?.full_name || 
                   email.split('@')[0].replace(/[._]/g, ' ');
      
      // Generate avatar initials from name
      const avatar = name.split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || email.charAt(0).toUpperCase();
      
      // Create username from email and ensure uniqueness
      let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      
      // Default user data  
      const isAdminUser = authUser.email === 'colin.rogers@inorail.co.uk';
      const newUserData = {
        id: authUser.id,
        email: authUser.email,
        name: name,
        username: username,
        team_role: 'Site Team',
        avatar: avatar,
        privilege: isAdminUser ? 'Admin' : 'Site Staff'
      };
      
      // Insert new user into users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user:', insertError);
        
        // If username conflict, try with a timestamp suffix
        if (insertError.code === '23505' && insertError.message.includes('username')) {
          const uniqueUsername = `${username}_${Date.now()}`;
          const retryUserData = { ...newUserData, username: uniqueUsername };
          
          const { data: retryUser, error: retryError } = await supabase
            .from('users')
            .insert([retryUserData])
            .select()
            .single();
            
          if (!retryError && retryUser) {
            return {
              ...retryUser,
              teamRole: retryUser.team_role,
              last_sign_in_at: authUser.last_sign_in_at,
              auth_user: authUser
            };
          }
        }
        
        // Return basic user data if database insert fails
        const isAdminUser = authUser.email === 'colin.rogers@inorail.co.uk';
        return {
          id: authUser.id,
          email: authUser.email,
          name: name,
          username: username,
          teamRole: 'Site Team',
          avatar: avatar,
          privilege: isAdminUser ? 'Admin' : 'Site Staff',
          last_sign_in_at: authUser.last_sign_in_at,
          auth_user: authUser
        };
      }
      
      return {
        ...newUser,
        teamRole: newUser.team_role, // Map snake_case to camelCase for consistency
        last_sign_in_at: authUser.last_sign_in_at,
        auth_user: authUser
      };
      
    } catch (err) {
      console.error('Error in fetchUserData:', err);
      return null;
    }
  };

  // Set up authentication state listener on component mount
  useEffect(() => {
    console.log('🔐 AuthProvider mounted - initializing authentication');
    console.log('🔐 Supabase client:', supabase);
    
    // Get initial session with increased timeout
    const sessionTimeout = setTimeout(() => {
      console.error('🔐 Session check timed out, proceeding without session');
      setUser(null);
      setIsLoading(false);
    }, 15000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      clearTimeout(sessionTimeout);
      console.log('🔐 Initial session check:', { session: !!session, error });
      
      if (error) {
        console.error('🔐 Session error:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('🔐 Found existing session for:', session.user.email);
        try {
          const userData = await fetchUserData(session.user);
          console.log('🔐 User data loaded:', userData ? 'Success' : 'Failed');
          setUser(userData);
        } catch (err) {
          console.error('🔐 Error loading user data:', err);
          setUser(null);
        }
      } else {
        console.log('🔐 No existing session found');
        setUser(null);
      }
      setIsLoading(false);
    }).catch(err => {
      clearTimeout(sessionTimeout);
      console.error('🔐 Critical error in getSession:', err);
      setUser(null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session: !!session });
      
      if (session?.user) {
        console.log('Auth change - loading user data for:', session.user.email);
        const userData = await fetchUserData(session.user);
        console.log('User data loaded:', userData ? 'Success' : 'Failed');
        setUser(userData);
      } else {
        console.log('Auth change - no session');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // This function handles the login process using Supabase
  const login = async (email, password) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // This function logs the user out using Supabase
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    }
  };

  // Bundle up all the data and functions that components might need
  const value = {
    user,                    // Current user info (or null if not logged in)
    login,                   // Function to log in
    logout,                  // Function to log out
    isLoading,              // Whether a login attempt is in progress
    isAuthenticated: !!user, // Quick way to check if someone is logged in
  };

  // Provide this data to all child components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

AuthProvider.displayName = 'AuthProvider';