# Offline-First Implementation Guide for Survey Hub

This guide explains how to implement comprehensive offline support for your Survey Hub app.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Steps](#implementation-steps)
4. [Best Practices](#best-practices)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What Works Offline?

✅ **Read Access**:
- View cached projects, jobs, and tasks
- Browse previously loaded data
- View user profiles and settings
- Access the app UI

✅ **Limited Write Access**:
- Queue create/update/delete actions
- Auto-sync when connection returns
- Optimistic UI updates

❌ **Not Available Offline**:
- Real-time updates
- Push notifications
- Initial data fetch (requires online at least once)
- Authentication/login (requires online)

---

## Architecture

### Three-Layer Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                    USER INTERFACE                    │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│         OFFLINE CONTEXT (State Management)           │
│  - Online/offline detection                          │
│  - Pending actions queue                             │
│  - Sync management                                   │
└─────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌────────────────┐ ┌──────────────┐ ┌─────────────────┐
│  SERVICE       │ │   INDEXEDDB  │ │   SUPABASE      │
│  WORKER        │ │              │ │   (Online)      │
│  (Assets)      │ │  (Data)      │ │                 │
└────────────────┘ └──────────────┘ └─────────────────┘
```

### Cache Strategies by Resource Type

| Resource Type | Strategy | Cache Location | TTL |
|--------------|----------|---------------|-----|
| HTML (App Shell) | Network-first | Service Worker | Session |
| Static Assets (JS/CSS/Images) | Cache-first | Service Worker | 7 days |
| API Data (Projects/Jobs) | Network-only + IndexedDB | IndexedDB | Until sync |
| User Actions (Create/Update) | Queue in IndexedDB | IndexedDB | Until sync |

---

## Implementation Steps

### Step 1: Update Service Worker

Replace your current `public/sw.js` with the improved version:

```bash
# Backup current service worker
mv public/sw.js public/sw-old.js

# Rename improved version
mv public/sw-improved.js public/sw.js
```

**Key improvements:**
- ✅ Cache-first for static assets
- ✅ Network-first for HTML
- ✅ Better offline fallback handling
- ✅ Stale-while-revalidate pattern

### Step 2: Wrap App with OfflineProvider

Update `src/main.jsx`:

```jsx
import { OfflineProvider } from './contexts/OfflineContext';
import OfflineIndicator from './components/OfflineIndicator';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OfflineProvider>
      <App />
      <UpdateNotification />
      <OfflineIndicator />  {/* Add this line */}
    </OfflineProvider>
  </StrictMode>,
)
```

### Step 3: Update Context Providers to Cache Data

Modify `src/contexts/ProjectContext.jsx` (example):

```jsx
import { useOffline } from './OfflineContext';

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const { isOnline, cacheData, getCachedData, queueAction } = useOffline();

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (isOnline) {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .is('deleted_at', null);

        if (!error && data) {
          setProjects(data);
          // Cache for offline use
          await cacheData('projects', data);
        }
      } else {
        // Load from cache when offline
        const cached = await getCachedData('projects');
        setProjects(cached);
      }
    };

    fetchProjects();
  }, [isOnline]);

  // Add project (with offline support)
  const addProject = async (projectData) => {
    if (isOnline) {
      // Online: normal Supabase insert
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (!error) {
        setProjects([...projects, data]);
        await cacheData('projects', [...projects, data]);
      }
    } else {
      // Offline: queue action + optimistic update
      const tempId = `temp_${Date.now()}`;
      const tempProject = { ...projectData, id: tempId };

      // Optimistic UI update
      setProjects([...projects, tempProject]);

      // Queue for sync
      await queueAction('CREATE_PROJECT', projectData);
    }
  };

  // Similar for updateProject, deleteProject...
};
```

### Step 4: Handle Pending Actions Sync

Update `src/contexts/OfflineContext.jsx` to execute your API calls:

```jsx
const executePendingAction = async (action) => {
  const { type, payload } = action;

  switch (type) {
    case 'CREATE_PROJECT':
      const { data, error } = await supabase
        .from('projects')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      break;

    case 'UPDATE_PROJECT':
      await supabase
        .from('projects')
        .update(payload)
        .eq('id', payload.id);
      break;

    // Add cases for all your action types
  }
};
```

### Step 5: Create Offline Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Survey Hub</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.125rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }
    button {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>
      Survey Hub needs an internet connection to load. Please check your
      connection and try again.
    </p>
    <button onclick="window.location.reload()">
      Try Again
    </button>
  </div>
</body>
</html>
```

---

## Best Practices

