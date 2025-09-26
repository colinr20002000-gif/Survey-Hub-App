import { supabase } from '../supabaseClient';

/**
 * Send FCM push notifications via Supabase Edge Function
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} [notification.icon] - Notification icon URL
 * @param {string} [notification.badge] - Notification badge URL
 * @param {string} [notification.tag] - Notification tag for grouping
 * @param {Object} [notification.data] - Additional data to send with notification
 * @param {Object} options - Additional options
 * @param {string[]} [options.targetRoles] - Array of user roles to target
 * @param {string[]} [options.targetUserIds] - Array of specific user IDs to target
 * @param {string} [options.excludeAuthorId] - User ID to exclude from notifications (usually the author)
 * @returns {Promise<Object>} Result of the notification send operation
 */
export async function sendFCMNotification(notification, options = {}) {
  try {
    const { targetRoles, targetUserIds, excludeAuthorId } = options;

    // Get the current user's session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw sessionError;
    }

    if (!session) {
      console.warn('No active session - cannot send FCM notifications');
      return { success: false, message: 'No active session' };
    }

    // Call the new FCM Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const endpoint = `${supabaseUrl}/functions/v1/send-fcm-notification`;

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
          tag: notification.tag || `fcm-notification-${Date.now()}`,
          priority: notification.priority || 'medium',
          data: notification.data || {}
        },
        targetRoles,
        targetUserIds,
        excludeAuthorId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('FCM notification result:', result);

    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

/**
 * Send FCM notification for new announcement
 * @param {Object} announcementData - Announcement data
 * @param {string} authorId - ID of the user who created the announcement
 */
export async function sendAnnouncementFCMNotification(announcementData, authorId) {
  const priorityEmoji = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📢',
    low: 'ℹ️'
  };

  const emoji = priorityEmoji[announcementData.priority] || '📢';

  // Send FCM notification
  const fcmResult = await sendFCMNotification(
    {
      title: `${emoji} ${announcementData.title}`,
      body: announcementData.content.substring(0, 100) + (announcementData.content.length > 100 ? '...' : ''),
      tag: `announcement-${announcementData.id || Date.now()}`,
      priority: announcementData.priority,
      data: {
        type: 'announcement',
        priority: announcementData.priority,
        announcementId: announcementData.id,
        url: '/announcements',
        timestamp: new Date().toISOString()
      }
    },
    {
      targetRoles: announcementData.target_roles,
      excludeAuthorId: authorId
    }
  );

  return fcmResult;
}

/**
 * Send FCM notification for new delivery task assignment
 * @param {Object} taskData - Delivery task data
 * @param {string} authorId - ID of the user who created the task
 */
export async function sendDeliveryTaskAssignmentNotification(taskData, authorId) {
  try {
    // Get assigned user IDs from the task data
    const assignedUserIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [];

    if (assignedUserIds.length === 0) {
      console.log('No users assigned to task, skipping notification');
      return { success: true, message: 'No users assigned' };
    }

    // Get assigned user names for the notification body
    const { data: assignedUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', assignedUserIds);

    if (usersError) {
      console.error('Error fetching assigned users:', usersError);
      // Continue with notification even if we can't get names
    }

    const assignedNames = assignedUsers ? assignedUsers.map(user => user.name).join(', ') : 'team members';

    // Send FCM notification
    const fcmResult = await sendFCMNotification(
      {
        title: '📋 New Task Assigned',
        body: `"${taskData.text}" has been assigned to you`,
        tag: `delivery-task-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'delivery_task_assignment',
          taskId: taskData.id,
          taskText: taskData.text,
          project: taskData.project || 'Delivery Team',
          url: '/delivery-tasks',
          timestamp: new Date().toISOString()
        }
      },
      {
        targetUserIds: assignedUserIds,
        excludeAuthorId: authorId
      }
    );

    console.log(`Delivery task assignment notification sent to ${assignedUserIds.length} users:`, assignedNames);
    return {
      ...fcmResult,
      sent: assignedUserIds.length,
      assignedUsers: assignedNames
    };

  } catch (error) {
    console.error('Error sending delivery task assignment notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

/**
 * Send FCM notification for new project task assignment
 * @param {Object} taskData - Project task data
 * @param {string} authorId - ID of the user who created the task
 */
export async function sendProjectTaskAssignmentNotification(taskData, authorId) {
  try {
    // Debug logging
    console.log('🎯 DEBUG: Project task data received:', taskData);
    console.log('🎯 DEBUG: assignedTo field:', taskData.assignedTo);
    console.log('🎯 DEBUG: assignedTo type:', typeof taskData.assignedTo);
    console.log('🎯 DEBUG: assignedTo isArray:', Array.isArray(taskData.assignedTo));

    // Get assigned user IDs from the task data
    const assignedUserIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [];

    if (assignedUserIds.length === 0) {
      console.log('No users assigned to project task, skipping notification');
      return { success: true, message: 'No users assigned' };
    }

    // Get assigned user names for the notification body
    const { data: assignedUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', assignedUserIds);

    if (usersError) {
      console.error('Error fetching assigned users:', usersError);
      // Continue with notification even if we can't get names
    }

    const assignedNames = assignedUsers ? assignedUsers.map(user => user.name).join(', ') : 'team members';

    // Send FCM notification
    const fcmResult = await sendFCMNotification(
      {
        title: '🎯 New Project Task Assigned',
        body: `"${taskData.text}" has been assigned to you`,
        tag: `project-task-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'project_task_assignment',
          taskId: taskData.id,
          taskText: taskData.text,
          project: taskData.project || 'Project Team',
          url: '/project-tasks',
          timestamp: new Date().toISOString()
        }
      },
      {
        targetUserIds: assignedUserIds,
        excludeAuthorId: authorId
      }
    );

    console.log('🎯 DEBUG: FCM Result from sendFCMNotification:', fcmResult);
    console.log('🎯 DEBUG: FCM Results array:', fcmResult.results);
    if (fcmResult.results && fcmResult.results.length > 0) {
      fcmResult.results.forEach((result, index) => {
        console.log(`🎯 DEBUG: Result ${index}:`, result);
        if (result.status === 'failed') {
          console.log(`🎯 DEBUG: FAILURE - Token: ${result.token}, Error: ${result.error}`);
        }
      });
    }
    console.log(`Project task assignment notification sent to ${assignedUserIds.length} users:`, assignedNames);

    // Use the actual count from FCM result if available, otherwise fall back to assignedUserIds length
    const actualSentCount = fcmResult.sent || assignedUserIds.length;
    console.log('🎯 DEBUG: Actual sent count:', actualSentCount);

    return {
      ...fcmResult,
      sent: actualSentCount,
      assignedUsers: assignedNames
    };

  } catch (error) {
    console.error('Error sending project task assignment notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}