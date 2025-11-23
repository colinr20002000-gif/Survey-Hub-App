import React, { createContext, useContext, useState, useEffect } from 'prop-types';
import PropTypes from 'prop-types';
import {
  initOfflineDB,
  cacheProjects,
  getCachedProjects,
  cacheJobs,
  getCachedJobs,
  cacheTasks,
  getCachedTasks,
  queuePendingAction,
  getPendingActions,
  removePendingAction
} from '../utils/offlineStorage';

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
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize offline database on mount
  useEffect(() => {
    initOfflineDB()
      .then(() => {
        console.log('✅ Offline database initialized');
        // Load pending actions
        loadPendingActions();
      })
      .catch((error) => {
        console.error('❌ Failed to initialize offline database:', error);
      });
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Connection restored - going online');
      setIsOnline(true);
      // Sync pending actions when back online
      syncPendingActions();
    };

    const handleOffline = () => {
      console.log('⚠️ Connection lost - going offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for background sync messages from service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          console.log('📡 Background sync triggered by service worker');
          syncPendingActions();
        }
      });
    }
  }, []);

  /**
   * Load pending actions from IndexedDB
   */
  const loadPendingActions = async () => {
    try {
      const actions = await getPendingActions();
      setPendingActions(actions);
      console.log(`📥 Loaded ${actions.length} pending actions`);
    } catch (error) {
      console.error('❌ Failed to load pending actions:', error);
    }
  };

  /**
   * Sync pending actions when back online
   */
  const syncPendingActions = async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    try {
      setIsSyncing(true);
      const actions = await getPendingActions();

      if (actions.length === 0) {
        console.log('✅ No pending actions to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Syncing ${actions.length} pending actions...`);

      for (const action of actions) {
        try {
          // Execute the action based on type
          await executePendingAction(action);

          // Remove from pending queue after successful sync
          await removePendingAction(action.id);
          console.log(`✅ Synced action: ${action.type}`);
        } catch (error) {
          console.error(`❌ Failed to sync action ${action.type}:`, error);
          // Keep in queue to retry later
        }
      }

      // Reload pending actions after sync
      await loadPendingActions();
      setIsSyncing(false);

      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      setIsSyncing(false);
    }
  };

  /**
   * Execute a pending action
   */
  const executePendingAction = async (action) => {
    // This function should call the appropriate API based on action type
    // You'll need to inject your API functions here
    const { type, payload } = action;

    switch (type) {
      case 'CREATE_PROJECT':
        // Call your project creation API
        console.log('Creating project:', payload);
        // await supabase.from('projects').insert(payload);
        break;

      case 'UPDATE_PROJECT':
        // Call your project update API
        console.log('Updating project:', payload);
        // await supabase.from('projects').update(payload).eq('id', payload.id);
        break;

      case 'DELETE_PROJECT':
        // Call your project delete API
        console.log('Deleting project:', payload);
        // await supabase.from('projects').delete().eq('id', payload.id);
        break;

      case 'CREATE_JOB':
        console.log('Creating job:', payload);
        break;

      case 'UPDATE_JOB':
        console.log('Updating job:', payload);
        break;

      case 'DELETE_JOB':
        console.log('Deleting job:', payload);
        break;

      case 'CREATE_TASK':
        console.log('Creating task:', payload);
        break;

      case 'UPDATE_TASK':
        console.log('Updating task:', payload);
        break;

      case 'DELETE_TASK':
        console.log('Deleting task:', payload);
        break;

      default:
        console.warn(`Unknown action type: ${type}`);
    }
  };

  /**
   * Queue an action when offline
   */
  const queueAction = async (type, payload) => {
    const action = {
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    };

    await queuePendingAction(action);
    await loadPendingActions();

    console.log(`📥 Action queued: ${type}`);
  };

  /**
   * Cache data for offline access
   */
  const cacheData = async (type, data) => {
    try {
      switch (type) {
        case 'projects':
          await cacheProjects(data);
          console.log(`✅ Cached ${data.length} projects for offline access`);
          break;
        case 'jobs':
          await cacheJobs(data);
          console.log(`✅ Cached ${data.length} jobs for offline access`);
          break;
        case 'tasks':
          await cacheTasks(data);
          console.log(`✅ Cached ${data.length} tasks for offline access`);
          break;
        default:
          console.warn(`Unknown cache type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to cache ${type}:`, error);
    }
  };

  /**
   * Get cached data when offline
   */
  const getCachedData = async (type) => {
    try {
      switch (type) {
        case 'projects':
          return await getCachedProjects();
        case 'jobs':
          return await getCachedJobs();
        case 'tasks':
          return await getCachedTasks();
        default:
          console.warn(`Unknown cache type: ${type}`);
          return [];
      }
    } catch (error) {
      console.error(`Failed to get cached ${type}:`, error);
      return [];
    }
  };

  const value = {
    isOnline,
    pendingActions,
    isSyncing,
    queueAction,
    syncPendingActions,
    cacheData,
    getCachedData
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

OfflineProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default OfflineProvider;
