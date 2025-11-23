import React from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the app is offline
 * Shows pending actions count and sync status
 */
const OfflineIndicator = () => {
  const { isOnline, pendingActions, isSyncing, syncPendingActions } = useOffline();

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
                  <p className="font-semibold text-sm">You are offline</p>
                  <p className="text-xs text-yellow-100">
                    Changes will be saved locally and synced when you're back online
                  </p>
                </div>
              </div>

              {pendingActions.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-600 rounded-lg px-3 py-1.5">
                  <CloudOff className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {pendingActions.length} pending {pendingActions.length === 1 ? 'change' : 'changes'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && isSyncing && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Syncing changes...</p>
                <p className="text-xs text-blue-100">
                  Uploading {pendingActions.length} pending {pendingActions.length === 1 ? 'change' : 'changes'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && !isSyncing && pendingActions.length > 0 && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Back online</p>
                  <p className="text-xs text-green-100">
                    {pendingActions.length} pending {pendingActions.length === 1 ? 'change' : 'changes'} ready to sync
                  </p>
                </div>
              </div>

              <button
                onClick={() => syncPendingActions()}
                className="bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
