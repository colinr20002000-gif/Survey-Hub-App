import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOffline } from '../contexts/SimpleOfflineContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Simple Offline Indicator (Read-Only Mode)
 *
 * Shows a banner when offline with clear messaging:
 * - User can view cached data
 * - User cannot create/edit/delete
 * - Data may be outdated
 */
const SimpleOfflineIndicator = () => {
  const { isOnline } = useOffline();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-white shadow-lg rounded-full px-3 py-2 flex items-center gap-2 text-xs font-medium"
          style={{ zIndex: 9999 }}
        >
          <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Offline</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleOfflineIndicator;
