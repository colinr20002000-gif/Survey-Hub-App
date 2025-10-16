import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getDepartmentColor, getAvatarText } from '../../utils/avatarColors';

// This is the main header that appears at the top of every page when logged in
// It contains the search bar, theme toggle, notifications, and user menu
// The header stays visible as users navigate between different parts of the app
const Header = ({ onMenuClick, setActiveTab }) => {
  // Get user info and logout function from authentication context
  const { user, logout } = useAuth();
  
  // Get current theme and toggle function from theme context
  const { theme, toggleTheme } = useTheme();
  
  // Get notifications and related functions from notification context
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications 
  } = useNotifications();
  
  // Keep track of whether the notifications dropdown is open
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  // Keep track of whether the user dropdown is open
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  // Keep track of logout confirmation dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Keep track of logout loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Reference to the notifications dropdown for click-outside detection
  const notificationsRef = useRef(null);
  // Reference to the user dropdown for click-outside detection
  const userDropdownRef = useRef(null);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle profile settings click
  const handleProfileSettingsClick = () => {
    setActiveTab('Settings', 'profile');
    setIsUserDropdownOpen(false);
  };

  // Handle logout button click - show confirmation
  const handleLogoutClick = () => {
    setIsUserDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  // Handle actual logout confirmation
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show error message to user
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  // Handle logout cancellation
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick} 
          className="md:hidden mr-4 text-gray-500 dark:text-gray-400"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
        
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Global Search..." 
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative"
            aria-label="Toggle notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 text-xs font-bold text-white bg-orange-500 rounded-full ring-2 ring-white dark:ring-gray-800">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    title="Clear all notifications"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <ul className="py-2 max-h-80 overflow-y-auto">
                {isLoading ? (
                  <li className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Loading notifications...
                  </li>
                ) : notifications.length === 0 ? (
                  <li className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No notifications
                  </li>
                ) : (
                  notifications.map(notification => (
                    <li 
                      key={notification.id} 
                      className={[
                        'flex',
                        'items-start',
                        'px-3',
                        'py-2',
                        'hover:bg-gray-100',
                        'dark:hover:bg-gray-700',
                        'group',
                        !notification.read ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className={[
                        'mt-1',
                        'h-2',
                        'w-2', 
                        'rounded-full',
                        'flex-shrink-0',
                        !notification.read ? 'bg-orange-500' : 'bg-transparent'
                      ].join(' ')}></div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.time}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                        title="Clear notification"
                      >
                        <X size={12} className="text-gray-500 dark:text-gray-400" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {notifications.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button 
                    onClick={markAllAsRead}
                    className="flex-1 text-center text-sm text-orange-500 hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center space-x-2"
          >
            <div className={`w-9 h-9 rounded-full ${getDepartmentColor(user?.department)} text-white flex items-center justify-center font-bold`}>
              {getAvatarText(user)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.privilege}</p>
            </div>
            <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <button
                onClick={handleProfileSettingsClick}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings size={16} className="mr-2"/>Profile Settings
              </button>
              <button
                onClick={handleLogoutClick}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut size={16} className="mr-2"/>Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
              Confirm Logout
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Are you sure you want to log out? You will need to sign in again to access your account.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging out...
                  </>
                ) : (
                  'Logout'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

Header.displayName = 'Header';

export default Header;