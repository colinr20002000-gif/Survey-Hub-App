# Privilege System Audit Report
**Date:** November 25, 2025
**Status:** Issues Found - Action Required

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Viewer+ Equipment RLS Violation** ✅ FIXED
**Status:** Fixed with migration `20251125000000_fix_viewer_plus_equipment_comprehensive.sql`

**Problem:**
- Viewer+ users get RLS policy violations when trying to assign, transfer, or return equipment
- The `equipment` table only allowed Editor+ to access it
- But `equipment_assignments` table allowed Viewer+ to manage assignments
- When Viewer+ tried to update equipment status during operations, they hit an RLS block

**Root Cause:**
- The equipment table policy (`equipment_manage_editor`) only allowed `Editor` or higher
- Viewer+ needed to UPDATE equipment fields during assignment/transfer/return operations

**Fix Applied:**
1. Created `equipment_read_all` policy to allow all authenticated users to read equipment
2. Created `equipment_operations_viewer_plus` policy to allow Viewer+ to update equipment during operations
3. Created `equipment_status_logs_insert` policy to allow Viewer+ to create status logs
4. Verified `equipment_assignments_manage_viewer_plus` policy is correct

**Files Modified:**
- Created: `supabase/migrations/20251125000000_fix_viewer_plus_equipment_comprehensive.sql`

---

## ⚠️ ISSUES REQUIRING ATTENTION

### 2. **Missing Permission Checks for Some Sidebar Items**

**Problem:** Some sidebar items don't have explicit permission checks

**Current State:**
- ✅ **Dashboard** - No permission check (accessible to all)
- ✅ **Projects** - Uses `VIEW_PROJECTS` permission
- ✅ **Announcements** - Uses `VIEW_ANNOUNCEMENTS` permission
- ✅ **Resource Calendar** - Uses `VIEW_RESOURCE_CALENDAR` permission
- ✅ **To Do List** - Uses `VIEW_TASKS` permission
- ✅ **Equipment Calendar** - Uses `VIEW_EQUIPMENT_CALENDAR` permission
- ✅ **Equipment Management** - Uses `VIEW_EQUIPMENT` permission
- ✅ **Vehicle Management** - Uses `VIEW_VEHICLES` permission
- ✅ **Vehicle Inspection** - Uses `VIEW_VEHICLE_INSPECTIONS` permission
- ⚠️ **Delivery Tracker** - No permission check (accessible to all)
- ⚠️ **Delivery Team - To Do List** - No permission check (accessible to all)
- ✅ **Document Hub** - Uses `VIEW_DOCUMENT_HUB` permission
- ⚠️ **Video Tutorials** - No permission check (accessible to all)
- ⚠️ **Rail Components** - No permission check (accessible to all)
- ⚠️ **User Contacts** - No permission check (accessible to all)
- ⚠️ **Useful Contacts** - No permission check (accessible to all)
- ⚠️ **On-Call Contacts** - No permission check (accessible to all)
- ⚠️ **Project Logs** - No permission check (under Analytics)
- ⚠️ **Resource Analytics** - No permission check (under Analytics)
- ⚠️ **AFV** - No permission check (under Analytics)
- ✅ **Settings** - No permission check (accessible to all - correct)

**Recommendation:**
- Review if these items should be restricted
- If they should remain accessible to all, document this decision
- If they should be restricted, add permission checks

**Suggested Permissions to Add:**
```javascript
// In src/utils/privileges.js
VIEW_DELIVERY_TRACKER: [all privileges],
VIEW_DELIVERY_TASKS: [all privileges],
VIEW_VIDEO_TUTORIALS: [all privileges],
VIEW_RAIL_COMPONENTS: [all privileges],
VIEW_USER_CONTACTS: [all privileges],
VIEW_USEFUL_CONTACTS: [all privileges],
VIEW_ON_CALL_CONTACTS: [all privileges],
```

---

### 3. **Analytics Sub-Items Missing Individual Permission Checks**

**Problem:** Analytics group uses `VIEW_ANALYTICS` permission, but sub-items (Project Logs, Resource, AFV) don't have individual permission checks.

