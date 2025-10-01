# Privilege System Documentation

## 🎯 Overview

A complete privilege system with 6 levels of access control:

1. **Viewer** - Read-only
2. **Viewer+** - Read + limited actions
3. **Editor** - Full access except admin
4. **Editor+** - Full access except admin (same as Editor)
5. **Admin** - Full system access
6. **Super Admin** - Complete access

---

## 📋 Privilege Levels & Permissions

### 1. Viewer
**Access Level:** Read-only

**Can Do:**
- ✅ View all pages (Projects, Equipment, Vehicles, Resource Calendar, Tasks, Document Hub)
- ✅ Use all filters and sorting features
- ✅ Change own password in settings
- ✅ Toggle light/dark mode

**Cannot Do:**
- ❌ Modify any data
- ❌ Complete tasks
- ❌ Assign/return equipment or vehicles
- ❌ Download files
- ❌ Access admin mode

---

### 2. Viewer+
**Access Level:** Read + Limited Actions

**All Viewer permissions PLUS:**
- ✅ **Tasks:** Complete project tasks
- ✅ **Equipment:** Assign, transfer, return equipment + add comments
- ✅ **Vehicles:** Assign, return vehicles + add comments
- ✅ **Documents:** Download files from Document Hub and Projects

**Cannot Do:**
- ❌ Create/edit/delete items
- ❌ Access admin mode

---

### 3. Editor
**Access Level:** Full Access (No Admin Mode)

**All Viewer+ permissions PLUS:**
- ✅ **Projects:** Create, edit, delete, archive
- ✅ **Tasks:** Create, edit, delete, assign (all task types)
- ✅ **Equipment:** Add, edit, delete equipment
- ✅ **Vehicles:** Add, edit, delete vehicles
- ✅ **Resource Calendar:** Allocate, edit, delete allocations
- ✅ **Documents:** Upload and delete documents

**Cannot Do:**
- ❌ Access admin mode
- ❌ Access Feedback
- ❌ Access User Admin
- ❌ Access Document Management
- ❌ Access Dropdown Menu
- ❌ Access Audit Trail
- ❌ Manage users

---

### 4. Editor+
**Access Level:** Full Access (No Admin Mode)

**All Viewer+ permissions PLUS:**
- ✅ **Projects:** Create, edit, delete, archive
- ✅ **Tasks:** Create, edit, delete, assign (all task types)
- ✅ **Equipment:** Add, edit, delete equipment
- ✅ **Vehicles:** Add, edit, delete vehicles
- ✅ **Resource Calendar:** Allocate, edit, delete allocations
- ✅ **Documents:** Upload and delete documents

**Cannot Do:**
- ❌ Access admin mode
- ❌ Access Feedback
- ❌ Access User Admin
- ❌ Access Document Management
- ❌ Access Dropdown Menu
- ❌ Access Audit Trail
- ❌ Manage users

**Note:** Editor+ has identical permissions to Editor. This privilege level exists for organizational purposes.

---

### 5. Admin
**Access Level:** Full System Access

**All Editor permissions PLUS:**
- ✅ **Admin Mode:** Full access
- ✅ **User Management:** Create, edit, delete users
- ✅ **Change user privileges**
- ✅ **Feedback:** Full access
- ✅ **User Admin:** Full access
- ✅ **Document Management:** Full access
- ✅ **Dropdown Menu:** Full access
- ✅ **Audit Trail:** Full access

---

### 6. Super Admin
**Access Level:** Complete System Access

**All Admin permissions PLUS:**
- ✅ Manage system settings
- ✅ Unrestricted access to everything

---

## 🔧 Implementation Guide

### Using the `usePermissions` Hook

```javascript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
    const {
        can,
        canAccessAdmin,
        isViewer,
        isEditor,
        isAdmin,
        canCreateProjects,
        canAssignEquipment
    } = usePermissions();

    return (
        <div>
            {/* Check specific permission */}
            {can('CREATE_PROJECTS') && (
                <button>Create Project</button>
            )}

            {/* Check admin access */}
            {canAccessAdmin() && (
                <Link to="/admin">Admin Mode</Link>
            )}

            {/* Use convenience methods */}
            {canCreateProjects && <CreateButton />}
            {canAssignEquipment && <AssignButton />}

            {/* Check privilege level */}
            {isViewer && <p>You have read-only access</p>}
            {isEditor && <p>You can edit content</p>}
        </div>
    );
}
```

### Available Permission Checks

**Core Functions:**
- `can(permission)` - Check any permission
- `canAccessAdmin()` - Check admin mode access
- `hasMinPrivilege(level)` - Check minimum privilege level

**Privilege Level Checks:**
- `isViewer`
- `isViewerPlus`
- `isEditor`
- `isEditorPlus`
- `isAdmin`
- `isSuperAdmin`
- `isAdminOrAbove`
- `isEditorOrAbove`
- `isViewerPlusOrAbove`

**Convenience Checks (Common Permissions):**

**Projects:**
- `canCreateProjects`
- `canEditProjects`
- `canDeleteProjects`

**Tasks:**
- `canCompleteTasks`
- `canCreateTasks`
- `canAssignTasks`

**Equipment:**
- `canAssignEquipment`
- `canReturnEquipment`
- `canAddEquipment`

**Vehicles:**
- `canAssignVehicles`
- `canReturnVehicles`
- `canAddVehicles`

**Resources:**
- `canAllocateResources`

**Documents:**
- `canDownloadFiles`
- `canUploadDocuments`

**Admin Pages:**
- `canAccessUserAdmin`
- `canAccessFeedback`
- `canAccessAuditTrail`
- `canAccessDropdownMenu`
- `canAccessDocumentManagement`

