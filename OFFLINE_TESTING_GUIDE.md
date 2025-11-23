# Testing Your Read-Only Offline Implementation

## ✅ What We Just Implemented

1. **OfflineProvider** - Tracks online/offline status
2. **SimpleOfflineIndicator** - Yellow banner at top of app when offline
3. **ProjectContext** - Caches projects for offline viewing
4. **ProjectsPage** - Disabled buttons when offline with clear indicators

---

## 🧪 How to Test

### Test 1: Basic Offline Mode (5 minutes)

**Steps:**

1. **Start the app (online)**
   ```bash
   npm run dev
   ```

2. **Load projects page**
   - Navigate to Projects
   - You should see your projects list
   - All buttons should be enabled (create, edit, delete)

3. **Go offline**
   - Open Chrome DevTools (F12)
   - Go to "Network" tab
   - Change throttling dropdown from "No throttling" to "Offline"

4. **Verify offline mode works**
   - ✅ Yellow banner appears at top: "Viewing cached data (offline mode)"
   - ✅ Shows last sync time
   - ✅ Projects still visible (loaded from cache)
   - ✅ "New Project" button is gray and disabled with 🔒
   - ✅ Edit buttons (pencil icon) are grayed out
   - ✅ Delete buttons (trash icon) are grayed out
   - ✅ More actions menu (three dots) is disabled
   - ✅ Hovering shows tooltip: "Connect to internet..."

5. **Try to create a project (should fail)**
   - Click "New Project" button
   - Nothing should happen (button is disabled)

6. **Go back online**
   - In DevTools Network tab, change "Offline" to "No throttling"
   - ✅ Yellow banner disappears
   - ✅ All buttons become enabled again
   - ✅ Projects refresh with latest data

**Expected Result:** ✅ All checks passed = Working!

---

### Test 2: First-Time Offline (No Cache)

**Steps:**

1. **Clear cache**
   - Open DevTools (F12)
   - Go to "Application" tab
   - Click "Storage" in sidebar
   - Click "Clear site data" button
   - Refresh page

2. **Load projects (online)**
   - Should load normally from database

3. **Go offline immediately**
   - DevTools → Network → Offline

4. **Verify behavior**
   - ✅ Yellow banner shows
   - ✅ Projects still visible (were just cached)
   - ✅ All edit buttons disabled

**Expected Result:** ✅ Works perfectly!

---

### Test 3: Data Refresh When Back Online

**Steps:**

1. **Start online, view projects**
2. **Go offline** (DevTools → Offline)
   - Projects still visible (from cache)
3. **While offline, have someone else add a project** (or do it in a different browser)
4. **Come back online**
   - ✅ ProjectContext should auto-refresh
   - ✅ New project should appear in list
   - ✅ Cache should be updated

**Expected Result:** ✅ Data syncs automatically!

---

### Test 4: Cache Persistence Across Page Reloads

**Steps:**

1. **Load projects (online)**
   - Wait for data to load
2. **Go offline** (DevTools → Offline)
3. **Refresh the page** (Ctrl+R or F5)
4. **Verify:**
   - ✅ App loads (no white screen)
   - ✅ Yellow offline banner shows
   - ✅ Projects visible from cache
   - ✅ Last sync time shown

**Expected Result:** ✅ Cached data persists!

---

### Test 5: Error Handling

**Steps:**

1. **Load projects (online)**
2. **Go offline**
3. **Try to click disabled buttons**
   - ✅ Nothing happens (buttons truly disabled)
4. **If you somehow triggered an action** (bug):
   - Should see alert: "Cannot create/update/delete while offline..."

**Expected Result:** ✅ Clear error messages!

---

## 🐛 Common Issues & Fixes

### Issue: Offline banner doesn't appear

**Check:**
```bash
# In browser console, check if offline context is working:
window.navigator.onLine  # Should be false when offline
```

**Fix:**
- Make sure `SimpleOfflineIndicator` is in `main.jsx`
- Make sure `OfflineProvider` wraps the app

---

### Issue: Projects don't load offline

**Check:**
```bash
# In DevTools → Application → IndexedDB
# Look for: SurveyHubCache → cached_data → projects
```

**Fix:**
- Make sure you loaded projects at least once while online
- Check browser console for errors during caching

---

### Issue: Buttons still work when offline

**Check:**
- Look for console errors about undefined `isOnline`
- Check if ProjectContext is exporting `isOnline`

**Fix:**
- Make sure ProjectContext includes `isOnline` in the value object
- Make sure ProjectsPage destructures `isOnline` from `useProjects()`

---

### Issue: Service Worker conflicts

**Symptom:** Old service worker preventing updates

**Fix:**
```bash
# In DevTools → Application → Service Workers
# Click "Unregister" on any old service workers
# Refresh page
```

---

## 📊 Success Criteria Checklist

After testing, you should be able to check all these boxes:

- [ ] App loads when offline (no white screen)
- [ ] Offline banner appears when offline
- [ ] Projects visible from cache when offline
- [ ] All edit/delete/create buttons disabled offline
- [ ] Clear tooltips on disabled buttons
- [ ] Coming back online auto-refreshes data
- [ ] Cache persists across page reloads
- [ ] No errors in console during offline mode
- [ ] Users can clearly see they're offline
- [ ] Last sync time is displayed

**If all boxes are checked: 🎉 Implementation successful!**

---

## 🔍 Advanced Testing (Optional)

### Test on Mobile

1. **Deploy to test server or use ngrok**
2. **Open on mobile device**
3. **Turn on Airplane mode**
4. **Verify offline mode works**

### Test Cache Size

1. **Load 100+ projects**
2. **Check IndexedDB size:**
   - DevTools → Application → Storage
   - Should see ~1-5 MB for 100 projects

### Test Cache Expiration

1. **Set a really old cache timestamp manually:**
   ```javascript
   // In browser console:
   const request = indexedDB.open('SurveyHubCache', 1);
   request.onsuccess = (e) => {
     const db = e.target.result;
     const tx = db.transaction(['cached_data'], 'readwrite');
     const store = tx.objectStore('cached_data');
     store.put({
       key: 'projects',
       data: [{id: 1, project_name: 'Old Data'}],
       timestamp: Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago
     });
   };
   ```

2. **Go offline and check if old data is shown**

---

## 🎯 Next Steps

Once testing is complete:

1. **Deploy to production**
2. **Monitor usage:**
   - How often are users offline?
   - Are cached data being used?

3. **Expand to other contexts** (if desired):
   - JobContext
   - TaskContext
   - etc.

4. **Gather user feedback:**
   - Do users want offline editing?
   - Is read-only enough?

5. **Decision point (3 months):**
   - Stay with read-only?
   - Upgrade to full offline with sync?

---

## 💡 Quick Test Commands

**Test offline immediately:**
```javascript
// Paste in browser console:
console.log('Online:', navigator.onLine);
console.log('Projects cached:', await (async () => {
  const db = await indexedDB.open('SurveyHubCache', 1);
  return new Promise((resolve) => {
    db.onsuccess = (e) => {
      const tx = e.target.result.transaction(['cached_data'], 'readonly');
      const req = tx.objectStore('cached_data').get('projects');
      req.onsuccess = () => resolve(req.result ? 'Yes' : 'No');
    };
  });
})());
```

**Clear all offline data:**
```javascript
// Paste in browser console:
indexedDB.deleteDatabase('SurveyHubCache');
location.reload();
```

---

Good luck with testing! 🚀