**Current Behavior:**
- If user has `VIEW_ANALYTICS` permission, they can see ALL analytics pages
- No granular control over individual analytics pages

**Recommendation:**
- Keep current behavior if all analytics pages should be grouped together
- OR add individual permissions if different privilege levels should see different analytics

**Current Permission:**
```javascript
VIEW_ANALYTICS: [VIEWER, VIEWER_PLUS, EDITOR, EDITOR_PLUS, ADMIN, SUPER_ADMIN]
```

This is correct - all users can see analytics.

---

### 4. **Calendar Colours Permission Missing**

**Problem:** Admin nav item "Calendar Colours" uses `canAccessCalendarColours` but this permission doesn't exist in `PERMISSIONS` object.

**Current Code (App.jsx line 739):**
```javascript
{ name: 'Calendar Colours', icon: Palette, show: canAccessCalendarColours },
```

**Issue:**
- `canAccessCalendarColours` is called in usePermissions hook but `ACCESS_CALENDAR_COLOURS` is not defined in PERMISSIONS

**Fix Required:**
Add to `src/utils/privileges.js`:
```javascript
ACCESS_CALENDAR_COLOURS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
```

---

## ✅ CONFIRMED WORKING CORRECTLY

### 1. **Privilege Hierarchy**
```
Viewer (1) < Viewer+ (2) < Editor (3) < Editor+ (3.5) < Admin (4) < Super Admin (5)
```
✅ Correctly implemented

### 2. **Core Permission Checks**
All core permissions are properly defined:
- View permissions ✅
- Viewer+ limited actions ✅
- Editor full access ✅
- Admin mode access ✅

### 3. **Admin Mode Access**
- Only Admin and Super Admin can access admin mode ✅
- Admin nav items properly protected ✅

### 4. **Vehicle Inspection Permissions**
```javascript
CREATE_VEHICLE_INSPECTIONS: [VIEWER_PLUS, EDITOR, EDITOR_PLUS, ADMIN, SUPER_ADMIN]
EXPORT_VEHICLE_INSPECTIONS: [VIEWER_PLUS, EDITOR, EDITOR_PLUS, ADMIN, SUPER_ADMIN]
DELETE_VEHICLE_INSPECTIONS: [EDITOR_PLUS, ADMIN, SUPER_ADMIN]
```
✅ Correctly implemented - Viewer+ can create and export, but only Editor+ can delete

---

## 📋 RECOMMENDED ACTIONS

### Immediate Actions (High Priority)

1. ✅ **COMPLETED** - Apply equipment RLS fix migration
   ```bash
   npx supabase db push
   ```

2. **Add Missing ACCESS_CALENDAR_COLOURS Permission**
   - File: `src/utils/privileges.js`
   - Add after line 132:
   ```javascript
   ACCESS_CALENDAR_COLOURS: [PRIVILEGES.ADMIN, PRIVILEGES.SUPER_ADMIN],
   ```

### Short-Term Actions (Medium Priority)

3. **Document Unrestricted Pages**
   - Create a list of pages intentionally accessible to all users
   - Add comments in code explaining why these don't have permission checks

4. **Review Analytics Sub-Items**
   - Decide if Project Logs, Resource Analytics, and AFV should have individual permissions
   - Document the decision

5. **Test Equipment Operations**
   - Test as Viewer+ user:
     - [ ] Assign equipment
     - [ ] Transfer equipment
     - [ ] Return equipment
     - [ ] Add equipment comment
   - Verify no RLS violations occur

### Long-Term Actions (Low Priority)

6. **Create Permission Audit Script**
   - Script to automatically check all sidebar items have corresponding permissions
   - Run as part of CI/CD or pre-commit hook

7. **Add Permission Documentation to Components**
   - Add JSDoc comments to components listing required permissions
   - Makes it easier to audit and maintain

---

## 📊 PERMISSION COVERAGE BY SIDEBAR ITEM

