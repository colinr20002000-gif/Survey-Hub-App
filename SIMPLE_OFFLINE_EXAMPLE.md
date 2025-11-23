# Simple Read-Only Offline - Implementation Example

This shows how to modify your existing context providers to add simple read-only offline support.

## Example: ProjectContext with Read-Only Caching

### Before (No Offline Support)

```jsx
// src/contexts/ProjectContext.jsx - CURRENT VERSION

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null);

    if (!error) {
      setProjects(data);
    }
    setLoading(false);
  };

  const addProject = async (projectData) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (!error) {
      setProjects([...projects, data]);
    }
  };

  // ... rest of CRUD
};
```

### After (With Read-Only Offline)

```jsx
// src/contexts/ProjectContext.jsx - WITH SIMPLE OFFLINE

import { useOffline } from './SimpleOfflineContext';
import { cacheData, getCachedData } from '../utils/simpleOfflineCache';

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const { isOnline } = useOffline(); // ← Add this

  useEffect(() => {
    fetchProjects();
  }, [isOnline]); // ← Re-fetch when coming back online

  const fetchProjects = async () => {
    setLoading(true);

    if (isOnline) {
      // ONLINE: Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .is('deleted_at', null);

        if (!error && data) {
          setProjects(data);
          setLastSync(Date.now());
          // Cache for offline use
          await cacheData('projects', data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        // Fallback to cache on network error
        const cached = await getCachedData('projects');
        if (cached) {
          setProjects(cached);
        }
      }
    } else {
      // OFFLINE: Load from cache
      const cached = await getCachedData('projects');
      if (cached) {
        setProjects(cached);
        console.log('📦 Loaded projects from cache (offline)');
      }
    }

    setLoading(false);
  };

  const addProject = async (projectData) => {
    // Only allow when online
    if (!isOnline) {
      throw new Error('Cannot create projects while offline. Please connect to the internet.');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (!error) {
      const updated = [...projects, data];
      setProjects(updated);
      // Update cache
      await cacheData('projects', updated);
    }

    return { data, error };
  };

  const updateProject = async (projectData) => {
    // Only allow when online
    if (!isOnline) {
      throw new Error('Cannot update projects while offline. Please connect to the internet.');
    }

    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectData.id)
      .select()
      .single();

    if (!error) {
      const updated = projects.map(p => p.id === data.id ? data : p);
      setProjects(updated);
      // Update cache
      await cacheData('projects', updated);
    }

    return { data, error };
  };

  const deleteProject = async (id) => {
    // Only allow when online
    if (!isOnline) {
      throw new Error('Cannot delete projects while offline. Please connect to the internet.');
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      // Update cache
      await cacheData('projects', updated);
    }

    return { error };
  };

  const value = {
    projects,
    loading,
    lastSync,
    isOnline, // ← Expose to components
    addProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
```

**Changes made:**
1. ✅ Import `useOffline` and cache utilities
2. ✅ Check `isOnline` before fetching
3. ✅ Cache data after successful fetch
4. ✅ Load from cache when offline
5. ✅ Block write operations when offline
6. ✅ Re-fetch when coming back online

**Code added:** ~30 lines
**Complexity:** Minimal
**Testing:** Easy

---

## Example: UI Component with Offline Support

### Before (No Offline Support)

```jsx
// src/pages/ProjectsPage.jsx - CURRENT

const ProjectsPage = ({ onViewProject }) => {
  const { projects, addProject, updateProject, deleteProject } = useProjects();

  return (
    <div>
      <button onClick={() => setIsEditModalOpen(true)}>
        Create Project
      </button>

      {/* Project list */}
      {projects.map(project => (
        <div key={project.id}>
          {project.project_name}
          <button onClick={() => handleEdit(project)}>Edit</button>
          <button onClick={() => handleDelete(project.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

### After (With Offline Indicators)

```jsx
// src/pages/ProjectsPage.jsx - WITH OFFLINE SUPPORT

const ProjectsPage = ({ onViewProject }) => {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    isOnline, // ← Use this
    lastSync  // ← And this
  } = useProjects();

  const handleCreate = async () => {
    if (!isOnline) {
      alert('Cannot create projects while offline. Please connect to the internet.');
      return;
    }
    setIsEditModalOpen(true);
  };

  const handleEdit = async (project) => {
    if (!isOnline) {
      alert('Cannot edit projects while offline. Please connect to the internet.');
      return;
    }
    setProjectToManage(project);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!isOnline) {
      alert('Cannot delete projects while offline. Please connect to the internet.');
      return;
    }

    if (confirm('Are you sure?')) {
      await deleteProject(id);
    }
  };

  return (
    <div>
      {/* Offline warning banner */}
      {!isOnline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 text-yellow-700 mr-2" />
            <div>
              <p className="font-semibold text-yellow-700">Viewing cached data (offline)</p>
              <p className="text-sm text-yellow-600">
                Last updated: {lastSync ? new Date(lastSync).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create button - disabled when offline */}
      <button
        onClick={handleCreate}
        disabled={!isOnline}
        className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
        title={!isOnline ? 'Connect to internet to create projects' : ''}
      >
        Create Project {!isOnline && '🔒'}
      </button>

      {/* Project list */}
      {projects.map(project => (
        <div key={project.id}>
          {project.project_name}

          {/* Edit button - disabled when offline */}
          <button
            onClick={() => handleEdit(project)}
            disabled={!isOnline}
            className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Edit {!isOnline && '🔒'}
          </button>

          {/* Delete button - disabled when offline */}
          <button
            onClick={() => handleDelete(project.id)}
            disabled={!isOnline}
            className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Delete {!isOnline && '🔒'}
          </button>
        </div>
      ))}
    </div>
  );
};
```

**Changes made:**
1. ✅ Show offline warning banner
2. ✅ Display last sync time
3. ✅ Disable edit/delete buttons
4. ✅ Show lock icons when offline
5. ✅ Prevent actions with clear error messages

---

## Complete Implementation Checklist

### Step 1: Add Offline Provider (5 minutes)

```jsx
// src/main.jsx

