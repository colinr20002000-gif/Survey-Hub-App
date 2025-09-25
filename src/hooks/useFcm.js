import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFCMToken, onForegroundMessage } from '../firebaseConfig';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

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

  // Load existing FCM token from database on mount and auto-subscribe if needed
  useEffect(() => {
    const loadExistingTokenAndAutoSubscribe = async () => {
      if (!user?.id || !isSupported) return;

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
          return;
        }

        if (subscriptions && subscriptions.length > 0) {
          setFcmToken(subscriptions[0].fcm_token);
          console.log('Loaded existing FCM token from database');
        } else {
          // No active subscription found - temporarily disable auto-subscription to debug error
          console.log('No active FCM subscription found (auto-subscription temporarily disabled for debugging)');
        }
      } catch (err) {
        console.error('Error in loadExistingTokenAndAutoSubscribe:', err);
      }
    };

    loadExistingTokenAndAutoSubscribe();
  }, [user?.id, isSupported]);

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

      // Step 2: Check if current user has an existing subscription for this specific device
      const { data: existingSubscription, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('id, is_active, fcm_token, device_fingerprint')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

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
   * Request notification permission and get FCM token
   */
  const requestPermission = useCallback(async () => {
    console.log('[FCM] requestPermission called');
    console.log('[FCM] User:', { id: user?.id, email: user?.email });
    console.log('[FCM] Is supported:', isSupported);

    // Test database connectivity first with simpler query
    try {
      console.log('[FCM] Testing database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('push_subscriptions')
        .select('id')
        .limit(1);

      console.log('[FCM] Database test result:', { testData, testError });

      // If we get a permissions error, the table exists but RLS is blocking
      if (testError && testError.code === '42501') {
        console.log('[FCM] RLS is blocking access - table exists but needs proper policies');
      }
    } catch (dbTestError) {
      console.error('[FCM] Database connectivity test failed:', dbTestError);
    }

    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (!user?.id) {
      setError('User must be logged in to enable notifications');
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

      // Check if user already has active FCM token
      const { data: existingTokens, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('fcm_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (checkError) {
        console.warn('Could not check existing FCM tokens:', checkError);
        // Continue anyway
      }

      let token;
      if (existingTokens && existingTokens.length > 0) {
        // User already has an active token, try to use it
        token = existingTokens[0].fcm_token;
        console.log('Using existing FCM token');

        // Verify the existing token is still valid by getting a fresh one
        try {
          const freshToken = await getFCMToken();
          if (freshToken && freshToken !== token) {
            console.log('FCM token has changed, updating...');
            token = freshToken;
          }
        } catch (tokenError) {
          console.warn('Could not refresh FCM token, using existing:', tokenError);
          // Keep using existing token
        }
      } else {
        // Get new FCM token
        token = await getFCMToken();
        if (!token) {
          setError('Failed to get FCM token - please reset browser permissions');
          setIsLoading(false);
          return false;
        }
      }

      // Clean up old inactive tokens that are older than 30 days (keep table clean)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: cleanupError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_active', false)
        .lt('created_at', thirtyDaysAgo);

      if (cleanupError) {
        console.warn('Warning: Could not clean up old inactive FCM tokens:', cleanupError);
        // Continue anyway - don't fail for cleanup issues
      }

      // Use the robust subscription management system
      try {
        console.log('[FCM] Using robust subscription management...');
        console.log('[FCM] User object:', { id: user?.id, email: user?.email, typeof_id: typeof user?.id });

        if (!user?.id || !user?.email) {
          throw new Error(`Invalid user data: id=${user?.id}, email=${user?.email}`);
        }

        const subscriptionResult = await manageFCMSubscription(user.id, user.email, token);
        console.log('[FCM] Subscription management result:', subscriptionResult);
      } catch (saveError) {
        console.error('[FCM] Error managing FCM subscription:', saveError);
        console.error('[FCM] Error details:', {
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code
        });
        setError('Failed to save notification settings - please reset browser permissions');
        setIsLoading(false);
        return false;
      }

      setFcmToken(token);
      // Store token in localStorage for logout cleanup
      localStorage.setItem('fcm_token', token);
      console.log('[FCM] FCM token saved successfully');
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Error requesting FCM permission:', err);
      setError(err.message || 'Failed to enable notifications');
      setIsLoading(false);
      return false;
    }
  }, [user?.id, isSupported]);

  /**
   * Disable notifications by deactivating the current token
   */
  const disableNotifications = useCallback(async () => {
    if (!user?.id || !fcmToken) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('fcm_token', fcmToken);

      if (error) {
        console.error('Error disabling notifications:', error);
        setError('Failed to disable notifications');
        setIsLoading(false);
        return false;
      }

      setFcmToken(null);
      // Clear token from localStorage
      localStorage.removeItem('fcm_token');
      console.log('Notifications disabled successfully');
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Error in disableNotifications:', err);
      setError(err.message || 'Failed to disable notifications');
      setIsLoading(false);
      return false;
    }
  }, [user?.id, fcmToken]);

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
      console.log('Foreground FCM message received:', payload);

      // Show a browser notification for foreground messages
      if (permission === 'granted') {
        const { notification, data } = payload;

        if (notification) {
          const notificationOptions = {
            body: notification.body,
            icon: notification.icon || '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag: 'fcm-foreground-notification',
            data: data || {},
            requireInteraction: data?.priority === 'urgent',
            silent: false,
            vibrate: [200, 100, 200]
          };

          // Show notification using service worker if available
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(notification.title, notificationOptions);
            }).catch((error) => {
              console.error('Error showing notification via service worker:', error);
              // Fallback to regular notification
              new Notification(notification.title, notificationOptions);
            });
          } else {
            new Notification(notification.title, notificationOptions);
          }
        }
      }
    });

    // Cleanup function is returned by onForegroundMessage if implemented
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, [isSupported, fcmToken, permission]);

  /**
   * Enable notifications for users who already have permissions
   * This is more lenient than requestPermission for existing subscribers
   */
  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (!user?.id) {
      setError('User must be logged in to enable notifications');
      return false;
    }

    // Check if user already has permissions and active subscription
    const currentPermission = Notification.permission;
    if (currentPermission === 'granted' && fcmToken) {
      console.log('User already has active FCM notifications');
      return true;
    }

    // If permission is denied, provide clear guidance
    if (currentPermission === 'denied') {
      setError('Notifications are blocked. Please enable them in your browser settings and try again.');
      return false;
    }

    // Otherwise, use the full permission request flow
    return await requestPermission();
  }, [isSupported, user?.id, fcmToken]);

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

    // Computed values (safe)
    ...computedValues
  };
};

export default useFcm;