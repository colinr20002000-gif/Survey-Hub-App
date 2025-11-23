/**
 * Simple Offline Cache (Read-Only Mode)
 *
 * This provides read-only caching for offline viewing.
 * No sync, no conflicts, no complexity.
 */

const DB_NAME = 'SurveyHubCache';
const DB_VERSION = 1;
const CACHE_STORE = 'cached_data';

/**
 * Open the cache database
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Cache data for offline access
 * @param {string} key - Cache key (e.g., 'projects', 'jobs')
 * @param {any} data - Data to cache
 */
export const cacheData = async (key, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction([CACHE_STORE], 'readwrite');
    const store = tx.objectStore(CACHE_STORE);

    await store.put({
      key,
      data,
      timestamp: Date.now()
    });

    console.log(`✅ Cached ${key} for offline access`);
  } catch (error) {
    console.warn(`⚠️ Failed to cache ${key}:`, error);
    // Non-critical error - app still works without cache
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any} Cached data or null
 */
export const getCachedData = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction([CACHE_STORE], 'readonly');
    const store = tx.objectStore(CACHE_STORE);
    const result = await store.get(key);

    if (!result) {
      console.log(`📭 No cached data for ${key}`);
      return null;
    }

    console.log(`📦 Loaded cached ${key} from ${new Date(result.timestamp).toLocaleString()}`);
    return result.data;
  } catch (error) {
    console.warn(`⚠️ Failed to get cached ${key}:`, error);
    return null;
  }
};

/**
 * Get cache timestamp
 * @param {string} key - Cache key
 * @returns {number|null} Timestamp or null
 */
export const getCacheTimestamp = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction([CACHE_STORE], 'readonly');
    const store = tx.objectStore(CACHE_STORE);
    const result = await store.get(key);

    return result?.timestamp || null;
  } catch (error) {
    return null;
  }
};

/**
 * Clear all cached data (useful for logout)
 */
export const clearCache = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction([CACHE_STORE], 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    await store.clear();

    console.log('✅ Cache cleared');
  } catch (error) {
    console.warn('⚠️ Failed to clear cache:', error);
  }
};

/**
 * Delete specific cached data
 * @param {string} key - Cache key to delete
 */
export const deleteCachedData = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction([CACHE_STORE], 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    await store.delete(key);

    console.log(`✅ Deleted cached ${key}`);
  } catch (error) {
    console.warn(`⚠️ Failed to delete cached ${key}:`, error);
  }
};

export default {
  cacheData,
  getCachedData,
  getCacheTimestamp,
  clearCache,
  deleteCachedData
};