### 1. **Cache Invalidation**

Set appropriate cache expiration times:

```js
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// In your cache logic
const isCacheValid = (cachedItem) => {
  const age = Date.now() - cachedItem.timestamp;
  return age < CACHE_MAX_AGE;
};
```

### 2. **Optimistic UI Updates**

Always update the UI immediately, then sync in the background:

```js
// ✅ Good: Instant feedback
const deleteProject = async (id) => {
  // Update UI immediately
  setProjects(projects.filter(p => p.id !== id));

  // Sync in background
  if (isOnline) {
    await supabase.from('projects').delete().eq('id', id);
  } else {
    await queueAction('DELETE_PROJECT', { id });
  }
};

// ❌ Bad: Waiting for network
const deleteProject = async (id) => {
  await supabase.from('projects').delete().eq('id', id);
  setProjects(projects.filter(p => p.id !== id));
};
```

### 3. **Show Offline State Clearly**

Always indicate when data might be stale:

```jsx
{!isOnline && (
  <div className="bg-yellow-100 p-3 rounded text-sm">
    ⚠️ Viewing cached data - last updated {lastSyncTime}
  </div>
)}
```

### 4. **Limit Offline Functionality**

Disable features that can't work offline:

```jsx
const CreateProjectButton = () => {
  const { isOnline } = useOffline();

  return (
    <button
      disabled={!isOnline}
      title={!isOnline ? 'Available when online' : ''}
    >
      Create Project
    </button>
  );
};
```

### 5. **Periodic Cache Cleanup**

Clean up old cached data to save space:

```js
// Run on app startup
const cleanupOldCache = async () => {
  const cacheAgeLimit = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Delete cache entries older than 30 days
  // Implementation depends on your caching strategy
};
```

---

## Testing

### Manual Testing

1. **Test Offline Mode:**
   ```bash
   # In Chrome DevTools:
   # 1. Open DevTools (F12)
   # 2. Go to Network tab
   # 3. Select "Offline" from throttling dropdown
   ```

2. **Test Slow Network:**
   ```bash
   # Use "Slow 3G" or "Fast 3G" throttling
   # Verify app shows loading states appropriately
   ```

3. **Test Cache:**
   ```bash
   # In Application tab > Cache Storage
   # Verify cached files appear
   ```

4. **Test IndexedDB:**
   ```bash
   # In Application tab > IndexedDB > SurveyHubOfflineDB
   # Verify data is stored correctly
   ```

### Automated Testing

```js
describe('Offline Functionality', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
  });

  it('should load cached projects when offline', async () => {
    // Your test code
  });

  it('should queue actions when offline', async () => {
    // Your test code
  });
});
```

---

## Troubleshooting

### Issue: Cache not updating

**Cause:** Service worker not activating new version

**Solution:**
```js
// Force update service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  window.location.reload();
}
```

### Issue: Data not syncing when back online

**Cause:** Background Sync not triggered

**Solution:**
- Check browser console for errors
- Manually trigger sync: Click "Sync Now" button in offline indicator
- Verify `executePendingAction` function has correct API calls

### Issue: Too much storage used

**Cause:** Caching too much data

**Solution:**
```js
// Limit what you cache
const shouldCacheProject = (project) => {
  // Only cache recent or important projects
  const isRecent = Date.now() - new Date(project.created_at) < 90 * 24 * 60 * 60 * 1000;
  return isRecent || project.is_important;
};
```

---

## Performance Tips

1. **Lazy load offline features** - Only initialize IndexedDB when needed
2. **Compress cached data** - Use CompressionStream API for large datasets
3. **Limit cache size** - Set max items per cache (e.g., 100 projects)
4. **Debounce sync** - Don't sync on every reconnection, wait 2-3 seconds
5. **Show sync progress** - Display progress bar during background sync

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Workers | ✅ 40+ | ✅ 44+ | ✅ 11.1+ | ✅ 17+ |
| IndexedDB | ✅ 24+ | ✅ 16+ | ✅ 10+ | ✅ 12+ |
| Background Sync | ✅ 49+ | ❌ | ❌ | ✅ 79+ |
| Cache API | ✅ 43+ | ✅ 41+ | ✅ 11.1+ | ✅ 16+ |

**Note:** Background Sync is not supported in Firefox/Safari, but the app will still work - it just won't auto-sync in the background. Users can manually click "Sync Now".

---

## Additional Resources

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Google: Offline Cookbook](https://web.dev/offline-cookbook/)
- [PWA Tutorial](https://web.dev/progressive-web-apps/)
