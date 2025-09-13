const PUBLIC_VAPID_KEY = 'BGAKVb1ZE-Byuvl_YgGxjTKWrb17qsek986xjCw0vMjhMarzGLrQNZKS1c4bULRQC8Cdr8ehF7-cyIa8Gp5ZgQU';

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
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async subscribe() {
    if (!this.registration) {
      await this.init();
    }

    await this.requestPermission();

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
      // Use your Supabase Edge Function endpoint
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const endpoint = `${supabaseUrl}/functions/v1/subscribe`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      const result = await response.json();
      console.log('Subscription sent to server:', result);
      return result;
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
}

export const notificationService = new NotificationService();