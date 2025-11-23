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
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">You're viewing cached data (offline mode)</p>
                  <p className="text-xs text-yellow-100">
                    Connect to internet to create or edit content
                  </p>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 hover:bg-yellow-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                title="Refresh to check connection"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleOfflineIndicator;
