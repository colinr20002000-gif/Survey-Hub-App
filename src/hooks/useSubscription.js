import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useRefreshOnLogin } from './useRefreshOnLogin';

/**
 * Custom hook for managing push notification subscriptions (database operations)
 * This is separate from device permissions and FCM tokens
 */
export const useSubscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Generate device fingerprint (similar to useFcm but simplified)
  const generateDeviceFingerprint = useCallback(() => {
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
  }, []);

  // Check if user has an active subscription for this device
  const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setIsSubscribed(false);
      return false;
    }

    try {
      setError(null);
      const deviceFingerprint = generateDeviceFingerprint();

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Error checking subscription status:', error);
        setError(error.message);
        return false;
      }

      const hasActiveSubscription = subscriptions && subscriptions.length > 0;
      setIsSubscribed(hasActiveSubscription);
      return hasActiveSubscription;

    } catch (err) {
      console.error('Error in checkSubscriptionStatus:', err);
      setError(err.message);
      setIsSubscribed(false);
      return false;
    }
  }, [user?.id, generateDeviceFingerprint]);

  // Add a manual refresh function that can be called externally
  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('[Subscription] Manual refresh requested');
    if (user?.id) {
      return await checkSubscriptionStatus();
    } else {
      // Clear subscription state when no user
      setIsSubscribed(false);
      setError(null);
      return false;
    }
  }, [checkSubscriptionStatus, user?.id]);

  // Use refresh on login hook to ensure data is always fresh
  useRefreshOnLogin(refreshSubscriptionStatus);

  // Initial load on mount
  useEffect(() => {
    refreshSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Enable subscription (activate existing or create new)
  const enableSubscription = useCallback(async () => {
    if (!user?.id) {
      setError('User must be logged in to manage subscriptions');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deviceFingerprint = generateDeviceFingerprint();

      // Check if user already has a subscription for this device
      const { data: existingSubscriptions, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('id, is_active, fcm_token')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existingSubscriptions && existingSubscriptions.length > 0) {
        // Reactivate existing subscription
        const { error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            is_active: true,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscriptions[0].id);

        if (updateError) {
          throw updateError;
        }

        console.log('Subscription reactivated for user:', user.email);
      } else {
        // Create new subscription (without FCM token - will be added by device permissions)
        const deviceInfo = {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          platform: navigator.platform,
          language: navigator.language,
          screen: `${screen.width}x${screen.height}`,
          timezone: new Date().getTimezoneOffset(),
          subscriptionOnly: true // Flag to indicate this is subscription-only
        };

        const { error: insertError } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: user.id,
            user_email: user.email,
            fcm_token: 'pending', // Placeholder - will be updated when device permissions are granted
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo,
            is_active: true,
            last_used_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }

        console.log('New subscription created for user:', user.email);
      }

      setIsSubscribed(true);
      setIsLoading(false);

      // Refresh subscription status to ensure consistency
      setTimeout(() => checkSubscriptionStatus(), 500);

      return true;

    } catch (err) {
      console.error('Error enabling subscription:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [user?.id, user?.email, generateDeviceFingerprint]);

  // Disable subscription (deactivate)
  const disableSubscription = useCallback(async () => {
    if (!user?.id) {
      setError('User must be logged in to manage subscriptions');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deviceFingerprint = generateDeviceFingerprint();

      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) {
        throw error;
      }

      console.log('Subscription disabled for user:', user?.email);
      setIsSubscribed(false);
      setIsLoading(false);

      // Refresh subscription status to ensure consistency
      setTimeout(() => checkSubscriptionStatus(), 500);

      return true;

    } catch (err) {
      console.error('Error disabling subscription:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [user?.id, user?.email, generateDeviceFingerprint]);

  // Toggle subscription status
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return await disableSubscription();
    } else {
      return await enableSubscription();
    }
  }, [isSubscribed, enableSubscription, disableSubscription]);

  return {
    // State
    isSubscribed,
    isLoading,
    error,

    // Actions
    enableSubscription,
    disableSubscription,
    toggleSubscription,
    checkSubscriptionStatus,
    refreshSubscriptionStatus
  };
};

export default useSubscription;