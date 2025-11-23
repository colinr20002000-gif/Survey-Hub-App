/**
 * Offline Storage Manager using IndexedDB
 *
 * This provides offline data persistence for:
 * - Projects (read-only cache)
 * - Pending actions (create, update, delete operations when offline)
 * - User preferences
 */

const DB_NAME = 'SurveyHubOfflineDB';
const DB_VERSION = 1;

// IndexedDB store names
const STORES = {
  PROJECTS: 'projects',
  JOBS: 'jobs',
  TASKS: 'tasks',
  PENDING_ACTIONS: 'pending_actions',
  USER_PREFERENCES: 'user_preferences',
  CACHED_DATA: 'cached_data'
};

/**
 * Initialize the IndexedDB database
 */
export const initOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Failed to open offline database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('✅ Offline database opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('🔄 Upgrading offline database schema...');
      const db = event.target.result;

      // Projects store (cached for offline viewing)
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectsStore.createIndex('project_number', 'project_number', { unique: false });
        projectsStore.createIndex('client', 'client', { unique: false });
        projectsStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Jobs store (cached for offline viewing)
      if (!db.objectStoreNames.contains(STORES.JOBS)) {
        const jobsStore = db.createObjectStore(STORES.JOBS, { keyPath: 'id' });
        jobsStore.createIndex('status', 'status', { unique: false });
        jobsStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Tasks store (cached for offline viewing)
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const tasksStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        tasksStore.createIndex('assigned_to', 'assigned_to', { unique: false });
        tasksStore.createIndex('status', 'status', { unique: false });
      }

      // Pending actions store (for syncing when back online)
      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('type', 'type', { unique: false });
      }

      // User preferences (theme, settings, etc.)
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
        db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      }

      // Generic cached data store
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cachedStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
        cachedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      console.log('✅ Offline database schema upgraded');
    };
  });
};

/**
 * Get a database connection
 */
const getDB = async () => {
  try {
    return await initOfflineDB();
  } catch (error) {
    console.error('Failed to get DB connection:', error);
    throw error;
  }
};

/**
 * Save data to a specific store
 */
export const saveToOfflineStore = async (storeName, data) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Support both single items and arrays
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      await store.put(item);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Saved ${items.length} item(s) to ${storeName}`);
        resolve();
      };
      transaction.onerror = () => {
        console.error(`❌ Failed to save to ${storeName}:`, transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`Error saving to ${storeName}:`, error);
    throw error;
  }
};

/**
 * Get all data from a store
 */
export const getAllFromOfflineStore = async (storeName) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        console.error(`❌ Failed to get from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error getting from ${storeName}:`, error);
    return [];
  }
};

/**
 * Get a single item from a store
 */
export const getFromOfflineStore = async (storeName, key) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error getting item from ${storeName}:`, error);
    return null;
  }
};

/**
 * Delete data from a store
 */
export const deleteFromOfflineStore = async (storeName, key) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    await store.delete(key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Deleted from ${storeName}:`, key);
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`Error deleting from ${storeName}:`, error);
    throw error;
  }
};

/**
 * Clear all data from a store
 */
export const clearOfflineStore = async (storeName) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    await store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Cleared ${storeName}`);
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`Error clearing ${storeName}:`, error);
    throw error;
  }
};

// === PENDING ACTIONS (for offline queue) ===

/**
 * Queue an action to be synced when back online
 */
export const queuePendingAction = async (action) => {
  const pendingAction = {
    ...action,
    timestamp: Date.now(),
    status: 'pending'
  };

  await saveToOfflineStore(STORES.PENDING_ACTIONS, pendingAction);
  console.log('📥 Queued pending action:', action.type);

  // Try to register background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-actions');
      console.log('✅ Background sync registered');
    } catch (error) {
      console.warn('⚠️ Background sync not supported:', error);
    }
  }
};

/**
 * Get all pending actions
 */
export const getPendingActions = async () => {
  return await getAllFromOfflineStore(STORES.PENDING_ACTIONS);
};

/**
 * Remove a pending action after successful sync
 */
export const removePendingAction = async (actionId) => {
  await deleteFromOfflineStore(STORES.PENDING_ACTIONS, actionId);
};

/**
 * Clear all pending actions
 */
export const clearPendingActions = async () => {
  await clearOfflineStore(STORES.PENDING_ACTIONS);
};

// === CACHE HELPERS ===

/**
 * Cache projects for offline access
 */
export const cacheProjects = async (projects) => {
  await saveToOfflineStore(STORES.PROJECTS, projects);
};

/**
 * Get cached projects
 */
export const getCachedProjects = async () => {
  return await getAllFromOfflineStore(STORES.PROJECTS);
};

/**
 * Cache jobs for offline access
 */
export const cacheJobs = async (jobs) => {
  await saveToOfflineStore(STORES.JOBS, jobs);
};

/**
 * Get cached jobs
 */
export const getCachedJobs = async () => {
  return await getAllFromOfflineStore(STORES.JOBS);
};

/**
 * Cache tasks for offline access
 */
export const cacheTasks = async (tasks) => {
  await saveToOfflineStore(STORES.TASKS, tasks);
};

/**
 * Get cached tasks
 */
export const getCachedTasks = async () => {
  return await getAllFromOfflineStore(STORES.TASKS);
};

// === USER PREFERENCES ===

/**
 * Save user preference
 */
export const savePreference = async (key, value) => {
  await saveToOfflineStore(STORES.USER_PREFERENCES, { key, value, timestamp: Date.now() });
};

/**
 * Get user preference
 */
export const getPreference = async (key) => {
  const result = await getFromOfflineStore(STORES.USER_PREFERENCES, key);
  return result?.value;
};

export default {
  initOfflineDB,
  saveToOfflineStore,
  getAllFromOfflineStore,
  getFromOfflineStore,
  deleteFromOfflineStore,
  clearOfflineStore,
  queuePendingAction,
  getPendingActions,
  removePendingAction,
  clearPendingActions,
  cacheProjects,
  getCachedProjects,
  cacheJobs,
  getCachedJobs,
  cacheTasks,
  getCachedTasks,
  savePreference,
  getPreference,
  STORES
};
