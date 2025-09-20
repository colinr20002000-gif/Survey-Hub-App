import { useState, useEffect, useCallback } from 'react';
import { getFCMToken, onForegroundMessage } from '../firebaseConfig';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing Firebase Cloud Messaging
 * Handles FCM token retrieval, storage, and foreground message listening
 */
export const useFcm = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState(Notification.permission);
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

  // Load existing FCM token from database on mount
  useEffect(() => {
    const loadExistingToken = async () => {
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
        }
      } catch (err) {
        console.error('Error in loadExistingToken:', err);
      }
    };

    loadExistingToken();
  }, [user?.id, isSupported]);

  /**
   * Request notification permission and get FCM token
   */
  const requestPermission = useCallback(async () => {
    console.log('[FCM] requestPermission called');
    console.log('[FCM] User:', { id: user?.id, email: user?.email });
    console.log('[FCM] Is supported:', isSupported);

    // Test database connectivity first
    try {
      console.log('[FCM] Testing database connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('push_subscriptions')
        .select('count(*)')
        .limit(1);
      console.log('[FCM] Database test result:', { testData, testError });
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

      let permission = currentPermission;
      if (currentPermission === 'default') {
        // Only request permission if not already decided
        permission = await Notification.requestPermission();
      }

      setPermission(permission);

      if (permission !== 'granted') {
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

      // Save token to database with multi-device support
      let saveError = null;

      // Check if this specific FCM token already exists for this user
      console.log('[FCM] Checking for existing token in database for user:', user.id);
      console.log('[FCM] Token to check:', token?.substring(0, 20) + '...');

      const { data: existingTokenRecord, error: tokenCheckError } = await supabase
        .from('push_subscriptions')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('fcm_token', token)
        .maybeSingle();

      console.log('[FCM] Existing token check result:', { existingTokenRecord, tokenCheckError });

      if (tokenCheckError && tokenCheckError.code !== 'PGRST116') {
        console.warn('Error checking existing token:', tokenCheckError);
        // Continue anyway
      }

      if (existingTokenRecord) {
        // This exact token already exists for this user, just update it
        console.log('[FCM] Updating existing FCM token record for this device');
        const { data: updateResult, error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            is_active: true,
            device_info: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              platform: navigator.platform
            }
          })
          .eq('id', existingTokenRecord.id)
          .select();

        console.log('[FCM] Update result:', { updateResult, updateError });
        saveError = updateError;
      } else {
        // This is a new token for this user (new device), insert it
        console.log('[FCM] Inserting new FCM token record for additional device');
        console.log('[FCM] Insert data:', {
          user_id: user.id,
          user_id_type: typeof user.id,
          user_id_length: user.id?.length,
          fcm_token: token?.substring(0, 20) + '...',
          fcm_token_length: token?.length,
          is_active: true
        });

        const { data: insertResult, error: insertError } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: user.id,
            fcm_token: token,
            is_active: true,
            device_info: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              platform: navigator.platform
            }
          })
          .select();

        console.log('[FCM] Insert result:', { insertResult, insertError });
        saveError = insertError;
      }

      if (saveError) {
        console.error('[FCM] Error saving FCM token:', saveError);
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
      console.log('FCM token saved successfully');
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
  const isEnabled = permission === 'granted' && !!fcmToken;

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
  }, [isSupported, user?.id, fcmToken, requestPermission]);

  /**
   * Refresh the FCM token (useful for handling token refresh)
   */
  const refreshToken = useCallback(async () => {
    if (!isSupported || !user?.id) return false;

    return await requestPermission();
  }, [requestPermission, isSupported, user?.id]);

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

    // Computed values
    canNotify: permission === 'granted' && isSupported,
    hasToken: !!fcmToken
  };
};

export default useFcm;