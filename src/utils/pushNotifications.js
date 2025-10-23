import { supabase } from '../supabaseClient';

/**
 * Send push notifications to all subscribed users via Supabase Edge Function
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} [notification.icon] - Notification icon URL
 * @param {string} [notification.badge] - Notification badge URL
 * @param {string} [notification.tag] - Notification tag for grouping
 * @param {Object} [notification.data] - Additional data to send with notification
 * @param {Object} options - Additional options
 * @param {string[]} [options.targetRoles] - Array of user roles to target
 * @param {string} [options.excludeAuthorId] - User ID to exclude from notifications (usually the author)
 * @returns {Promise<Object>} Result of the notification send operation
 */
export async function sendServerPushNotification(notification, options = {}) {
  try {
    const { targetRoles, excludeAuthorId } = options;

    // Get the current user's session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw sessionError;
    }

    if (!session) {
      console.warn('No active session - cannot send push notifications');
      return { success: false, message: 'No active session' };
    }

    // Call the Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const endpoint = `${supabaseUrl}/functions/v1/send-notification`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/android-chrome-192x192.png',
          badge: notification.badge || '/favicon-32x32.png',
          tag: notification.tag || `notification-${Date.now()}`,
          data: notification.data || {}
        },
        targetRoles,
        excludeAuthorId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Push notification result:', result);

    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('Error sending server push notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

/**
 * Send push notification for new announcement
 * @param {Object} announcementData - Announcement data
 * @param {string} authorId - ID of the user who created the announcement
 */
export async function sendAnnouncementNotification(announcementData, authorId) {
  const priorityEmoji = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📢',
    low: 'ℹ️'
  };

  const emoji = priorityEmoji[announcementData.priority] || '📢';

  // First, call the server function to get subscriber count
  const serverResult = await sendServerPushNotification(
    {
      title: `${emoji} ${announcementData.title}`,
      body: announcementData.content.substring(0, 100) + (announcementData.content.length > 100 ? '...' : ''),
      tag: `announcement-${Date.now()}`,
      data: {
        type: 'announcement',
        priority: announcementData.priority,
        announcementId: announcementData.id,
        url: '/announcements'
      }
    },
    {
      targetRoles: announcementData.target_roles,
      excludeAuthorId: authorId
    }
  );

  // Now, trigger actual push notifications through the service worker
  if (serverResult.success && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Send a message to the service worker to display notifications
      const notificationData = {
        title: `${emoji} ${announcementData.title}`,
        body: announcementData.content.substring(0, 100) + (announcementData.content.length > 100 ? '...' : ''),
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: `announcement-${Date.now()}`,
        data: {
          type: 'announcement',
          priority: announcementData.priority,
          announcementId: announcementData.id,
          url: '/announcements'
        },
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      };

      // Show notification through service worker
      await registration.showNotification(notificationData.title, notificationData);

      console.log('Local notification triggered via service worker');
    } catch (error) {
      console.error('Error triggering service worker notification:', error);
    }
  }

  return serverResult;
}