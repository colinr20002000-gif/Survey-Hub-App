import { supabase } from '../supabaseClient';

/**
 * Real-time notification system using Supabase real-time subscriptions
 * This listens for new announcements and shows push notifications to all users
 */
export class RealTimeNotificationManager {
  constructor() {
    this.subscription = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing real-time notification system...');

      // Check if notifications are supported and granted
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push notifications not supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Subscribe to real-time changes in announcements table
      this.subscription = supabase
        .channel('announcements-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements'
          },
          (payload) => {
            console.log('📢 New announcement detected:', payload);
            this.handleNewAnnouncement(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
        });

      this.isInitialized = true;
      console.log('✅ Real-time notification system initialized');
    } catch (error) {
      console.error('❌ Error initializing real-time notifications:', error);
    }
  }

  async handleNewAnnouncement(announcement) {
    try {
      // Get current user to avoid self-notifications
      const { data: { user } } = await supabase.auth.getUser();

      // Don't show notification if current user is the author
      if (user && user.id === announcement.author_id) {
        console.log('Skipping self-notification for announcement author');
        return;
      }

      console.log('📬 Showing push notification for announcement:', announcement.title);

      // Create notification data
      const priorityEmoji = {
        urgent: '🚨',
        high: '⚠️',
        medium: '📢',
        low: 'ℹ️'
      };

      const emoji = priorityEmoji[announcement.priority] || '📢';

      const notificationData = {
        title: `${emoji} ${announcement.title}`,
        body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: `announcement-${announcement.id}`,
        data: {
          type: 'announcement',
          priority: announcement.priority,
          announcementId: announcement.id,
          url: '/announcements'
        },
        requireInteraction: announcement.priority === 'urgent',
        silent: false,
        vibrate: [200, 100, 200]
      };

      // Show notification through service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notificationData.title, notificationData);
        console.log('✅ Push notification displayed');
      } else {
        // Fallback to browser notification
        new Notification(notificationData.title, notificationData);
        console.log('✅ Browser notification displayed');
      }

    } catch (error) {
      console.error('❌ Error handling new announcement notification:', error);
    }
  }

  cleanup() {
    if (this.subscription) {
      console.log('🧹 Cleaning up real-time notification subscription');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
export const notificationManager = new RealTimeNotificationManager();