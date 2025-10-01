import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';
import { getMessaging, deleteToken } from 'firebase/messaging';
import firebaseApp from '../firebaseConfig';
import { getFCMToken } from '../firebaseConfig';

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

  // Track if push notification subscription has been attempted for current user
  const [pushSubscriptionAttempted, setPushSubscriptionAttempted] = useState(false);

  // Function to fetch or create user data from users table
  const fetchUserData = async (authUser) => {
    if (!authUser) return null;
    
    console.log('🔐 fetchUserData started for:', authUser.email);
    
    try {
      // First, try to get user data from the users table
      console.log('🔐 Querying users table for id:', authUser.id);
      
      // Skip connection test since it's working fine
      
      console.log('🔐 Attempting user query...');

      // Add timeout to prevent hanging, with retry logic
      let queryAttempt = 0;
      let userArray = null;
      let fetchError = null;

      while (queryAttempt < 1 && !userArray) {
        queryAttempt++;
        console.log(`🔐 Query attempt ${queryAttempt}/1...`);

        const queryPromise = supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        );

        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]).catch(error => {
          console.error(`🔐 Query attempt ${queryAttempt} failed:`, error);
          return { data: null, error };
        });

        userArray = result.data;
        fetchError = result.error;

        // If we got data or a real database error (not timeout), break the loop
        if (userArray || (fetchError && fetchError.message !== 'Query timeout')) {
          break;
        }

        // Wait 500ms before retry if it was a timeout
        if (queryAttempt < 1) {
          console.log('🔐 Waiting 500ms before retry...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // If all retries failed, return null to trigger error handling
      if (!userArray && fetchError?.message === 'Query timeout') {
        console.error('🔐 All query attempts failed - returning null');
        return null;
      }

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

  // Auto-subscribe to push notifications for authenticated users
  const autoSubscribePushNotifications = async (userData) => {
    // Skip if already attempted for this user session
    if (pushSubscriptionAttempted) {
      console.log('📵 Push notification subscription already attempted for this session');
      return;
    }

    // Skip if user has opted out of auto-subscribe
    if (localStorage.getItem('fcm_auto_subscribe_opted_out') === 'true') {
      console.log('📵 User opted out of automatic push notifications');
      return;
    }

    // Skip if push notifications are not supported
    if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)) {
      console.log('📵 Push notifications not supported in this browser');
      return;
    }

    // Skip if user ID is missing
    if (!userData?.id || !userData?.email) {
      console.log('📵 Missing user data for push notification subscription');
      return;
    }

    try {
      // Mark as attempted to prevent duplicate calls
      setPushSubscriptionAttempted(true);

      console.log('🔔 Attempting automatic push notification subscription for:', userData.email);

      // Generate device fingerprint (similar to useFcm hook)
      const generateDeviceFingerprint = () => {
        const getBrowserId = () => {
          let browserId = localStorage.getItem('browser_device_id');
          if (!browserId) {
            browserId = 'bid_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
            localStorage.setItem('browser_device_id', browserId);
          }
          return browserId;
        };

        const fingerprint = [
          navigator.userAgent,
          navigator.language,
          navigator.platform,
          screen.width + 'x' + screen.height,
          new Date().getTimezoneOffset(),
          getBrowserId()
        ].join('|');

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }

        return 'device_' + Math.abs(hash).toString(36);
      };

      // Check if user already has an active subscription for this device
      const deviceFingerprint = generateDeviceFingerprint();

      const { data: existingSubscriptions, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('id, is_active')
        .eq('user_id', userData.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .limit(1);

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('📵 Error checking existing push subscriptions:', checkError);
        return;
      }

      // If user already has active subscription for this device, no need to create another
      if (existingSubscriptions && existingSubscriptions.length > 0) {
        console.log('✅ User already has active push subscription for this device');
        return;
      }

      // Check notification permission
      let permission = Notification.permission;

      // If permission is 'default', silently request it
      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
          console.log('🔔 Notification permission requested:', permission);
        } catch (permError) {
          console.log('📵 Silent permission request failed:', permError);
          return;
        }
      }

      // Only proceed if permission is granted
      if (permission !== 'granted') {
        console.log('📵 Notification permission not granted:', permission);
        return;
      }

      // Get FCM token
      let fcmToken;
      try {
        fcmToken = await getFCMToken();
        if (!fcmToken) {
          console.log('📵 Failed to get FCM token');
          return;
        }
      } catch (tokenError) {
        console.log('📵 Error getting FCM token:', tokenError);
        return;
      }

      // Device info for subscription
      const deviceInfo = {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: new Date().getTimezoneOffset(),
        autoSubscribed: true
      };

      // Use the database function to manage subscription
      const { data: result, error: subscriptionError } = await supabase
        .rpc('manage_user_push_subscription', {
          p_user_id: userData.id,
          p_user_email: userData.email,
          p_fcm_token: fcmToken,
          p_device_fingerprint: deviceFingerprint,
          p_device_info: deviceInfo
        });

      if (subscriptionError) {
        // Handle duplicate FCM token gracefully (409 conflict)
        if (subscriptionError.code === '23505' && subscriptionError.message?.includes('fcm_token')) {
          console.log('📵 FCM token already exists - auto-subscribe completed successfully');
          return;
        }
        // Only log actual errors, not duplicate token situations
        console.warn('📵 Auto-subscribe failed (non-blocking):', subscriptionError);
        return;
      }

      if (result && result.length > 0) {
        const action = result[0].action_taken || result[0].action;
        console.log(`✅ Auto-subscribed to push notifications (${action})`);

        // Store token in localStorage for cleanup during logout
        localStorage.setItem('fcm_token', fcmToken);
      }

    } catch (error) {
      console.warn('📵 Auto-subscribe error (non-blocking):', error);
      // Don't throw error - auto-subscribe should not block login
    }
  };

  // Set up authentication state listener on component mount
  useEffect(() => {
    console.log('🔐 AuthProvider mounted - initializing authentication');
    console.log('🔐 Supabase client:', supabase);

    // Get initial session with timeout
    const sessionTimeout = setTimeout(() => {
      console.error('🔐 Session check timed out, proceeding without session');
      setUser(null);
      setIsLoading(false);
    }, 5000);

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

          if (!userData) {
            console.error('🔐 Failed to load user data - keeping user logged out');
            setUser(null);
          } else {
            // Privilege is now correctly set in database via migration
            setUser(userData);

            // Auto-subscribe to push notifications after successful login
            autoSubscribePushNotifications(userData);
          }
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

        if (!userData) {
          console.error('🔐 Failed to load user data during auth state change');
          setUser(null);
        } else {
          // Privilege is now correctly set in database via migration
          setUser(userData);

          // Auto-subscribe to push notifications after successful login
          autoSubscribePushNotifications(userData);
        }
      } else {
        console.log('Auth change - no session');
        setUser(null);
        setPushSubscriptionAttempted(false);
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

    // Clear local state FIRST to prevent re-authentication
    setUser(null);
    setIsLoading(false);
    setPushSubscriptionAttempted(false);

    // ALWAYS sign out, regardless of cleanup success/failure
    try {
      console.log('🚪 Signing out from Supabase...');

      // Try local scope first, then global if needed
      let signOutError = null;

      try {
        const result = await supabase.auth.signOut({ scope: 'local' });
        signOutError = result.error;
      } catch (localError) {
        console.warn('Local signOut failed, trying global scope:', localError);
        try {
          const result = await supabase.auth.signOut({ scope: 'global' });
          signOutError = result.error;
        } catch (globalError) {
          console.warn('Global signOut also failed, proceeding with cleanup:', globalError);
          // Continue with local cleanup even if remote signout fails
        }
      }

      if (signOutError) {
        // Check if error is just "session missing" which means already logged out
        if (signOutError.message?.includes('Auth session missing') ||
            signOutError.message?.includes('session missing') ||
            signOutError.name === 'AuthSessionMissingError') {
          console.log('ℹ️ Session already cleared - logout successful');
        } else {
          console.warn('⚠️ Supabase signOut error (non-blocking):', signOutError);
          // Don't throw, continue with cleanup
        }
      }

      console.log('✅ Logout completed successfully');
    } catch (signOutError) {
      // Check if error is just "session missing" which means already logged out
      if (signOutError.message?.includes('Auth session missing') ||
          signOutError.message?.includes('session missing') ||
          signOutError.name === 'AuthSessionMissingError') {
        console.log('ℹ️ Session was already cleared - treating as successful logout');
        return; // Exit successfully
      }

      console.warn('⚠️ Logout error (non-blocking, local state cleared):', signOutError);

      // Don't throw error - local state is already cleared
      // User experience should be smooth even if remote logout fails
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

  // Functions to manage auto-subscribe preferences
  const optOutOfAutoSubscribe = () => {
    localStorage.setItem('fcm_auto_subscribe_opted_out', 'true');
    console.log('📵 User opted out of automatic push notifications');
  };

  const optInToAutoSubscribe = () => {
    localStorage.removeItem('fcm_auto_subscribe_opted_out');
    console.log('🔔 User opted in to automatic push notifications');
  };

  const isAutoSubscribeEnabled = () => {
    return localStorage.getItem('fcm_auto_subscribe_opted_out') !== 'true';
  };

  // Bundle up all the data and functions that components might need
  const value = {
    user,                    // Current user info (or null if not logged in)
    login,                   // Function to log in
    logout,                  // Function to log out
    updateUser,              // Function to update user data
    isLoading,              // Whether a login attempt is in progress
    isAuthenticated: !!user, // Quick way to check if someone is logged in

    // Push notification auto-subscribe management
    optOutOfAutoSubscribe,   // Function to opt out of auto-subscribe
    optInToAutoSubscribe,    // Function to opt in to auto-subscribe
    isAutoSubscribeEnabled,  // Function to check if auto-subscribe is enabled
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