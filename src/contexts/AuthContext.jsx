import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';
import { getMessaging, deleteToken } from 'firebase/messaging';
import firebaseApp from '../firebaseConfig';

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
      
      console.log('🔐 Attempting user query...');

      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );

      const { data: userArray, error: fetchError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch(error => {
        console.error('🔐 Query failed or timed out:', error);
        // Return a fallback user object based on auth metadata if query fails
        const privilege = authUser.user_metadata?.privilege ||
                         authUser.raw_user_meta_data?.privilege ||
                         'Admin';

        return {
          data: [{
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name ||
                  authUser.email.split('@')[0].replace(/[._]/g, ' '),
            role: privilege,
            privilege: privilege,
            created_at: authUser.created_at || new Date().toISOString(),
            last_login: authUser.last_sign_in_at || new Date().toISOString()
          }],
          error: null
        };
      });

      console.log('🔐 User query result:', { userArray, fetchError });
      
      const existingUser = userArray && userArray.length > 0 ? userArray[0] : null;
      
      if (existingUser && !fetchError) {
        // User exists in our users table, return combined data
        return {
          ...existingUser,
          email: authUser.email, // Always use auth email as source of truth
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
      
      const newUserData = {
        id: authUser.id,
        email: authUser.email,
        name: name,
        username: username,
        team_role: 'Site Team',
        avatar: avatar,
        privilege: 'Viewer' // Set 'Viewer' as the default privilege for all new users
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
        return {
          id: authUser.id,
          email: authUser.email,
          name: name,
          username: username,
          teamRole: 'Site Team',
          avatar: avatar,
          privilege: 'Viewer', // Default to Viewer on failure
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
          let userData = await fetchUserData(session.user);
          console.log('🔐 User data loaded:', userData ? 'Success' : 'Failed');

          // Super admin override
          if (userData && userData.email === 'colin.rogers@inorail.co.uk') {
            console.log('🔐 Super admin override: Setting privilege to Admin.');
            userData.privilege = 'Admin';
          }

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
        let userData = await fetchUserData(session.user);
        console.log('User data loaded:', userData ? 'Success' : 'Failed');

        // Super admin override
        if (userData && userData.email === 'colin.rogers@inorail.co.uk') {
          console.log('🔐 Super admin override: Setting privilege to Admin.');
          userData.privilege = 'Admin';
        }
        
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
    console.log('🔄 Logout process started');

    // Try to clean up FCM tokens, but don't let failures block logout
    try {
      console.log('🧹 Starting FCM cleanup...');

      // First, deactivate FCM subscriptions for current device if user exists
      if (user?.id) {
        try {
          // Get stored browser ID for fingerprint generation during logout
          const browserId = localStorage.getItem('browser_device_id');

          if (browserId) {
            // Use a simplified fingerprinting approach during logout to avoid potential issues
            const simpleFingerprint = [
              navigator.userAgent,
              navigator.language,
              navigator.platform,
              screen.width + 'x' + screen.height,
              browserId
            ].join('|');

            let hash = 0;
            for (let i = 0; i < simpleFingerprint.length; i++) {
              const char = simpleFingerprint.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }

            const deviceFingerprint = 'device_' + Math.abs(hash).toString(36);
            console.log('📱 Device fingerprint for logout cleanup:', deviceFingerprint);

            // Deactivate push subscriptions for this user on this device
            const { error: deactivateError } = await Promise.race([
              supabase
                .from('push_subscriptions')
                .update({
                  is_active: false,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('device_fingerprint', deviceFingerprint),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database cleanup timeout')), 3000)
              )
            ]);

            if (deactivateError) {
              console.warn('⚠️ Error deactivating FCM subscriptions (non-blocking):', deactivateError);
            } else {
              console.log('✅ FCM subscriptions deactivated successfully');
            }
          }
        } catch (dbError) {
          console.warn('⚠️ Database cleanup error (non-blocking):', dbError);
        }
      }

      // Try to delete Firebase token with timeout
      try {
        const messaging = getMessaging(firebaseApp);
        await Promise.race([
          deleteToken(messaging),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Token deletion timeout')), 3000)
          )
        ]);
        console.log('🔥 FCM token deleted successfully');
      } catch (tokenError) {
        console.warn('⚠️ FCM token deletion failed (non-blocking):', tokenError);
      }

    } catch (error) {
      console.warn('⚠️ FCM cleanup error (non-blocking):', error);
    }

    // ALWAYS sign out, regardless of cleanup success/failure
    try {
      console.log('🚪 Signing out from Supabase...');
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('❌ Supabase signOut error:', signOutError);
        throw signOutError;
      }

      console.log('✅ Logout completed successfully');
    } catch (signOutError) {
      console.error('❌ Critical logout error:', signOutError);

      // Force clear local session state even if Supabase signout fails
      setUser(null);
      setIsLoading(false);

      throw signOutError;
    }
  };

  // Function to update user information
  const updateUser = async (updates) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('🔐 Updating user data:', updates);

      // If name is being updated, also update the avatar
      if (updates.name) {
        updates.avatar = updates.name.split(' ').map(n => n[0]).join('');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local user state with new data
      setUser(data);
      console.log('🔐 User data updated successfully:', data);

      return data;
    } catch (err) {
      console.error('🔐 Error updating user data:', err);
      throw err;
    }
  };

  // Bundle up all the data and functions that components might need
  const value = {
    user,                    // Current user info (or null if not logged in)
    login,                   // Function to log in
    logout,                  // Function to log out
    updateUser,              // Function to update user data
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