import { OfflineProvider } from './contexts/SimpleOfflineContext';
import SimpleOfflineIndicator from './components/SimpleOfflineIndicator';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OfflineProvider>
      <App />
      <UpdateNotification />
      <SimpleOfflineIndicator />  {/* Add this */}
    </OfflineProvider>
  </StrictMode>,
)
```

### Step 2: Update Each Context (30 min per context)

Apply the pattern shown above to:
- ✅ ProjectContext
- ✅ JobContext
- ✅ TaskContext
- ✅ DeliveryTaskContext
- ✅ ProjectTaskContext

### Step 3: Update UI Components (15 min per page)

For each page that allows create/edit/delete:
- ✅ Disable buttons when offline
- ✅ Show offline warning banner
- ✅ Add helpful error messages

### Step 4: Update Service Worker (Already done)

Use the improved service worker for static asset caching.

### Step 5: Test (30 minutes)

```bash
# In Chrome DevTools:
1. Go to Network tab
2. Select "Offline" throttling
3. Test:
   ✅ App loads
   ✅ Can view projects
   ✅ Cannot create/edit/delete
   ✅ Offline banner shows
   ✅ Buttons are disabled
4. Go back online
5. Test:
   ✅ Data refreshes
   ✅ Offline banner disappears
   ✅ Can create/edit/delete again
```

---

## Error Handling Pattern

```jsx
const handleSave = async (data) => {
  try {
    if (!isOnline) {
      throw new Error('Cannot save while offline. Please connect to the internet.');
    }

    await updateProject(data);
    showSuccess('Project saved successfully');
  } catch (error) {
    if (error.message.includes('offline')) {
      showError(error.message);
    } else {
      showError('Failed to save project. Please try again.');
    }
  }
};
```

---

## Cache Management

### Clear Cache on Logout

```jsx
// src/contexts/AuthContext.jsx

import { clearCache } from '../utils/simpleOfflineCache';

const logout = async () => {
  await supabase.auth.signOut();
  await clearCache(); // ← Clear cached data
  setUser(null);
};
```

### Show Cache Age

```jsx
import { getCacheTimestamp } from '../utils/simpleOfflineCache';

const ProjectsList = () => {
  const [cacheAge, setCacheAge] = useState(null);

  useEffect(() => {
    const checkCacheAge = async () => {
      const timestamp = await getCacheTimestamp('projects');
      if (timestamp) {
        const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        setCacheAge(ageInHours);
      }
    };
    checkCacheAge();
  }, []);

  return (
    <div>
      {!isOnline && cacheAge && (
        <p className="text-sm text-gray-500">
          Data cached {cacheAge < 1
            ? 'less than 1 hour ago'
            : `${Math.floor(cacheAge)} hours ago`}
        </p>
      )}
    </div>
  );
};
```

---

## Total Implementation Time

| Task | Time |
|------|------|
| Add offline provider | 5 min |
| Update 5 contexts | 2.5 hours |
| Update 8 pages | 2 hours |
| Test thoroughly | 30 min |
| **TOTAL** | **~5 hours** |

Compare to full offline: 12-17 hours (70% time savings!)

---

## What You Get

✅ **Users can view data offline**
✅ **Instant loading from cache**
✅ **No sync conflicts**
✅ **No data loss**
✅ **Clear user expectations**
✅ **Easy to test**
✅ **Easy to maintain**
✅ **Works on all browsers**

❌ **Cannot create/edit offline** (but user knows this upfront)

---

## Real User Experience

### Scenario 1: Field Surveyor

```
08:00 - At office (online)
       Opens app → Loads fresh data from Supabase
       Cache updated in background
       ✅ Latest data loaded (500ms)

09:30 - Drives to remote site (offline)
       Opens app → Loads from cache
       ✅ Can view all projects instantly (10ms!)
       ✅ Can see task details
       ✅ Can review notes
       Cannot: Create tasks (but knows this)

       Solution: Takes notes on paper, will enter later

11:00 - Returns to office (online)
       App auto-refreshes data
       ✅ Enters notes from paper
       ✅ Updates task status
       ✅ Cache updated

Result: 90% productive vs 0% without offline support!
```

### Scenario 2: Manager at Desk

```
Working on project reports (online)
Brief network blip (offline for 2 minutes)

Without offline:
❌ White screen
❌ Lost work
❌ Frustration

With read-only offline:
✅ Continues viewing project data
✅ Can finish reading reports
✅ Brief yellow banner shows
✅ Back online automatically
✅ Seamless experience
```

---

## Summary

Read-only offline gives you:
- **80% of the value** (can view data)
- **20% of the complexity** (no sync)
- **5 hours vs 15 hours** to implement
- **Zero sync conflicts**
- **Crystal clear UX**

Perfect for your use case! 🎯
