import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Simple Offline Context (Read-Only Mode)
 *
 * Provides online/offline state to the app.
 * No sync logic, no pending actions - just connection status.
 */

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('⚠️ Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline }}>
      {children}
    </OfflineContext.Provider>
  );
};

OfflineProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default OfflineProvider;
