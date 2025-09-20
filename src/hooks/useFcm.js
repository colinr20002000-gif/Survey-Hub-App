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
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Get FCM token
      const token = await getFCMToken();
      if (!token) {
        setError('Failed to get FCM token');
        setIsLoading(false);
        return false;
      }

      // First, clean up old inactive tokens for this user (keep table clean)
      const { error: cleanupError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_active', false);

      if (cleanupError) {
        console.warn('Warning: Could not clean up old inactive FCM tokens:', cleanupError);
        // Continue anyway - don't fail for cleanup issues
      }

      // Save token to database
      const { error: saveError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          is_active: true,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            platform: navigator.platform
          }
        }, {
          onConflict: 'user_id,fcm_token'
        });

      if (saveError) {
        console.error('Error saving FCM token:', saveError);
        setError('Failed to save notification settings');
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
    disableNotifications,
    refreshToken,

    // Computed values
    canNotify: permission === 'granted' && isSupported,
    hasToken: !!fcmToken
  };
};

export default useFcm;