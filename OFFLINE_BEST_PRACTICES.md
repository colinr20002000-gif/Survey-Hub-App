# Offline Best Practices - Quick Reference

## 🎯 Core Principles

### 1. **Network-First for Data, Cache-First for Assets**

```
┌────────────────────────────────────────────┐
│  Resource Type  │  Strategy               │
├────────────────────────────────────────────┤
│  HTML/App Shell │  Network-first + cache  │
│  JS/CSS/Images  │  Cache-first            │
│  API Data       │  Network + IndexedDB    │
│  User Actions   │  Queue + sync later     │
└────────────────────────────────────────────┘
```

### 2. **Progressive Enhancement**

- App works fully online ✅
- App works read-only offline ✅
- Write operations queued for sync ✅
- Clear offline indicators shown ✅

---

## 🔧 Implementation Checklist

### Phase 1: Basic Offline (Recommended Minimum)

- [ ] Implement improved service worker (`sw-improved.js`)
- [ ] Add offline indicator component
- [ ] Cache static assets (JS, CSS, images)
- [ ] Create offline fallback page
- [ ] Test: App loads when offline

**Time estimate:** 2-3 hours
**Complexity:** Low
**Impact:** Medium - App stays functional offline

### Phase 2: Offline Data Access (Recommended)

- [ ] Set up IndexedDB with offline storage utility
- [ ] Wrap app with `OfflineProvider`
- [ ] Cache projects/jobs/tasks when fetched
- [ ] Load from cache when offline
- [ ] Test: View data when offline

**Time estimate:** 4-6 hours
**Complexity:** Medium
**Impact:** High - Users can access data offline

### Phase 3: Offline Write Operations (Optional)

- [ ] Implement action queueing
- [ ] Add sync functionality
- [ ] Optimistic UI updates
- [ ] Background sync (Chrome/Edge only)
- [ ] Test: Create/edit/delete offline

**Time estimate:** 6-8 hours
**Complexity:** High
**Impact:** Very High - Full offline functionality

---

## 📱 Real-World Scenarios

### Scenario 1: Field Surveyor (Most Common)

**User Journey:**
1. Opens app at home (online) - data cached ✅
2. Drives to remote site (offline)
3. Views project details - loaded from cache ✅
4. Takes notes - queued for sync ✅
5. Returns to office (online) - auto-syncs ✅

**Required:**
- Phase 1: Basic offline ✅
- Phase 2: Offline data ✅
- Phase 3: Write operations ✅

### Scenario 2: Office User (Less Critical)

**User Journey:**
1. Working at desk (online most of time)
2. Brief internet outage (offline for 5 min)
3. Continues viewing projects - from cache ✅
4. Internet restored - seamless ✅

**Required:**
- Phase 1: Basic offline ✅
- Phase 2: Offline data (optional)
- Phase 3: Not needed ❌

### Scenario 3: Mobile User (Moderate)

**User Journey:**
1. Commuting on train (spotty connection)
2. Opening app frequently
3. Needs fast loading - cached assets ✅
4. Occasionally adds tasks ✅

**Required:**
- Phase 1: Basic offline ✅
- Phase 2: Offline data ✅
- Phase 3: Write operations ✅

---

## ⚡ Performance Guidelines

### Storage Limits

```js
// Recommended cache sizes for your app:
const CACHE_LIMITS = {
  projects: 500,      // ~2-5 MB
  jobs: 1000,         // ~5-10 MB
  tasks: 2000,        // ~5-10 MB
  assets: '50 MB',    // JS/CSS/images
  total: '100 MB'     // Total app storage
};
```

### What to Cache

| Data Type | Cache? | Why |
|-----------|--------|-----|
| All projects | ✅ | Users browse frequently |
| Active jobs | ✅ | Needed for field work |
| All jobs (archived) | ❌ | Rarely accessed, large |
| User's assigned tasks | ✅ | High value, small size |
| All users list | ⚠️ | If < 100 users |
| Documents/files | ❌ | Too large, link instead |
| Analytics data | ❌ | Always need fresh data |

### Cache Expiration

```js
const CACHE_TTL = {
  projects: 7 * 24 * 60 * 60 * 1000,    // 7 days
  jobs: 3 * 24 * 60 * 60 * 1000,        // 3 days
  tasks: 24 * 60 * 60 * 1000,           // 1 day
  staticAssets: 30 * 24 * 60 * 60 * 1000 // 30 days
};
```

---

## 🎨 UX Best Practices

### 1. Always Show Connection Status

```jsx
// ✅ Good: Clear indicator
<div className="status-bar">
  {isOnline ? (
    <span className="text-green-600">● Online</span>
  ) : (
    <span className="text-yellow-600">● Offline - viewing cached data</span>
  )}
</div>

// ❌ Bad: No indication
<div>Survey Hub</div>
```

### 2. Disable Unavailable Features

```jsx
// ✅ Good: Clear disabled state
<button
  onClick={createProject}
  disabled={!isOnline}
  className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
>
  Create Project {!isOnline && '(Online only)'}
</button>

// ❌ Bad: Feature fails silently
<button onClick={createProject}>Create Project</button>
```

### 3. Show Pending Actions

