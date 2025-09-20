import { supabase } from '../supabaseClient';

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export class NotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser');
    }

    if (!('PushManager' in window)) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    return permission;
  }

  urlBase64ToUint8Array(base64String) {
    if (!base64String) {
      throw new Error('VAPID key is empty or undefined');
    }

    // Clean the string - remove any whitespace or newlines
    base64String = base64String.trim();

    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    try {
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('Error decoding VAPID key:', error);
      console.error('Original key:', base64String);
      console.error('Processed key:', base64);
      throw new Error('Invalid VAPID key format: ' + error.message);
    }
  }

  async subscribe() {
    if (!this.registration) {
      await this.init();
    }

    await this.requestPermission();

    if (!PUBLIC_VAPID_KEY) {
        console.error('VITE_VAPID_PUBLIC_KEY is not set. Cannot subscribe.');
        throw new Error('VAPID public key is not configured.');
    }

    const applicationServerKey = this.urlBase64ToUint8Array(PUBLIC_VAPID_KEY);

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('Push subscription:', this.subscription);
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        console.log('Successfully unsubscribed from push notifications');
        return true;
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
        throw error;
      }
    }
    return false;
  }

  async getSubscription() {
    if (!this.registration) {
      await this.init();
    }

    this.subscription = await this.registration.pushManager.getSubscription();
    return this.subscription;
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated to send subscription');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const endpoint = `${supabaseUrl}/functions/v1/subscribe`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send subscription to server: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Subscription sent to server:', result);

      // Return enhanced result with subscription status info
      return {
        ...result,
        isNewSubscription: !result.alreadySubscribed,
        status: result.alreadySubscribed ? 'already_subscribed' : 'newly_subscribed'
      };
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  async showLocalNotification(title, options = {}) {
    await this.requestPermission();

    const notificationOptions = {
      body: options.body || 'Default notification body',
      icon: options.icon || '/android-chrome-192x192.png',
      badge: options.badge || '/favicon-32x32.png',
      tag: options.tag || 'local-notification',
      requireInteraction: options.requireInteraction || false,
      actions: options.actions || [],
      data: options.data || {},
      vibrate: options.vibrate || [200, 100, 200],
      ...options
    };

    if (this.registration) {
      return this.registration.showNotification(title, notificationOptions);
    } else {
      return new Notification(title, notificationOptions);
    }
  }

  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  getPermissionStatus() {
    return Notification.permission;
  }

  /**
   * Re-enable notifications by checking permissions without re-subscribing
   * This handles cases where permission was reset but subscription still exists
   */
  async reEnableNotifications() {
    try {
      // Check current permission status first
      const currentPermission = Notification.permission;

      if (currentPermission === 'denied') {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      // Check if we already have a valid subscription
      const existingSubscription = await this.getSubscription();

      if (!existingSubscription) {
        // No subscription exists, need to subscribe first
        console.log('No existing subscription found, creating new one...');
        return await this.subscribe();
      }

      // For existing subscriptions, just check/request permission
      let permission = currentPermission;
      if (currentPermission === 'default') {
        permission = await this.requestPermission();
      }

      if (permission === 'granted') {
        // Permission granted and subscription exists - we're good to go
        console.log('Notifications re-enabled successfully with existing subscription');
        return {
          subscription: existingSubscription,
          status: 'permissions_restored',
          message: 'Notifications have been re-enabled on this device.',
          isExistingSubscription: true
        };
      } else {
        throw new Error('Permission not granted');
      }
    } catch (error) {
      console.error('Error re-enabling notifications:', error);
      throw error;
    }
  }

  /**
   * Check if user can receive notifications (has permission and valid subscription)
   */
  async canReceiveNotifications() {
    try {
      const permission = this.getPermissionStatus();
      const subscription = await this.getSubscription();

      return {
        hasPermission: permission === 'granted',
        hasSubscription: !!subscription,
        canReceive: permission === 'granted' && !!subscription
      };
    } catch (error) {
      console.error('Error checking notification capability:', error);
      return {
        hasPermission: false,
        hasSubscription: false,
        canReceive: false
      };
    }
  }

  /**
   * Clean up old/duplicate subscriptions for the current user
   * This is useful for maintaining database hygiene
   */
  async cleanupOldSubscriptions() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.warn('Cannot cleanup subscriptions: User not authenticated');
        return { success: false, message: 'User not authenticated' };
      }

      // Get current valid subscription endpoint
      const currentSubscription = await this.getSubscription();
      if (!currentSubscription) {
        console.log('No current subscription to compare against');
        return { success: true, message: 'No current subscription found' };
      }

      const currentEndpoint = currentSubscription.endpoint;

      // Find all subscriptions for this user with different endpoints
      const { data: oldSubscriptions, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id, subscription_object')
        .eq('user_id', session.user.id)
        .neq('subscription_object->>endpoint', currentEndpoint);

      if (fetchError) {
        console.error('Error fetching old subscriptions:', fetchError);
        return { success: false, error: fetchError.message };
      }

      if (!oldSubscriptions || oldSubscriptions.length === 0) {
        console.log('No old subscriptions to clean up');
        return { success: true, message: 'No old subscriptions found' };
      }

      // Delete old subscriptions
      const oldSubIds = oldSubscriptions.map(sub => sub.id);
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .in('id', oldSubIds);

      if (deleteError) {
        console.error('Error deleting old subscriptions:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`Successfully cleaned up ${oldSubscriptions.length} old subscription(s)`);
      return {
        success: true,
        message: `Cleaned up ${oldSubscriptions.length} old subscription(s)`,
        cleaned: oldSubscriptions.length
      };

    } catch (error) {
      console.error('Error in cleanupOldSubscriptions:', error);
      return { success: false, error: error.message };
    }
  }
}

export const notificationService = new NotificationService();
