import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../utils/notifications';

export const useNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkSupport = () => {
      const supported = notificationService.isSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(notificationService.getPermissionStatus());
        checkExistingSubscription();
      }
    };

    const checkExistingSubscription = async () => {
      try {
        const existingSubscription = await notificationService.getSubscription();
        setSubscription(existingSubscription);
        setIsSubscribed(!!existingSubscription);
      } catch (err) {
        console.error('Error checking existing subscription:', err);
      }
    };

    checkSupport();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
      return newPermission;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }

    setIsLoading(true);
    setError(null);

    try {
      const newSubscription = await notificationService.subscribe();
      setSubscription(newSubscription);
      setIsSubscribed(true);

      await notificationService.sendSubscriptionToServer(newSubscription);

      return newSubscription;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await notificationService.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showNotification = useCallback(async (title, options = {}) => {
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      return await notificationService.showLocalNotification(title, options);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [permission]);

  const testNotification = useCallback(async () => {
    try {
      await showNotification('Test Notification', {
        body: 'This is a test notification from Survey Hub!',
        tag: 'test-notification',
        requireInteraction: false
      });
    } catch (err) {
      console.error('Failed to show test notification:', err);
      throw err;
    }
  }, [showNotification]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    testNotification
  };
};