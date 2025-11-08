import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFCMToken, onForegroundMessage } from '../firebaseConfig';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useRefreshOnLogin } from './useRefreshOnLogin';

/**
 * Custom hook for managing Firebase Cloud Messaging
 * Handles FCM token retrieval, storage, and foreground message listening
 */
export const useFcm = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState(() => {
    try {
      return typeof Notification !== 'undefined' ? Notification.permission : 'default';
    } catch (e) {
      return 'default';
    }
  });
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Check if FCM is supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator &&
                       'PushManager' in window &&
                       'Notification' in window;
      setIsSupported(supported);
      return supported;
    };

    checkSupport();
  }, []);

  // Function to refresh FCM token from database
  const refreshFcmTokenFromDatabase = useCallback(async () => {
    console.log('[FCM] Refreshing FCM token from database');

    if (!user?.id || !isSupported) {
      // Clear token when no user or not supported
      setFcmToken(null);
      localStorage.removeItem('fcm_token');
      console.log('[FCM] Cleared FCM token - no user or not supported');
      return;
    }

    try {
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('fcm_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading existing FCM token:', error);
        // Clear token on error
        setFcmToken(null);
        localStorage.removeItem('fcm_token');
        return;
      }

      if (subscriptions && subscriptions.length > 0 && subscriptions[0].fcm_token !== 'pending') {
        // Only use valid FCM tokens (not placeholder values)
        const dbToken = subscriptions[0].fcm_token;
        setFcmToken(dbToken);
        localStorage.setItem('fcm_token', dbToken);
        console.log('[FCM] Loaded existing FCM token from database');
      } else {
        console.log('[FCM] No active FCM subscription found - clearing local state');
        // Clear local state if no valid subscription exists
        setFcmToken(null);
        localStorage.removeItem('fcm_token');
      }
    } catch (err) {
      console.error('Error in refreshFcmTokenFromDatabase:', err);
      // Clear token on error
      setFcmToken(null);
      localStorage.removeItem('fcm_token');
    }
  }, [user?.id, isSupported]);

  // Use refresh on login hook to ensure data is always fresh
  useRefreshOnLogin(refreshFcmTokenFromDatabase);

  // Initial load on mount
  useEffect(() => {
    refreshFcmTokenFromDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Generate a device fingerprint for this browser/device
   */
  const generateDeviceFingerprint = useCallback(() => {
    // Enhanced canvas fingerprinting for more unique rendering
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    // Create more complex canvas rendering for better uniqueness
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test', 2, 2);
    ctx.font = '12px serif';
    ctx.fillText('123456789', 2, 20);

    // Add some shapes to increase uniqueness
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(100, 5, 20, 20);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.fillRect(120, 10, 15, 15);

    // Collect comprehensive device characteristics
    const getWebGLFingerprint = () => {
      try {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';

        return [
          gl.getParameter(gl.RENDERER),
          gl.getParameter(gl.VENDOR),
          gl.getParameter(gl.VERSION),
          gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        ].join('|');
      } catch {
        return 'webgl-error';
      }
    };

    const getAudioFingerprint = () => {
      try {
        if (!window.AudioContext && !window.webkitAudioContext) return 'no-audio';
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const analyser = audioCtx.createAnalyser();
        const gain = audioCtx.createGain();

        oscillator.connect(analyser);
        analyser.connect(gain);
        gain.connect(audioCtx.destination);

        const fingerprint = [
          audioCtx.sampleRate,
          audioCtx.state,
          analyser.frequencyBinCount,
          gain.gain.value
        ].join('|');

        audioCtx.close();
        return fingerprint;
      } catch {
        return 'audio-error';
      }
    };

    // Generate a persistent browser-specific ID
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
      navigator.languages ? navigator.languages.join(',') : '',
      navigator.platform,
      navigator.hardwareConcurrency || 'unknown',
      screen.width + 'x' + screen.height,
      screen.availWidth + 'x' + screen.availHeight,
      screen.colorDepth,
      screen.pixelDepth,
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.cookieEnabled,
      navigator.doNotTrack || 'unknown',
      navigator.maxTouchPoints || 0,
      canvas.toDataURL(),
      getWebGLFingerprint(),
      getAudioFingerprint(),
      getBrowserId(), // This ensures uniqueness per browser installation
      window.devicePixelRatio || 1,
      window.screen.orientation ? window.screen.orientation.type : 'unknown'
    ].join('|');

    // Create a more robust hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return 'device_' + Math.abs(hash).toString(36);
  }, []);

  /**
   * Manage FCM subscription for the current user and device using database function
   */
  const manageFCMSubscription = useCallback(async (userId, userEmail, fcmToken) => {
    console.log('[FCM] Managing subscription for user:', userId);

    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('[FCM] Invalid user ID format:', userId, 'Expected UUID format');
      throw new Error(`Invalid user ID format: "${userId}". Expected UUID format.`);
    }

    const deviceFingerprint = generateDeviceFingerprint();
    console.log('[FCM] Device fingerprint:', deviceFingerprint);

    const deviceInfo = {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timezone: new Date().getTimezoneOffset()
    };

    try {
      // Use the database function for atomic subscription management
      console.log('[FCM] Using database function for subscription management...');
      const functionParams = {
        p_user_id: userId,
        p_user_email: userEmail,
        p_fcm_token: fcmToken,
        p_device_fingerprint: deviceFingerprint,
        p_device_info: deviceInfo
      };

      console.log('[FCM] Function parameters:', functionParams);
      console.log('[FCM] Parameter types:', {
        userId_type: typeof userId,
        userEmail_type: typeof userEmail,
        fcmToken_type: typeof fcmToken,
        deviceFingerprint_type: typeof deviceFingerprint,
        deviceInfo_type: typeof deviceInfo
      });

      const { data: result, error } = await supabase
        .rpc('manage_user_push_subscription', functionParams);

      if (error) {
        // Handle duplicate FCM token gracefully (409 conflict or code 23505)
        if ((error.code === '23505' || error.code === 'P0001' || error.status === 409) &&
            (error.message?.includes('fcm_token') || error.message?.includes('duplicate key'))) {
          console.log('[FCM] FCM token already exists - using fallback to update existing subscription');
          // Fall through to manual management to update the existing subscription
          return await manageFCMSubscriptionManual(userId, userEmail, fcmToken, deviceFingerprint, deviceInfo);
        }
        throw error;
      }

      if (result && result.length > 0) {
        // Handle both old and new column names for compatibility
        const resultData = result[0];
        const id = resultData.subscription_id || resultData.id;
        const action = resultData.action_taken || resultData.action;

        console.log(`[FCM] Subscription ${action} successfully:`, id);
        return { id, action };
      } else {
        throw new Error('No result returned from subscription management function');
      }
    } catch (error) {
      console.error('[FCM] Database function failed, falling back to manual management:', error);

      // Fallback to manual management if database function fails
      return await manageFCMSubscriptionManual(userId, userEmail, fcmToken, deviceFingerprint, deviceInfo);
    }
  }, [generateDeviceFingerprint]);

  /**
   * Manual fallback for FCM subscription management
   */
  const manageFCMSubscriptionManual = useCallback(async (userId, userEmail, fcmToken, deviceFingerprint, deviceInfo) => {
    console.log('[FCM] Using manual subscription management fallback...');

    try {
      // Step 1: Deactivate any existing subscriptions for this device from other users
      await supabase
        .from('push_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('device_fingerprint', deviceFingerprint)
        .neq('user_id', userId);

      // Step 2: Check if current user has an existing subscription by device fingerprint OR fcm_token
      const { data: existingByDevice, error: checkError1 } = await supabase
        .from('push_subscriptions')
        .select('id, is_active, fcm_token, device_fingerprint')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError1 && checkError1.code !== 'PGRST116') {
        throw checkError1;
      }

      // Also check by FCM token (in case device fingerprint changed)
      const { data: existingByToken, error: checkError2 } = await supabase
        .from('push_subscriptions')
        .select('id, is_active, fcm_token, device_fingerprint')
        .eq('user_id', userId)
        .eq('fcm_token', fcmToken)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError2 && checkError2.code !== 'PGRST116') {
        throw checkError2;
      }

      // Use whichever record we found (prefer device match, fallback to token match)
      const existingSubscription = existingByDevice || existingByToken;

      if (existingSubscription) {
        // Update existing subscription
        const { data: updateResult, error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            fcm_token: fcmToken,
            user_email: userEmail,
            is_active: true,
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)
          .select();

        if (updateError) {
          throw updateError;
        }

        console.log('[FCM] Successfully updated existing subscription');
        return { id: updateResult[0].id, action: 'updated' };
      } else {
        // Create new subscription
        const { data: insertResult, error: insertError } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            user_email: userEmail,
            fcm_token: fcmToken,
            is_active: true,
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo,
            last_used_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          // Handle duplicate key error gracefully
          if (insertError.code === '23505' && insertError.message?.includes('fcm_token')) {
            console.log('[FCM] Duplicate FCM token on insert - this token is already in use');
            console.log('[FCM] This could mean the token belongs to another user or session');

            // Try one more time to find and update the subscription by token only
            const { data: existingByTokenOnly, error: finalCheckError } = await supabase
              .from('push_subscriptions')
              .select('id, user_id')
              .eq('fcm_token', fcmToken)
              .limit(1)
              .maybeSingle();

            if (existingByTokenOnly) {
              // If it belongs to the same user, update it
              if (existingByTokenOnly.user_id === userId) {
                const { data: finalUpdateResult, error: finalUpdateError } = await supabase
                  .from('push_subscriptions')
                  .update({
                    device_fingerprint: deviceFingerprint,
                    device_info: deviceInfo,
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingByTokenOnly.id)
                  .select();

                if (finalUpdateError) {
                  throw finalUpdateError;
                }

                console.log('[FCM] Successfully updated existing subscription after duplicate error');
                return { id: finalUpdateResult[0].id, action: 'updated' };
              } else {
                // Token belongs to different user - deactivate it and retry insert
                console.log('[FCM] Token belongs to different user - deactivating and retrying');
                await supabase
                  .from('push_subscriptions')
                  .update({ is_active: false })
                  .eq('fcm_token', fcmToken);

                // Retry insert
                const { data: retryInsertResult, error: retryInsertError } = await supabase
                  .from('push_subscriptions')
                  .insert({
                    user_id: userId,
                    user_email: userEmail,
                    fcm_token: fcmToken,
                    is_active: true,
                    device_fingerprint: deviceFingerprint,
                    device_info: deviceInfo,
                    last_used_at: new Date().toISOString()
                  })
                  .select();

                if (retryInsertError) {
                  throw retryInsertError;
                }

                console.log('[FCM] Successfully created new subscription after deactivating old one');
                return { id: retryInsertResult[0].id, action: 'created' };
              }
            }
          }
          throw insertError;
        }

        console.log('[FCM] Successfully created new subscription');
        return { id: insertResult[0].id, action: 'created' };
      }
    } catch (error) {
      console.error('[FCM] Manual subscription management failed:', error);
      throw error;
    }
  }, []);

  /**
   * Request notification permission and get FCM token (device-level only)
   * This only handles browser permissions and FCM token - not database subscriptions
   */
  const requestPermission = useCallback(async () => {
    console.log('[FCM] requestPermission called - device permissions only');
    console.log('[FCM] Is supported:', isSupported);

    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check current permission status first
      const currentPermission = Notification.permission;

      let newPermission = currentPermission;
      if (currentPermission === 'default') {
        // Only request permission if not already decided
        newPermission = await Notification.requestPermission();
      }

      setPermission(newPermission);

      if (newPermission !== 'granted') {
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Get FCM token
      let token;
      try {
        token = await getFCMToken();
        if (!token) {
          setError('Failed to get FCM token - please reset browser permissions');
          setIsLoading(false);
          return false;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        setError('Failed to get FCM token');
        setIsLoading(false);
        return false;
      }

      setFcmToken(token);
      // Store token in localStorage for logout cleanup
      localStorage.setItem('fcm_token', token);
      console.log('[FCM] Device permissions granted and FCM token obtained');
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Error requesting device permissions:', err);
      setError(err.message || 'Failed to get device permissions');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  /**
   * Disable device-level notifications (clear FCM token only)
   * This does not affect database subscriptions
   */
  const disableNotifications = useCallback(async () => {
    if (!fcmToken) return false;

    setIsLoading(true);
    setError(null);

    try {
      setFcmToken(null);
      // Clear token from localStorage
      localStorage.removeItem('fcm_token');
      console.log('Device-level notifications disabled successfully');
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Error in disableNotifications:', err);
      setError(err.message || 'Failed to disable device notifications');
      setIsLoading(false);
      return false;
    }
  }, [fcmToken]);

  /**
   * Check if notifications are currently enabled
   */
  const isEnabled = useMemo(() => {
    return permission === 'granted' && !!fcmToken;
  }, [permission, fcmToken]);

  /**
   * Set up foreground message listener
   */
  useEffect(() => {
    if (!isSupported || !fcmToken) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('🔔 [FCM] Foreground FCM message received:', payload);
      console.log('🔔 [FCM] Payload structure:', JSON.stringify(payload, null, 2));

      // Show a browser notification for foreground messages
      if (permission === 'granted') {
        const { notification, data } = payload;

        // Handle both notification and data-only payloads
        const notificationTitle = notification?.title || data?.title || 'Survey Hub Notification';
        const notificationBody = notification?.body || data?.body || 'You have a new notification';

        if (notificationTitle && notificationBody) {
          const notificationOptions = {
            body: notificationBody,
            icon: notification?.icon || data?.icon || '/android-chrome-192x192.png',
            badge: notification?.badge || data?.badge || '/favicon-32x32.png',
            tag: data?.tag || 'fcm-foreground-notification',
            data: {
              url: data?.url || '/',
              type: data?.type || 'general',
              priority: data?.priority || 'medium',
              timestamp: Date.now(),
              ...data
            },
            requireInteraction: data?.priority === 'urgent',
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
              {
                action: 'view',
                title: 'View'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          };

          console.log('🔔 [FCM] Showing foreground notification:', notificationTitle, notificationOptions);

          // Show notification using service worker if available
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(notificationTitle, notificationOptions);
            }).catch((error) => {
              console.error('❌ [FCM] Error showing notification via service worker:', error);
              // Fallback to regular notification
              new Notification(notificationTitle, notificationOptions);
            });
          } else {
            new Notification(notificationTitle, notificationOptions);
          }
        } else {
          console.log('🔔 [FCM] No title or body found in payload, skipping notification');
        }
      } else {
        console.log('🔔 [FCM] Notification permission not granted, cannot show foreground notification');
      }
    });

    // Cleanup function is returned by onForegroundMessage if implemented
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, [isSupported, fcmToken, permission]);

  /**
   * Enable device-level notifications (get FCM token if permission already granted)
   * This is more lenient than requestPermission for users with existing permissions
   */
  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    // Check if user already has permissions and active token
    const currentPermission = Notification.permission;
    if (currentPermission === 'granted' && fcmToken) {
      console.log('User already has device-level FCM notifications');
      return true;
    }

    // If permission is denied, provide clear guidance
    if (currentPermission === 'denied') {
      setError('Notifications are blocked. Please enable them in your browser settings and try again.');
      return false;
    }

    // Otherwise, use the permission request flow
    return await requestPermission();
  }, [isSupported, fcmToken, requestPermission]);

  /**
   * Refresh the FCM token (useful for handling token refresh)
   */
  const refreshToken = useCallback(async () => {
    if (!isSupported || !user?.id) return false;

    return await requestPermission();
  }, [isSupported, user?.id]);

  /**
   * Allow users to opt out of automatic subscription on login
   */
  const optOutOfAutoSubscribe = useCallback(() => {
    localStorage.setItem('fcm_auto_subscribe_opted_out', 'true');
    console.log('User opted out of automatic FCM subscription');
  }, []);

  /**
   * Allow users to opt back in to automatic subscription on login
   */
  const optInToAutoSubscribe = useCallback(() => {
    localStorage.removeItem('fcm_auto_subscribe_opted_out');
    console.log('User opted in to automatic FCM subscription');
  }, []);

  // Create safe computed values to prevent temporal dead zone issues
  const computedValues = useMemo(() => ({
    canNotify: permission === 'granted' && isSupported,
    hasToken: !!fcmToken
  }), [permission, isSupported, fcmToken]);

  return {
    // State
    fcmToken,
    permission,
    isSupported,
    isLoading,
    error,
    isEnabled,

    // Actions
    requestPermission,
    enableNotifications,
    disableNotifications,
    refreshToken,
    optOutOfAutoSubscribe,
    optInToAutoSubscribe,
    refreshFcmTokenFromDatabase,

    // Computed values (safe)
    ...computedValues
  };
};

export default useFcm;