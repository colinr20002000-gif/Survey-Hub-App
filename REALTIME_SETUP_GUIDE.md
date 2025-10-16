# Supabase Realtime Setup Guide

## ⚠️ Important: Enable Realtime on Database Tables

For real-time synchronization to work, you **must enable Realtime** on your Supabase database tables. This is a configuration setting in Supabase that needs to be enabled for each table.

## 🔧 How to Enable Realtime on Supabase

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Database > Replication**
   - Click on "Database" in the left sidebar
   - Click on "Replication" tab

3. **Enable Realtime for each table:**

   Enable Realtime for the following tables:

   ✅ **Core Tables:**
   - `projects`
   - `users`
   - `dummy_users`
   - `tasks`
   - `project_tasks`
   - `delivery_tasks`

   ✅ **Equipment Tables:**
   - `equipment`
   - `equipment_assignments`
   - `equipment_comments`

   ✅ **Vehicle Tables:**
   - `vehicles`
   - `vehicle_assignments`
   - `vehicle_comments`

   ✅ **Resource Allocation Tables:**
   - `resource_allocations` ⭐ **CRITICAL FOR CALENDAR**
   - `dummy_resource_allocations` ⭐ **CRITICAL FOR CALENDAR**

4. **Toggle the switch** next to each table to enable Realtime

### Method 2: Using SQL (Alternative)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable Realtime for all required tables
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE dummy_users;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE resource_allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE dummy_resource_allocations;
```

## 🧪 Testing Real-Time Functionality

### Test 1: Resource Calendar (Your Reported Issue)

1. **Open two browser windows/tabs**
   - Window A: Navigate to Resource Calendar
   - Window B: Navigate to Resource Calendar

2. **Open browser console** (F12) in both windows

3. **Look for these console messages:**
   ```
   🔌 Setting up real-time subscriptions for resource allocations...
   📡 Resource allocations subscription status: SUBSCRIBED
   📡 Dummy resource allocations subscription status: SUBSCRIBED
   ```

4. **Make a change in Window A:**
   - Allocate a resource to a project or add leave

5. **Check Window A console:**
   - You should NOT see any messages (you made the change)

6. **Check Window B console:**
   - You SHOULD see:
   ```
   📅 Resource allocations changed: INSERT {payload details}
   🔄 Reloading resource allocations...
   ```

7. **Verify the change appears in Window B** without refreshing

### Test 2: Projects

1. Open two tabs on Projects page
2. Add/edit/delete a project in one tab
3. Verify the change appears instantly in the other tab
4. Console should show: `📁 Projects table changed: INSERT/UPDATE/DELETE`

### Test 3: Equipment/Vehicles

1. Open two tabs on Equipment or Vehicles page
2. Add/assign/return equipment or vehicle
3. Verify changes appear instantly
4. Console should show: `🔧 Equipment table changed` or `🚗 Vehicles table changed`

## 🐛 Troubleshooting

### Issue: Changes don't appear in other browser

**Check 1: Console Subscription Status**
```javascript
// Look for this in console when page loads:
📡 Resource allocations subscription status: SUBSCRIBED
```

If you see `CHANNEL_ERROR` or `TIMED_OUT`:
- Realtime is not enabled on the table
- Follow the "Enable Realtime" steps above

**Check 2: Console Events**
- When you make a change in one tab, check the OTHER tab's console
- You should see: `📅 Resource allocations changed: INSERT`
- If you don't see this, Realtime is not properly enabled

**Check 3: Network Tab**
- Open Network tab in DevTools
- Filter by "WS" (WebSocket)
- You should see an active WebSocket connection to Supabase
- If not, check your Supabase connection

**Check 4: Supabase Dashboard**
- Go to Database > Replication
- Verify the toggle is ON (blue) for `resource_allocations` and `dummy_resource_allocations`

### Issue: "Permission denied" errors

Run this SQL to grant proper permissions:

```sql
-- Grant SELECT permissions on tables for authenticated users
GRANT SELECT ON resource_allocations TO authenticated;
GRANT SELECT ON dummy_resource_allocations TO authenticated;

-- Ensure RLS policies allow SELECT
-- Check your existing RLS policies don't block SELECT
```

### Issue: Subscription connects but no events

This usually means:
1. Realtime is enabled BUT
2. Row Level Security (RLS) is blocking the events

**Solution:**
```sql
-- Check current RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('resource_allocations', 'dummy_resource_allocations');

-- You need a SELECT policy that allows users to see changes
-- Example policy (adjust based on your security needs):
CREATE POLICY "Users can view all allocations" ON resource_allocations
  FOR SELECT USING (true);

CREATE POLICY "Users can view all dummy allocations" ON dummy_resource_allocations
  FOR SELECT USING (true);
```

## 📊 Monitoring Real-Time Events

All real-time events are logged to the console with emojis:

- 📁 Projects
- 👥 Users
- 🔧 Equipment
- 🚗 Vehicles
- 📅 Resource Allocations
- 📋 Tasks
- 💬 Comments

Watch the console to verify events are being received!

## ✅ Quick Checklist

- [ ] Realtime enabled for `resource_allocations` table
- [ ] Realtime enabled for `dummy_resource_allocations` table
- [ ] Console shows "SUBSCRIBED" status
- [ ] Console shows event messages when changes are made
- [ ] Changes appear automatically in other browser tabs
- [ ] No refresh needed

## 🎉 Expected Behavior

When working correctly:
1. User A makes a change (adds/edits/deletes)
2. Change saves to database
3. Supabase broadcasts the change to all subscribers
4. User B's browser receives the event
5. User B's screen updates automatically
6. User B sees the change **instantly** without refresh

---

**Note:** If you've enabled Realtime and it's still not working, please check:
1. Your Supabase plan supports Realtime (all plans do)
2. You've saved the Realtime configuration
3. You've hard-refreshed your browser (Ctrl+Shift+R)
4. There are no browser extensions blocking WebSocket connections
