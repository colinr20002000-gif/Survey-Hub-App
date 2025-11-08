import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const NotificationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [announcementRefreshTrigger, setAnnouncementRefreshTrigger] = useState(0);

  // Fetch both announcements and task notifications for current user
  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch task/system notifications from notifications table
      const { data: taskNotifications, error: taskError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false)
        .order('created_at', { ascending: false });

      if (taskError) {
        console.error('Error fetching task notifications:', taskError);
      }

      // Get announcements with left join to announcement_reads to check read status
      const { data: announcements, error: announcementError } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          priority,
          category,
          created_at,
          expires_at,
          target_roles,
          author_id,
          announcement_reads!left (
            read_at,
            dismissed_at,
            user_id
          )
        `)
        .or(`target_roles.is.null,target_roles.cs.{${user.department || ''}}${user.privilege ? ',target_roles.cs.{' + user.privilege + '}' : ''}${user.email === 'colin.rogers@inorail.co.uk' ? ',target_roles.cs.{SuperAdmin}' : ''}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .neq('author_id', user.id)  // Exclude announcements created by current user
        .order('created_at', { ascending: false });

      if (announcementError) {
        console.error('Error fetching announcements:', announcementError);

        // Check if it's a table not found error
        if (announcementError.code === 'PGRST116' || announcementError.message?.includes('relation "announcements" does not exist')) {
          console.warn('Announcements table does not exist.');
        }
      }

      // Transform task notifications
      const formattedTaskNotifications = (taskNotifications || []).map(notification => {
        const timeAgo = getTimeAgo(notification.created_at);

        return {
          id: notification.id,
          type: notification.type,
          message: notification.title || notification.message,
          content: notification.message,
          time: timeAgo,
          read: notification.read,
          priority: 'medium',
          created_at: notification.created_at,
          data: notification.data,
          source: 'notifications' // Mark source for different handling
        };
      });

      // Transform announcements to notification format
      const formattedAnnouncements = (announcements || [])
        .filter(announcement => {
          const userRead = announcement.announcement_reads?.find(read => read.user_id === user.id);
          const isDismissed = !!userRead?.dismissed_at;
          const isRead = !!userRead?.read_at;

          // Don't include dismissed notifications OR read notifications
          return !isDismissed && !isRead;
        })
        .map(announcement => {
          const timeAgo = getTimeAgo(announcement.created_at);

          return {
            id: announcement.id,
            type: announcement.category?.toLowerCase() || 'system',
            message: announcement.title,
            content: announcement.content,
            time: timeAgo,
            read: false,
            priority: announcement.priority,
            created_at: announcement.created_at,
            source: 'announcements' // Mark source for different handling
          };
        });

      // Combine and sort all notifications by created_at
      const allNotifications = [...formattedTaskNotifications, ...formattedAnnouncements]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get time ago string
  const getTimeAgo = (dateString) => {
    try {
      // Handle different date formats and timezones
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Unknown time';
      }
      
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      
      // Debug logging (remove this once timestamps are working correctly)
      // console.log('Time calculation:', {
      //   dateString,
      //   parsedDate: date.toISOString(),
      //   now: now.toISOString(),
      //   diffInMs,
      //   diffInMinutes
      // });
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error calculating time ago:', error, 'for date:', dateString);
      return 'Unknown time';
    }
  };

  // Mark a notification as read for current user
  const markAsRead = async (notificationId) => {
    if (!user?.id) return;

    try {
      // Find the notification to determine its source
      const notification = notifications.find(n => n.id === notificationId);

      if (!notification) return;

      if (notification.source === 'notifications') {
        // Update notification in notifications table
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString()
          })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating notification read status:', updateError);
          return;
        }
      } else {
        // Handle announcement (existing logic)
        const { data: existing, error: checkError } = await supabase
          .from('announcement_reads')
          .select('id, read_at')
          .eq('announcement_id', notificationId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing read record:', checkError);
          return;
        }

        if (existing) {
          // Record exists, update it if not already marked as read
          if (!existing.read_at) {
            const { error: updateError } = await supabase
              .from('announcement_reads')
              .update({ read_at: new Date().toISOString() })
              .eq('announcement_id', notificationId)
              .eq('user_id', user.id);

            if (updateError) {
              console.error('Error updating read status:', updateError);
              return;
            }
          }
        } else {
          // Record doesn't exist, insert it
          const { error: insertError } = await supabase
            .from('announcement_reads')
            .insert({
              announcement_id: notificationId,
              user_id: user.id,
              read_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error inserting read record:', insertError);
            return;
          }
        }
      }

      // Update local state immediately for better UX
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read: true }
            : n
        )
      );

      // Trigger announcement page refresh
      setAnnouncementRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  // Mark all notifications as read for current user
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);

      if (unreadNotifications.length === 0) return;

      // Process each notification individually to avoid conflicts
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }

      // Update local state immediately
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );

      // Trigger announcement page refresh
      setAnnouncementRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  // Clear a notification for current user (mark as dismissed)
  const clearNotification = async (notificationId) => {
    if (!user?.id) return;

    try {
      // Find the notification to determine its source
      const notification = notifications.find(n => n.id === notificationId);

      if (!notification) return;

      const now = new Date().toISOString();

      if (notification.source === 'notifications') {
        // Update notification in notifications table
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            read: true,
            dismissed: true,
            read_at: now,
            dismissed_at: now
          })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating notification dismissal status:', updateError);
          return;
        }
      } else {
        // Handle announcement (existing logic)
        const { data: existing, error: checkError } = await supabase
          .from('announcement_reads')
          .select('id, dismissed_at')
          .eq('announcement_id', notificationId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing read record:', checkError);
          return;
        }

        if (existing) {
          // Record exists, update it
          const { error: updateError } = await supabase
            .from('announcement_reads')
            .update({
              read_at: now,
              dismissed_at: now
            })
            .eq('announcement_id', notificationId)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating dismissal status:', updateError);
            return;
          }
        } else {
          // Record doesn't exist, insert it
          const { error: insertError } = await supabase
            .from('announcement_reads')
            .insert({
              announcement_id: notificationId,
              user_id: user.id,
              read_at: now,
              dismissed_at: now
            });

          if (insertError) {
            console.error('Error inserting dismissal record:', insertError);
            return;
          }
        }
      }

      // Remove from local state immediately
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );

      console.log('Successfully dismissed notification:', notificationId);
    } catch (error) {
      console.error('Error in clearNotification:', error);
    }
  };

  // Clear all notifications for current user
  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      console.log('Clearing all notifications for user:', user.id);
      console.log('Notifications to clear:', notifications.map(n => ({ id: n.id, message: n.message })));

      if (notifications.length === 0) {
        console.log('No notifications to clear');
        return;
      }

      // Process each notification individually to avoid conflicts
      for (const notification of notifications) {
        await clearNotification(notification.id);
      }

      console.log('Successfully marked all notifications as dismissed');

      // Clear all from local state
      setNotifications([]);
      console.log('Cleared all notifications from local state');
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
    }
  };

  // Get count of unread notifications for current user
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Fetch notifications when user changes or component mounts
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Set up real-time subscriptions for notifications and announcements
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up real-time notification subscriptions for user:', user.id);

    // Subscribe to notifications table for the current user
    const notificationsSubscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Real-time notification change:', payload);
          // Refresh notifications when any change occurs
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notifications subscription status:', status);
      });

    // Subscribe to announcements table (for new announcements)
    const announcementsSubscription = supabase
      .channel('all-announcements')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          console.log('🔔 Real-time announcement change:', payload);
          // Refresh notifications when any change occurs
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Announcements subscription status:', status);
      });

    // Subscribe to announcement_reads table (for read/dismissed status changes)
    const announcementReadsSubscription = supabase
      .channel('user-announcement-reads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Real-time announcement read change:', payload);
          // Refresh notifications when read status changes
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Announcement reads subscription status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔔 Cleaning up notification subscriptions');
      notificationsSubscription.unsubscribe();
      announcementsSubscription.unsubscribe();
      announcementReadsSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Refresh notifications periodically (every 5 minutes) as backup
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      console.log('🔔 Periodic notification refresh (backup)');
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = {
    notifications,
    unreadCount: getUnreadCount(),
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refreshNotifications: fetchNotifications,
    announcementRefreshTrigger
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

NotificationProvider.displayName = 'NotificationProvider';