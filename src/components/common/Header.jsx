import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  Bell, 
  ChevronDown, 
  LogOut, 
  Moon, 
  Search, 
  Settings, 
  Sun 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MOCK_NOTIFICATIONS } from '../../constants';

// This is the main header that appears at the top of every page when logged in
// It contains the search bar, theme toggle, notifications, and user menu
// The header stays visible as users navigate between different parts of the app
const Header = ({ onMenuClick, setActiveTab }) => {
  // Get user info and logout function from authentication context
  const { user, logout } = useAuth();
  
  // Get current theme and toggle function from theme context
  const { theme, toggleTheme } = useTheme();
  
  // Keep track of whether the notifications dropdown is open
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Reference to the notifications dropdown for click-outside detection
  const notificationsRef = useRef(null);

  // Handle click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-800"></span>
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
              </div>
              <ul className="py-2 max-h-80 overflow-y-auto">
                {MOCK_NOTIFICATIONS.map(notification => (
                  <li 
                    key={notification.id} 
                    className={[
                      'flex',
                      'items-start',
                      'px-3',
                      'py-2',
                      'hover:bg-gray-100',
                      'dark:hover:bg-gray-700',
                      !notification.read ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                    ].filter(Boolean).join(' ')}
                  >
                    <div className={[
                      'mt-1',
                      'h-2',
                      'w-2', 
                      'rounded-full',
                      !notification.read ? 'bg-orange-500' : 'bg-transparent'
                    ].join(' ')}></div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {notification.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full text-center text-sm text-orange-500 hover:underline">
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative group">
          <button className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold">
              {user?.avatar}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.privilege}</p>
            </div>
            <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
            <button 
              onClick={() => setActiveTab('Settings')} 
              className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings size={16} className="mr-2"/>Profile Settings
            </button>
            <button 
              onClick={logout} 
              className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut size={16} className="mr-2"/>Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

Header.displayName = 'Header';

export default Header;