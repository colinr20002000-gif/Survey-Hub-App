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
    console.log('🔔 [FCM] sendFCMNotification called with:', { notification, options });

    // Get the current user's session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('🔔 [FCM] Error getting session:', sessionError);
      throw sessionError;
    }

    if (!session) {
      console.warn('🔔 [FCM] No active session - cannot send FCM notifications');
      return { success: false, message: 'No active session' };
    }

    // Call the new FCM Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const endpoint = `${supabaseUrl}/functions/v1/send-fcm-notification`;
    console.log('🔔 [FCM] Calling Edge Function:', endpoint);

    const payload = {
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
    };
    console.log('🔔 [FCM] Payload:', payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('🔔 [FCM] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔔 [FCM] Error response:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('🔔 [FCM] Success response:', result);

    // Log detailed results if available
    if (result.results && result.results.length > 0) {
      console.log('🔔 [FCM] Detailed send results:', result.results);

      // Log any failures with details
      const failures = result.results.filter(r => r.status === 'failed');
      if (failures.length > 0) {
        console.error('❌ [FCM] Failed sends:', failures);
        failures.forEach(failure => {
          console.error(`  - Token: ${failure.token?.substring(0, 30)}...`);
          console.error(`  - Error: ${failure.error}`);
        });
      }

      // Log successes
      const successes = result.results.filter(r => r.status === 'success');
      if (successes.length > 0) {
        console.log('✅ [FCM] Successful sends:', successes.length);
      }
    }

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
  console.log('📢 [FCM-ANNOUNCEMENT] sendAnnouncementFCMNotification called');
  console.log('📢 [FCM-ANNOUNCEMENT] announcementData:', announcementData);
  console.log('📢 [FCM-ANNOUNCEMENT] target_roles:', announcementData.target_roles);
  console.log('📢 [FCM-ANNOUNCEMENT] target_roles type:', typeof announcementData.target_roles);
  console.log('📢 [FCM-ANNOUNCEMENT] target_roles isArray:', Array.isArray(announcementData.target_roles));
  console.log('📢 [FCM-ANNOUNCEMENT] authorId:', authorId);

  const priorityEmoji = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📢',
    low: 'ℹ️'
  };

  const emoji = priorityEmoji[announcementData.priority] || '📢';

  const options = {
    targetRoles: announcementData.target_roles,
    excludeAuthorId: authorId
  };

  console.log('📢 [FCM-ANNOUNCEMENT] Calling sendFCMNotification with options:', options);

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
    options
  );

  console.log('📢 [FCM-ANNOUNCEMENT] FCM result:', fcmResult);

  return fcmResult;
}

/**
 * Send FCM notification for new delivery task assignment
 * @param {Object} taskData - Delivery task data
 * @param {string} authorId - ID of the user who created the task
 */
