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

      // Continue initialization even if permission isn't granted yet
      // We can request permission when needed
      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted - will request when needed');
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
            console.log('🚨 REAL-TIME EVENT TRIGGERED! New announcement detected:', payload);
            console.log('📋 Announcement data:', payload.new);
            this.handleNewAnnouncement(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to announcements real-time updates');
          } else if (status === 'CLOSED') {
            console.log('❌ Real-time subscription closed');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error');
          }
        });

      this.isInitialized = true;
      console.log('✅ Real-time notification system initialized');
    } catch (error) {
      console.error('❌ Error initializing real-time notifications:', error);
    }
  }

  async handleNewAnnouncement(announcement) {
    try {
      console.log('🎯 handleNewAnnouncement called with:', announcement);

      // Get current user to avoid self-notifications
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id, 'Announcement author:', announcement.author_id);

      // Don't show notification if current user is the author
      if (user && user.id === announcement.author_id) {
        console.log('❌ Skipping self-notification for announcement author');
        return;
      }

      console.log('✅ Proceeding with push notification for announcement:', announcement.title);
      console.log('🔔 Notification permission status:', Notification.permission);

      // Request permission if not already granted
      if (Notification.permission === 'default') {
        console.log('🔔 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ Notification permission denied, skipping notification');
          return;
        }
      } else if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted, skipping notification');
        return;
      }

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
      console.log('🚀 About to show notification:', notificationData);

      if ('serviceWorker' in navigator) {
        console.log('📱 Using service worker for notification');
        const registration = await navigator.serviceWorker.ready;
        console.log('📡 Service worker registration:', registration);

        await registration.showNotification(notificationData.title, notificationData);
        console.log('✅ Service worker notification displayed successfully');
      } else {
        console.log('🌐 Using browser notification fallback');
        const notification = new Notification(notificationData.title, notificationData);
        console.log('✅ Browser notification created:', notification);
      }

    } catch (error) {
      console.error('❌ Error handling new announcement notification:', error);
    }
  }

  // Test function to manually trigger a notification
  async testNotification() {
    console.log('🧪 Testing manual notification...');
    const testAnnouncement = {
      id: 'test-123',
      title: 'Test Notification',
      content: 'This is a test notification to verify the system is working',
      priority: 'medium',
      author_id: 'test-author'
    };

    await this.handleNewAnnouncement(testAnnouncement);
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

// Add global test function for debugging
if (typeof window !== 'undefined') {
  window.testNotification = () => {
    console.log('🧪 Manual notification test triggered from console');
    notificationManager.testNotification();
  };
}