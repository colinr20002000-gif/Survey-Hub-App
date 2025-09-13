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

  // Fetch announcements with read status for current user
  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get announcements with left join to announcement_reads to check read status
      const { data: announcements, error } = await supabase
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
          announcement_reads!left (
            read_at,
            dismissed_at,
            user_id
          )
        `)
        .or(`target_roles.is.null,target_roles.cs.{${user.privilege}}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        setNotifications([]);
        return;
      }

      // Transform announcements to notification format, filtering out dismissed ones
      const formattedNotifications = announcements
        .filter(announcement => {
          const userRead = announcement.announcement_reads?.find(read => read.user_id === user.id);
          return !userRead?.dismissed_at; // Don't include dismissed notifications
        })
        .map(announcement => {
          const userRead = announcement.announcement_reads?.find(read => read.user_id === user.id);
          const timeAgo = getTimeAgo(announcement.created_at);
          
          return {
            id: announcement.id,
            type: announcement.category?.toLowerCase() || 'system',
            message: announcement.title,
            content: announcement.content,
            time: timeAgo,
            read: !!userRead?.read_at,
            priority: announcement.priority,
            created_at: announcement.created_at
          };
        });

      setNotifications(formattedNotifications);
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
      // Try to use upsert with proper conflict resolution
      const { data, error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'announcement_id,user_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Could not mark announcement as read in database:', error);
        console.error('Error details:', error.message, error.code, error.details);
        
        // Fallback: try manual check and update
        try {
          const { data: existing } = await supabase
            .from('announcement_reads')
            .select('id')
            .eq('announcement_id', notificationId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            // Record exists, update it
            const { error: updateError } = await supabase
              .from('announcement_reads')
              .update({ read_at: new Date().toISOString() })
              .eq('announcement_id', notificationId)
              .eq('user_id', user.id);
            
            if (updateError) {
              console.error('Fallback update failed:', updateError);
              return;
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
              console.error('Fallback insert failed:', insertError);
              return;
            }
          }
        } catch (fallbackError) {
          console.error('Fallback approach failed:', fallbackError);
          return;
        }
      }

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
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

      // Batch insert read records for all unread notifications
      const readRecords = unreadNotifications.map(notification => ({
        announcement_id: notification.id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('announcement_reads')
        .upsert(readRecords, {
          onConflict: 'announcement_id,user_id'
        });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state immediately
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  // Clear a notification for current user (mark as dismissed)
  const clearNotification = async (notificationId) => {
    if (!user?.id) return;
    
    try {
      // Mark as dismissed in database using upsert
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString(),
          dismissed_at: new Date().toISOString()
        }, {
          onConflict: 'announcement_id,user_id'
        });

      if (error) {
        console.error('Error dismissing notification:', error);
        return;
      }

      // Remove from local state immediately
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
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
      
      // Mark all current notifications as dismissed
      const dismissalRecords = notifications.map(notification => ({
        announcement_id: notification.id,
        user_id: user.id,
        read_at: new Date().toISOString(),
        dismissed_at: new Date().toISOString()
      }));

      if (dismissalRecords.length === 0) {
        console.log('No notifications to clear');
        return;
      }

      const { error } = await supabase
        .from('announcement_reads')
        .upsert(dismissalRecords, {
          onConflict: 'announcement_id,user_id'
        });

      if (error) {
        console.error('Error dismissing all notifications:', error);
        return;
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

  // Refresh notifications periodically (every 5 minutes)
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
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
    refreshNotifications: fetchNotifications
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