export async function sendDeliveryTaskAssignmentNotification(taskData, authorId) {
  try {
    console.log('🔔 [DELIVERY] sendDeliveryTaskAssignmentNotification called with:', { taskData, authorId });

    // Get assigned user IDs from the task data
    const assignedUserIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [];
    console.log('🔔 [DELIVERY] Extracted assignedUserIds:', assignedUserIds);

    if (assignedUserIds.length === 0) {
      console.log('🔔 [DELIVERY] No users assigned to task, skipping notification');
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
    console.log('🔔 [DELIVERY] Assigned users:', assignedNames);

    // Send FCM notification
    console.log('🔔 [DELIVERY] Calling sendFCMNotification...');
    const fcmResult = await sendFCMNotification(
      {
        title: '📋 New Task Assigned',
        body: `"${taskData.text}" has been assigned to you`,
        tag: `delivery-task-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'delivery_task_assignment',
          taskId: String(taskData.id),
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

    console.log('🔔 [DELIVERY] sendFCMNotification result:', fcmResult);
    console.log(`🔔 [DELIVERY] Notification sent to ${assignedUserIds.length} users:`, assignedNames);
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
    console.log('🔔 [PROJECT] sendProjectTaskAssignmentNotification called with:', { taskData, authorId });

    // Get assigned user IDs from the task data
    const assignedUserIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [];
    console.log('🔔 [PROJECT] Extracted assignedUserIds:', assignedUserIds);

    if (assignedUserIds.length === 0) {
      console.log('🔔 [PROJECT] No users assigned to project task, skipping notification');
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
    console.log('🔔 [PROJECT] Assigned users:', assignedNames);

    // Send FCM notification
    console.log('🔔 [PROJECT] Calling sendFCMNotification...');
    const fcmResult = await sendFCMNotification(
      {
        title: '🎯 New Project Task Assigned',
        body: `"${taskData.text}" has been assigned to you`,
        tag: `project-task-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'project_task_assignment',
          taskId: String(taskData.id),
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

    console.log('🔔 [PROJECT] sendFCMNotification result:', fcmResult);
    console.log(`🔔 [PROJECT] Notification sent to ${assignedUserIds.length} users:`, assignedNames);
    return {
      ...fcmResult,
      sent: fcmResult.sent || assignedUserIds.length,
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

/**
 * Send FCM notification when a delivery task is completed
 * @param {Object} taskData - Delivery task data
 * @param {string} creatorId - ID of the user who created the task
 * @param {string} completedByName - Name of the user who completed the task
 */
export async function sendDeliveryTaskCompletionNotification(taskData, creatorId, completedByName) {
  try {
    console.log('🔔 [DELIVERY-COMPLETE] sendDeliveryTaskCompletionNotification called with:', { taskData, creatorId, completedByName });

    if (!creatorId) {
      console.log('🔔 [DELIVERY-COMPLETE] No creator ID, skipping notification');
      return { success: true, message: 'No creator' };
    }

    // Send FCM notification to the task creator
    console.log('🔔 [DELIVERY-COMPLETE] Calling sendFCMNotification...');
    const fcmResult = await sendFCMNotification(
      {
        title: '✅ Task Completed',
        body: `"${taskData.text}" has been marked as complete by ${completedByName}`,
        tag: `delivery-task-complete-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'delivery_task_completed',
          taskId: String(taskData.id),
          taskText: taskData.text,
          project: taskData.project || 'Delivery Team',
          completedBy: completedByName,
          url: '/delivery-tasks',
          timestamp: new Date().toISOString()
        }
      },
      {
        targetUserIds: [creatorId]
      }
    );

    console.log('🔔 [DELIVERY-COMPLETE] sendFCMNotification result:', fcmResult);
    return {
      ...fcmResult,
      sent: 1
    };

  } catch (error) {
    console.error('Error sending delivery task completion notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

/**
 * Send FCM notification when a project task is completed
 * @param {Object} taskData - Project task data
 * @param {string} creatorId - ID of the user who created the task
 * @param {string} completedByName - Name of the user who completed the task
 */
export async function sendProjectTaskCompletionNotification(taskData, creatorId, completedByName) {
  try {
    console.log('🔔 [PROJECT-COMPLETE] sendProjectTaskCompletionNotification called with:', { taskData, creatorId, completedByName });

    if (!creatorId) {
      console.log('🔔 [PROJECT-COMPLETE] No creator ID, skipping notification');
      return { success: true, message: 'No creator' };
    }

    // Send FCM notification to the task creator
    console.log('🔔 [PROJECT-COMPLETE] Calling sendFCMNotification...');
    const fcmResult = await sendFCMNotification(
      {
        title: '✅ Project Task Completed',
        body: `"${taskData.text}" has been marked as complete by ${completedByName}`,
        tag: `project-task-complete-${taskData.id || Date.now()}`,
        priority: 'medium',
        data: {
          type: 'project_task_completed',
          taskId: String(taskData.id),
          taskText: taskData.text,
          project: taskData.project || 'Project Team',
          completedBy: completedByName,
          url: '/project-tasks',
          timestamp: new Date().toISOString()
        }
      },
      {
        targetUserIds: [creatorId]
      }
    );

    console.log('🔔 [PROJECT-COMPLETE] sendFCMNotification result:', fcmResult);
    return {
      ...fcmResult,
      sent: 1
    };

  } catch (error) {
    console.error('Error sending project task completion notification:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}