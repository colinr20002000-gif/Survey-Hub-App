import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';
import { getMessaging, deleteToken } from 'firebase/messaging';
import firebaseApp from '../firebaseConfig';
import { getFCMToken } from '../firebaseConfig';

// Helper function to create audit log entries for authentication events
const createAuditLog = async (user, action, details) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user: user.name || user.email,
        action: action,
        details: details,
        category: 'Authentication'
      }]);

    if (error) {
      console.error('Failed to create audit log:', error.message);
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

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

      // Try to fetch user data without timeout first (fast path)
      let queryAttempt = 0;
      let userArray = null;
      let fetchError = null;

      // First attempt: no timeout, just try to fetch quickly
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .is('deleted_at', null); // Only allow non-deleted users to login

        userArray = data;
        fetchError = error;
      } catch (error) {
        console.error('🔐 Quick fetch failed:', error);
        fetchError = error;
      }

      console.log('🔐 User query result:', { userArray, fetchError });

      const existingUser = userArray && userArray.length > 0 ? userArray[0] : null;

      if (existingUser && !fetchError) {
        // User exists in our users table and is not deleted, return combined data
        return {
          ...existingUser,
          email: authUser.email, // Always use auth email as source of truth
          last_sign_in_at: authUser.last_sign_in_at,
          auth_user: authUser
        };
      }

      // Check if user was found but is deleted
      if (!existingUser && !fetchError) {
        const { data: allUserData } = await supabase
          .from('users')
          .select('id, deleted_at')
          .eq('id', authUser.id)
          .maybeSingle();

        if (allUserData && allUserData.deleted_at !== null) {
          // User is soft-deleted, prevent login
          console.warn('🔐 User account has been deactivated:', authUser.email);
          throw new Error('Your account has been deactivated. Please contact an administrator.');
        }
      }
      
      // Only proceed with creation if error is "not found" (PGRST116)
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Database error - creating temporary user to prevent logout:', fetchError);
        // Return temporary user data to keep user logged in
        const email = authUser.email;
        const name = authUser.user_metadata?.name ||
                     authUser.user_metadata?.full_name ||
                     email.split('@')[0].replace(/[._]/g, ' ');

        return {
          id: authUser.id,
          email: email,
          name: name,
          privilege: 'Viewer',
          last_sign_in_at: authUser.last_sign_in_at,
          auth_user: authUser,
          _isTemporary: true
        };
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

      // Re-throw deactivation errors so they can be handled by the caller
      if (err.message && err.message.includes('deactivated')) {
        throw err;
      }

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

      // Note: We still need to register the Firebase service worker and get a token
      // even if a subscription exists in the database, because:
      // 1. The service worker might not be registered in the browser
      // 2. The FCM token might have changed
      // 3. Browser might have been cleared/reset

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

    // Get initial session - no timeout, let Supabase handle it
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('🔐 Initial session check:', { session: !!session, error });

      if (error) {
        console.error('🔐 Session error:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if this is a password recovery session
      // Check both the hash AND sessionStorage (set in main.jsx before Supabase processes hash)
      const hash = window.location.hash;
      const isRecoveryFromStorage = sessionStorage.getItem('isPasswordRecovery') === 'true';
      const isRecoveryFromHash = hash && (hash.includes('type=recovery') || hash.includes('type%3Drecovery'));
      const isRecoverySession = isRecoveryFromStorage || isRecoveryFromHash;

      if (isRecoverySession) {
        console.log('🔐 Recovery session detected - NOT logging in user automatically');
        console.log('🔐 Hash:', hash);
        console.log('🔐 Storage flag:', isRecoveryFromStorage);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log('🔐 Found existing session for:', session.user.email);

        // Check if backup code was just verified
        const backupCodeVerified = sessionStorage.getItem('backupCodeVerified') === 'true';

        // If backup code was used, skip MFA checks and allow login
        if (backupCodeVerified) {
          console.log('🔐 Backup code verification detected - skipping AAL check and allowing login');
          sessionStorage.removeItem('backupCodeVerified');
          // Continue to user data fetch below
        } else {
          // Normal MFA check for TOTP
          try {
            // Add timeout to prevent hanging
            const mfaCheckPromise = (async () => {
              const { data: { currentLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
              const { data: factors } = await supabase.auth.mfa.listFactors();
              const hasMFA = factors?.totp && factors.totp.length > 0;
              return { currentLevel, hasMFA };
            })();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('MFA check timeout')), 5000)
            );

            const { currentLevel, hasMFA } = await Promise.race([mfaCheckPromise, timeoutPromise]);

            console.log('🔐 Initial MFA check:', { currentLevel, hasMFA });

            // If user has MFA enabled but hasn't completed verification (AAL1), don't log them in
            if (hasMFA && currentLevel !== 'aal2') {
              console.log('🔐 MFA required but not verified - staying on login page');
              setUser(null);
              setIsLoading(false);
              return;
            }

            console.log('🔐 Initial MFA check passed - proceeding with login');
          } catch (mfaError) {
            console.warn('🔐 Initial MFA check failed:', mfaError);
            // Continue with login if MFA check fails
          }
        }

        // Quick check: verify user still exists in Supabase Auth and is not deleted
        // Add timeout to prevent hanging on mobile/slow connections
        try {
          // First, verify the user actually exists in Supabase Auth
          console.log('🔐 Verifying auth user exists (initial session)...');
          const authUserCheckPromise = supabase.auth.getUser();
          const authTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth user check timeout')), 3000)
          );

          const { data: authData, error: authError } = await Promise.race([
            authUserCheckPromise,
            authTimeoutPromise
          ]);

          // If the auth user doesn't exist or there's an auth error, sign them out
          if (authError || !authData?.user) {
            console.error('🚫 Auth user does not exist or error occurred (initial session):', authError);
            setUser(null);
            setIsLoading(false);
            setPushSubscriptionAttempted(false);

            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Sign out error:', signOutError);
            }

            alert('Your account no longer exists. Please contact an administrator if you believe this is an error.');
            return;
          }

          console.log('✅ Auth user exists (initial session), checking deletion status...');

          // Now check if user is soft-deleted in users table
          const deletionCheckPromise = supabase
            .from('users')
            .select('id, deleted_at')
            .eq('id', session.user.id)
            .maybeSingle();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Deletion check timeout')), 3000)
          );

          const { data: quickCheck, error: checkError } = await Promise.race([
            deletionCheckPromise,
            timeoutPromise
          ]);

          if (checkError) {
            console.warn('🔐 Could not check deletion status:', checkError.message);
            // Continue with login if check fails - will be caught by background fetch
          } else if (quickCheck && quickCheck.deleted_at !== null) {
            console.error('🚫 User account is deactivated, preventing login');
            // Clear user state immediately
            setUser(null);
            setIsLoading(false);
            setPushSubscriptionAttempted(false);

            // Sign out and show alert
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Sign out error:', signOutError);
            }

            alert('Your account has been deactivated. Please contact an administrator.');
            return;
          }
        } catch (err) {
          console.warn('🔐 Deletion check failed:', err.message);
          // Continue with login if check fails - will be caught by background fetch
        }

        // INSTANT LOGIN: Set user immediately with session data (only if not deleted)
        const email = session.user.email;
        const name = session.user.user_metadata?.name ||
                     session.user.user_metadata?.full_name ||
                     email.split('@')[0].replace(/[._]/g, ' ');

        setUser({
          id: session.user.id,
          email: email,
          name: name,
          privilege: 'Viewer', // Temporary - will be updated when DB loads
          last_sign_in_at: session.user.last_sign_in_at,
          auth_user: session.user,
          _isTemporary: true
        });

        // Stop loading immediately - user can now use the app
        setIsLoading(false);

        // Fetch full user data in background (non-blocking)
        fetchUserData(session.user).then(userData => {
          if (userData && !userData._isTemporary) {
            console.log('✅ Full user data loaded in background');
            setUser(userData);
            autoSubscribePushNotifications(userData);

            // Clear backup code flag now that user is fully logged in
            if (sessionStorage.getItem('backupCodeVerified') === 'true') {
              console.log('🔐 Clearing backup code verification flag after successful login (initial session)');
              sessionStorage.removeItem('backupCodeVerified');
            }

            // DISABLED: Too many log entries on every page refresh
            // createAuditLog(
            //   userData,
            //   'User Accessed Site',
            //   `${userData.name || userData.email} accessed the system with existing session`
            // );
          } else {
            console.log('⚠️ Using temporary user data');
          }
        }).catch(err => {
          console.error('🔐 Background user data fetch failed:', err);

          // If user account is deactivated, log them out immediately
          if (err.message && err.message.includes('deactivated')) {
            console.error('🚫 Logging out deactivated user from session check');
            setUser(null);
            setIsLoading(false);
            supabase.auth.signOut().then(() => {
              alert(err.message);
            });
          }
        });
      } else {
        console.log('🔐 No existing session found');
        setUser(null);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error('🔐 Critical error in getSession:', err);
      // Don't set user to null on error - keep them logged in if session exists
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session: !!session });

      // Check if this is a password recovery session
      // Check both the hash AND sessionStorage (set in main.jsx before Supabase processes hash)
      const hash = window.location.hash;
      const isRecoveryFromStorage = sessionStorage.getItem('isPasswordRecovery') === 'true';
      const isRecoveryFromHash = hash && (hash.includes('type=recovery') || hash.includes('type%3Drecovery'));
      const isRecoverySession = isRecoveryFromStorage || isRecoveryFromHash;

      if (isRecoverySession) {
        console.log('🔐 Recovery session in auth change - NOT logging in user');
        console.log('🔐 Event:', event);
        console.log('🔐 Hash:', hash);
        console.log('🔐 Storage flag:', isRecoveryFromStorage);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // If user is already logged in with full data and this is just an MFA enrollment event,
      // skip the entire reload process to prevent pages from getting stuck
      if (event === 'MFA_CHALLENGE_VERIFIED' && user && !user._isTemporary) {
        console.log('🔐 MFA enrollment completed for already-logged-in user - skipping reload');
        return;
      }

      if (session?.user) {
        console.log('Auth change - loading user data for:', session.user.email);
        console.log('🔐 Event type:', event);

        // Check MFA status before allowing login
        // Skip this check if event is MFA_CHALLENGE_VERIFIED because that event proves MFA was just verified
        if (event !== 'MFA_CHALLENGE_VERIFIED') {
          console.log('🔐 Starting MFA check...');

          // Check if backup code was just verified
          const backupCodeVerified = sessionStorage.getItem('backupCodeVerified') === 'true';

          // If backup code was used, skip MFA checks and allow login
          if (backupCodeVerified) {
            console.log('🔐 Backup code verification detected - skipping AAL check and allowing login');
            // Don't remove the flag yet - it needs to persist across SIGNED_IN and INITIAL_SESSION events
            // Continue to user data fetch below
          } else {
            // Normal MFA check for TOTP
            try {
              console.log('🔐 Getting AAL level...');

              // Add timeout to prevent hanging
              const mfaCheckPromise = (async () => {
                const { data: { currentLevel, nextLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                console.log('🔐 Getting MFA factors...');
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const hasMFA = factors?.totp && factors.totp.length > 0;
                return { currentLevel, nextLevel, hasMFA };
              })();

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MFA check timeout')), 5000)
              );

              const { currentLevel, nextLevel, hasMFA } = await Promise.race([mfaCheckPromise, timeoutPromise]);

              console.log('🔐 MFA check:', { currentLevel, nextLevel, hasMFA });

              // If user has MFA enabled but hasn't completed verification (AAL1), don't log them in
              if (hasMFA && currentLevel !== 'aal2') {
                console.log('🔐 MFA required but not verified - staying on login page');
                setUser(null);
                setIsLoading(false);
                return;
              }

              console.log('🔐 MFA check passed - proceeding with login');
            } catch (mfaError) {
              console.warn('🔐 MFA check failed:', mfaError);
              // Continue with login if MFA check fails
            }
          }
        } else {
          console.log('🔐 MFA_CHALLENGE_VERIFIED event - skipping AAL check, MFA already verified');
        }

        // Quick check: verify user still exists in Supabase Auth and is not deleted
        // Add timeout to prevent hanging on mobile/slow connections
        try {
          // First, verify the user actually exists in Supabase Auth
          console.log('🔐 Verifying auth user exists...');
          const authUserCheckPromise = supabase.auth.getUser();
          const authTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth user check timeout')), 3000)
          );

          const { data: authData, error: authError } = await Promise.race([
            authUserCheckPromise,
            authTimeoutPromise
          ]);

          // If the auth user doesn't exist or there's an auth error, sign them out
          if (authError || !authData?.user) {
            console.error('🚫 Auth user does not exist or error occurred:', authError);
            setUser(null);
            setIsLoading(false);
            setPushSubscriptionAttempted(false);

            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Sign out error:', signOutError);
            }

            alert('Your account no longer exists. Please contact an administrator if you believe this is an error.');
            return;
          }

          console.log('✅ Auth user exists, checking deletion status...');

          // Now check if user is soft-deleted in users table
          const deletionCheckPromise = supabase
            .from('users')
            .select('id, deleted_at')
            .eq('id', session.user.id)
            .maybeSingle();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Deletion check timeout')), 3000)
          );

          const { data: quickCheck, error: checkError } = await Promise.race([
            deletionCheckPromise,
            timeoutPromise
          ]);

          if (checkError) {
            console.warn('🔐 Could not check deletion status:', checkError.message);
            // Continue with login if check fails - will be caught by background fetch
          } else if (quickCheck && quickCheck.deleted_at !== null) {
            console.error('🚫 User account is deactivated, preventing login');
            // Clear user state immediately
            setUser(null);
            setIsLoading(false);
            setPushSubscriptionAttempted(false);

            // Sign out and show alert
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Sign out error:', signOutError);
            }

            alert('Your account has been deactivated. Please contact an administrator.');
            return;
          }
        } catch (err) {
          console.warn('🔐 Deletion check failed:', err.message);
          // Continue with login if check fails - will be caught by background fetch
        }

        // INSTANT LOGIN: Set user immediately with session data (only if not deleted)
        const email = session.user.email;
        const name = session.user.user_metadata?.name ||
                     session.user.user_metadata?.full_name ||
                     email.split('@')[0].replace(/[._]/g, ' ');

        setUser({
          id: session.user.id,
          email: email,
          name: name,
          privilege: 'Viewer', // Temporary - will be updated when DB loads
          last_sign_in_at: session.user.last_sign_in_at,
          auth_user: session.user,
          _isTemporary: true
        });

        // Stop loading immediately
        setIsLoading(false);

        // Fetch full user data in background (non-blocking)
        fetchUserData(session.user).then(userData => {
          if (userData && !userData._isTemporary) {
            console.log('✅ Full user data loaded in background');
            setUser(userData);
            autoSubscribePushNotifications(userData);

            // Clear backup code flag now that user is fully logged in
            if (sessionStorage.getItem('backupCodeVerified') === 'true') {
              console.log('🔐 Clearing backup code verification flag after successful login');
              sessionStorage.removeItem('backupCodeVerified');
            }

            // Only log actual sign-ins, not page refreshes/session restorations
            if (event === 'SIGNED_IN') {
              createAuditLog(
                userData,
                'User Logged In',
                `${userData.name || userData.email} logged into the system`
              );
            }
          }
        }).catch(err => {
          console.error('🔐 Background user data fetch failed:', err);

          // If user account is deactivated, log them out immediately
          if (err.message && err.message.includes('deactivated')) {
            console.error('🚫 Logging out deactivated user immediately');
            setUser(null);
            setIsLoading(false);
            supabase.auth.signOut().then(() => {
              alert(err.message);
            });
          }
        });
      } else {
        console.log('Auth change - no session');
        setUser(null);
        setPushSubscriptionAttempted(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Background retry mechanism for temporary user data
  useEffect(() => {
    if (!user?._isTemporary) return;

    console.log('🔄 User has temporary data - setting up background retry...');

    const retryFetchUserData = async () => {
      if (!user?.auth_user) return;

      console.log('🔄 Attempting to fetch full user data in background...');
      try {
        const fullUserData = await fetchUserData(user.auth_user);
        if (fullUserData && !fullUserData._isTemporary) {
          console.log('✅ Successfully fetched full user data in background');
          setUser(fullUserData);
          autoSubscribePushNotifications(fullUserData);

          // Clear backup code flag now that user is fully logged in
          if (sessionStorage.getItem('backupCodeVerified') === 'true') {
            console.log('🔐 Clearing backup code verification flag after successful login (retry path)');
            sessionStorage.removeItem('backupCodeVerified');
          }
        }
      } catch (err) {
        console.error('🔄 Background retry failed:', err);

        // If user account is deactivated, log them out immediately
        if (err.message && err.message.includes('deactivated')) {
          console.error('🚫 Logging out deactivated user from retry');
          setUser(null);
          setIsLoading(false);
          supabase.auth.signOut().then(() => {
            alert(err.message);
          });
        }
      }
    };

    // Retry after 2 seconds, then every 10 seconds (max 5 retries)
    const initialTimeout = setTimeout(retryFetchUserData, 2000);
    let retryCount = 0;
    const maxRetries = 5;

    const intervalId = setInterval(() => {
      if (retryCount < maxRetries) {
        retryFetchUserData();
        retryCount++;
      }
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [user?._isTemporary, user?.auth_user]);

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

    // IMPORTANT: Do NOT deactivate FCM subscriptions on logout!
    // Push notifications should continue working even when users are logged out.
    // Subscriptions are automatically managed by:
    // 1. manage_user_push_subscription() when a different user logs in on same device
    // 2. Edge function cleanup when FCM tokens become invalid
    // 3. Auto-cleanup of inactive subscriptions older than 7 days

    console.log('ℹ️ Keeping FCM subscription active for push notifications after logout');

    // Note: We do NOT delete the Firebase token anymore, as it should persist
    // across logout/login to maintain push notification capability

    // Create audit log for logout BEFORE clearing user
    if (user && !user._isTemporary) {
      await createAuditLog(
        user,
        'User Logged Out',
        `${user.name || user.email} logged out of the system`
      );
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