---

## 📝 Complete Permission List

All available permissions (use with `can('PERMISSION_NAME')`):

### View Permissions
- `VIEW_PROJECTS`
- `VIEW_EQUIPMENT`
- `VIEW_VEHICLES`
- `VIEW_RESOURCE_CALENDAR`
- `VIEW_TASKS`
- `VIEW_DOCUMENT_HUB`
- `USE_FILTERS`
- `USE_SORT`

### Settings
- `CHANGE_PASSWORD`
- `TOGGLE_THEME`

### Viewer+ Permissions
- `COMPLETE_PROJECT_TASKS`
- `ASSIGN_EQUIPMENT`
- `TRANSFER_EQUIPMENT`
- `RETURN_EQUIPMENT`
- `ADD_EQUIPMENT_COMMENTS`
- `ASSIGN_VEHICLES`
- `RETURN_VEHICLES`
- `ADD_VEHICLE_COMMENTS`
- `DOWNLOAD_DOCUMENT_HUB_FILES`
- `DOWNLOAD_PROJECT_FILES`

### Editor Permissions
- `CREATE_PROJECTS`
- `EDIT_PROJECTS`
- `DELETE_PROJECTS`
- `ARCHIVE_PROJECTS`
- `CREATE_TASKS`
- `EDIT_TASKS`
- `DELETE_TASKS`
- `ASSIGN_TASKS`
- `CREATE_PROJECT_TASKS`
- `EDIT_PROJECT_TASKS`
- `DELETE_PROJECT_TASKS`
- `ASSIGN_PROJECT_TASKS`
- `CREATE_DELIVERY_TASKS`
- `EDIT_DELIVERY_TASKS`
- `DELETE_DELIVERY_TASKS`
- `ADD_EQUIPMENT`
- `EDIT_EQUIPMENT`
- `DELETE_EQUIPMENT`
- `ADD_VEHICLES`
- `EDIT_VEHICLES`
- `DELETE_VEHICLES`
- `ALLOCATE_RESOURCES`
- `EDIT_RESOURCE_ALLOCATIONS`
- `DELETE_RESOURCE_ALLOCATIONS`
- `UPLOAD_DOCUMENTS`
- `DELETE_DOCUMENTS`
- `UPLOAD_PROJECT_FILES`

### Admin Permissions
- `ACCESS_ADMIN_MODE`
- `ACCESS_FEEDBACK`
- `ACCESS_USER_ADMIN`
- `ACCESS_DOCUMENT_MANAGEMENT`
- `ACCESS_DROPDOWN_MENU`
- `ACCESS_AUDIT_TRAIL`
- `CREATE_USERS`
- `EDIT_USERS`
- `DELETE_USERS`
- `CHANGE_USER_PRIVILEGES`

### Super Admin Permissions
- `MANAGE_SYSTEM_SETTINGS`

---

## 🚀 Next Steps

### 1. Update Navigation
Update the navigation menu in `App.jsx` or `Header.jsx` to show/hide menu items based on privileges:

```javascript
const { canAccessAdmin } = usePermissions();

// Only show Admin Mode link if user has permission
{canAccessAdmin() && (
    <Link to="/admin">Admin Mode</Link>
)}
```

### 2. Update Components
Add permission checks to all components:

**Example: Project Actions**
```javascript
const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermissions();

{canCreateProjects && <AddProjectButton />}
{canEditProjects && <EditButton project={project} />}
{canDeleteProjects && <DeleteButton project={project} />}
```

**Example: Equipment Assignment**
```javascript
const { canAssignEquipment, canReturnEquipment } = usePermissions();

{canAssignEquipment && <AssignEquipmentModal />}
{canReturnEquipment && <ReturnButton />}
```

### 3. Protect Routes
Add route protection based on privileges (if using React Router):

```javascript
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function ProtectedRoute({ children, requiredPermission }) {
    const { can } = usePermissions();

    if (!can(requiredPermission)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Usage
<Route path="/admin/users" element={
    <ProtectedRoute requiredPermission="ACCESS_USER_ADMIN">
        <UserAdmin />
    </ProtectedRoute>
} />
```

---

## 🧪 Testing Privileges

### Test Each Level:

1. **Create test users** with each privilege level
2. **Log in as each user** and verify:
   - Correct menu items visible
   - Correct buttons/actions available
   - Admin mode accessible only to Admin/Super Admin
   - All restrictions enforced

### Quick Test Checklist:

**Viewer:**
- [ ] Can view all pages
- [ ] Cannot see create/edit/delete buttons
- [ ] Cannot access admin mode
- [ ] Can change password and theme

**Viewer+:**
- [ ] Can complete tasks
- [ ] Can assign/return equipment
- [ ] Can download files
- [ ] Cannot create/edit/delete items

**Editor:**
- [ ] Can create/edit/delete all items
- [ ] Cannot access admin mode
- [ ] Cannot see admin menu items

**Editor+:**
- [ ] Can create/edit/delete all items (same as Editor)
- [ ] Cannot access admin mode
- [ ] Cannot see admin menu items

**Admin/Super Admin:**
- [ ] Can access admin mode
- [ ] Can see all admin pages
- [ ] Can manage users
- [ ] Full system access

---

## 📚 Files Modified

1. **Created:**
   - `src/utils/privileges.js` - Core privilege system
   - `src/hooks/usePermissions.js` - Permission checking hook
   - `PRIVILEGE_SYSTEM.md` - This documentation

2. **To Update:**
   - Navigation components
   - All page components with actions
   - Route protection
   - Component buttons/modals

---

**Ready to use!** Import `usePermissions` in any component and start implementing privilege-based access control.