```jsx
// ✅ Good: User knows what's queued
{pendingActions.length > 0 && (
  <div className="bg-blue-100 p-3 rounded">
    ⏳ {pendingActions.length} actions pending sync
    <button onClick={syncNow}>Sync Now</button>
  </div>
)}
```

### 4. Timestamp Cached Data

```jsx
// ✅ Good: User knows data age
<div className="text-sm text-gray-500">
  Last updated: {formatDistanceToNow(lastSync)} ago
  {!isOnline && ' (offline)'}
</div>
```

---

## 🚨 Common Pitfalls

### ❌ Don't Cache Everything

```js
// Bad: Caching too much
await cacheProjects(allProjects); // 10,000 projects = 50MB!

// Good: Cache intelligently
const recentProjects = projects.filter(p =>
  Date.now() - new Date(p.created_at) < 90 * 24 * 60 * 60 * 1000
);
await cacheProjects(recentProjects); // Only last 90 days
```

### ❌ Don't Block UI During Sync

```js
// Bad: UI freezes during sync
const sync = async () => {
  setLoading(true);
  await syncAllActions(); // Blocks for 30 seconds!
  setLoading(false);
};

// Good: Background sync with progress
const sync = async () => {
  setSyncing(true);
  syncAllActions().finally(() => setSyncing(false));
  // UI remains interactive
};
```

### ❌ Don't Ignore Sync Conflicts

```js
// Bad: Last write wins (data loss!)
await supabase.from('projects').update(localData).eq('id', id);

// Good: Detect conflicts
const { data: serverData } = await supabase
  .from('projects')
  .select('updated_at')
  .eq('id', id)
  .single();

if (new Date(serverData.updated_at) > new Date(localData.updated_at)) {
  // Show conflict resolution UI
  showConflictDialog(localData, serverData);
} else {
  await supabase.from('projects').update(localData).eq('id', id);
}
```

### ❌ Don't Forget Error Handling

```js
// Bad: Fails silently
await cacheProjects(projects);

// Good: Graceful degradation
try {
  await cacheProjects(projects);
  console.log('✅ Projects cached');
} catch (error) {
  console.warn('⚠️ Cache failed, continuing without offline support:', error);
  // App still works, just no offline support
}
```

---

## 🧪 Testing Checklist

### Basic Tests

- [ ] App loads when offline
- [ ] Offline indicator appears
- [ ] Static assets load from cache
- [ ] Offline page shows on navigation

### Data Tests

- [ ] Cached data loads offline
- [ ] Data syncs when back online
- [ ] No duplicate data after sync
- [ ] Old cache cleaned up

### Edge Cases

- [ ] Network switches mid-operation
- [ ] Multiple tabs open
- [ ] Service worker updates while offline
- [ ] Large datasets (1000+ items)
- [ ] Quota exceeded handling

### Browser Tests

- [ ] Chrome Desktop ✅
- [ ] Chrome Android ✅
- [ ] Firefox Desktop ⚠️ (no background sync)
- [ ] Safari iOS ⚠️ (no background sync)
- [ ] Edge Desktop ✅

---

## 📊 Monitoring

### Key Metrics to Track

```js
// Log offline usage
analytics.track('offline_usage', {
  duration: offlineDuration,
  actions_queued: pendingActions.length,
  data_cached_mb: cacheSizeInMB
});

// Log sync success/failure
analytics.track('offline_sync', {
  actions_synced: successCount,
  actions_failed: failureCount,
  sync_duration: syncTimeMs
});

// Log cache performance
analytics.track('cache_hit', {
  resource_type: 'projects',
  cache_age_hours: cacheAgeHours,
  load_time_ms: loadTimeMs
});
```

---

## 🎓 Learning Path

### Beginner (You are here)
1. ✅ Read this guide
2. ⏭️ Implement Phase 1 (Basic offline)
3. ⏭️ Test with Chrome DevTools offline mode
4. ⏭️ Deploy and monitor

### Intermediate
1. ⏭️ Implement Phase 2 (Offline data)
2. ⏭️ Add optimistic UI updates
3. ⏭️ Handle sync conflicts
4. ⏭️ Optimize cache size

### Advanced
1. ⏭️ Implement Phase 3 (Write operations)
2. ⏭️ Add background sync
3. ⏭️ Implement compression
4. ⏭️ Build offline analytics

---

## 🔗 Quick Links

- [Full Implementation Guide](./OFFLINE_IMPLEMENTATION_GUIDE.md)
- [Service Worker Code](./public/sw-improved.js)
- [Offline Storage Utility](./src/utils/offlineStorage.js)
- [Offline Context](./src/contexts/OfflineContext.jsx)
- [Offline Indicator](./src/components/OfflineIndicator.jsx)

---

## 💡 TL;DR

**Recommended for your app:**

1. **Start with Phase 1 + 2** (basic offline + data caching)
2. **Focus on read-only offline** (viewing projects/jobs)
3. **Add Phase 3 later** if field users need write operations
4. **Test thoroughly** with Chrome DevTools offline mode
5. **Monitor usage** to see if users actually go offline

**Expected ROI:**
- Phase 1: 2-3 hours → Faster loading, works during outages
- Phase 2: 4-6 hours → Field users can view data offline
- Phase 3: 6-8 hours → Full offline create/edit capabilities

**Total investment:** 12-17 hours for complete offline support
**Benefit:** App works anywhere, anytime, regardless of connection
