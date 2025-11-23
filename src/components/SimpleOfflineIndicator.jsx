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
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white shadow-md"
        >
          <div className="px-3 py-1.5">
            <div className="flex items-center justify-center gap-2 text-xs">
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">Offline - Viewing cached data</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleOfflineIndicator;