| Sidebar Item | Permission Check | Status |
|---|---|---|
| Dashboard | None | ⚠️ Intentional |
| Projects | VIEW_PROJECTS | ✅ |
| Announcements | VIEW_ANNOUNCEMENTS | ✅ |
| Resource Calendar | VIEW_RESOURCE_CALENDAR | ✅ |
| To Do List | VIEW_TASKS | ✅ |
| Equipment Calendar | VIEW_EQUIPMENT_CALENDAR | ✅ |
| Equipment Management | VIEW_EQUIPMENT | ✅ |
| Vehicle Management | VIEW_VEHICLES | ✅ |
| Vehicle Inspection | VIEW_VEHICLE_INSPECTIONS | ✅ |
| Delivery Tracker | None | ⚠️ Review |
| Delivery Team - To Do List | None | ⚠️ Review |
| Document Hub | VIEW_DOCUMENT_HUB | ✅ |
| Video Tutorials | None | ⚠️ Review |
| Rail Components | None | ⚠️ Review |
| User Contacts | None | ⚠️ Review |
| Useful Contacts | None | ⚠️ Review |
| On-Call Contacts | None | ⚠️ Review |
| Project Logs | Parent: VIEW_ANALYTICS | ⚠️ Review |
| Resource (Analytics) | Parent: VIEW_ANALYTICS | ⚠️ Review |
| AFV | Parent: VIEW_ANALYTICS | ⚠️ Review |
| Settings | None | ✅ Intentional |
| Feedback (Admin) | ACCESS_FEEDBACK | ✅ |
| User Admin (Admin) | ACCESS_USER_ADMIN | ✅ |
| Privilege (Admin) | ACCESS_USER_ADMIN | ✅ |
| Document Management (Admin) | ACCESS_DOCUMENT_MANAGEMENT | ✅ |
| Dropdown Menu (Admin) | ACCESS_DROPDOWN_MENU | ✅ |
| Calendar Colours (Admin) | ACCESS_CALENDAR_COLOURS | ❌ MISSING |
| Audit Trail (Admin) | ACCESS_AUDIT_TRAIL | ✅ |

---

## 🔧 FILES TO MODIFY

### Required Changes

1. **src/utils/privileges.js**
   - Add `ACCESS_CALENDAR_COLOURS` permission (line ~132)

### Optional Changes (Based on Decisions)

2. **src/utils/privileges.js**
   - Add delivery, tutorial, contacts, and analytics sub-item permissions if needed

3. **src/App.jsx**
   - Add permission checks to unrestricted sidebar items if needed

---

## 🧪 TESTING CHECKLIST

### As Viewer+ User
- [ ] View equipment
- [ ] Assign equipment to user
- [ ] Transfer equipment between users
- [ ] Return equipment
- [ ] Add comment to equipment
- [ ] Complete a project task
- [ ] View vehicle inspections
- [ ] Create vehicle inspection
- [ ] Download file from Document Hub
- [ ] Verify cannot create/edit/delete projects
- [ ] Verify cannot access admin mode

### As Editor User
- [ ] All Viewer+ tests pass
- [ ] Create project
- [ ] Edit project
- [ ] Delete project
- [ ] Add equipment
- [ ] Edit equipment
- [ ] Delete equipment
- [ ] Allocate resources
- [ ] Upload documents
- [ ] Verify cannot access admin mode

### As Admin User
- [ ] All Editor tests pass
- [ ] Access admin mode
- [ ] View feedback page
- [ ] Access user admin
- [ ] Access calendar colours (after fix)
- [ ] Access audit trail
- [ ] Create user
- [ ] Edit user privileges

---

## 📝 SUMMARY

**Total Issues Found:** 4
- **Critical:** 1 (Equipment RLS) - ✅ FIXED
- **High Priority:** 1 (Missing Calendar Colours permission)
- **Medium Priority:** 2 (Unrestricted pages, Analytics granularity)

**Recommended Next Steps:**
1. ✅ Apply equipment RLS migration (DONE)
2. Add ACCESS_CALENDAR_COLOURS permission
3. Test equipment operations as Viewer+
4. Review and document unrestricted pages
5. Run full testing checklist

**Overall Assessment:** The privilege system is well-structured and mostly correct. The equipment RLS issue has been fixed. Only minor improvements needed for completeness.
