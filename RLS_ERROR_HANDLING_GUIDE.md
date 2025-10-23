# RLS Error Handling Guide

## Custom Error Messages for Supabase RLS Violations

This guide explains how to use the `rlsErrorHandler` utility to display user-friendly error messages when Row Level Security (RLS) policies block operations.

---

## Quick Start

### Import the Error Handler

```javascript
import { handleSupabaseError } from './utils/rlsErrorHandler';
```

### Basic Usage

```javascript
const handleCreateProject = async (projectData) => {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData);

  if (error) {
    const errorMessage = handleSupabaseError(error, 'projects', 'insert');
    alert(errorMessage); // or use toast/notification
    return;
  }

  // Success handling...
};
```

---

## API Reference

### `handleSupabaseError(error, tableName, operation, data)`

The main function that returns a user-friendly error message.

**Parameters:**
- `error` (Object): The Supabase error object
- `tableName` (string): The name of the table (e.g., 'projects', 'resource_allocations')
- `operation` (string): The operation type ('insert', 'update', 'delete', 'select')
- `data` (Object, optional): The data being operated on (used for specific error messages)

**Returns:**
- (string) User-friendly error message

---

## Examples

### Example 1: Creating a Project

```javascript
const handleSaveProject = async (projectData) => {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData);

  if (error) {
    const message = handleSupabaseError(error, 'projects', 'insert');
    alert(message);
    // Output: "You need Editor privileges or higher to create projects."
    return;
  }

  console.log('Project created:', data);
};
```

### Example 2: Resource Allocation with Context

```javascript
const handleCreateAllocation = async (allocationData) => {
  const { data, error } = await supabase
    .from('resource_allocations')
    .insert(allocationData);

  if (error) {
    // Pass the allocationData to get specific error messages
    const message = handleSupabaseError(error, 'resource_allocations', 'insert', allocationData);
    alert(message);
    // If Viewer+ tries to assign to a project:
    // Output: "Viewer+ users can only add "Available" or "Not Available" status.
    //          You need Editor privileges to assign to projects or other activities."
    return;
  }

  console.log('Allocation created:', data);
};
```

### Example 3: Updating with Toast Notification

```javascript
import { useToast } from '../contexts/ToastContext';
import { handleSupabaseError } from '../utils/rlsErrorHandler';

const MyComponent = () => {
  const { showToast } = useToast();

  const handleUpdate = async (id, updates) => {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id);

    if (error) {
      const message = handleSupabaseError(error, 'equipment', 'update');
      showToast(message, 'error');
      return;
    }

    showToast('Equipment updated successfully', 'success');
  };

  return <button onClick={() => handleUpdate(1, { name: 'New Name' })}>Update</button>;
};
```

### Example 4: Deleting with Confirmation

```javascript
const handleDelete = async (itemId) => {
  if (!confirm('Are you sure you want to delete this item?')) return;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', itemId);

  if (error) {
    const message = handleSupabaseError(error, 'tasks', 'delete');
    alert(message);
    // Output: "You need Editor privileges or higher to delete tasks."
    return;
  }

  alert('Task deleted successfully');
};
```

---

## Error Messages by Privilege Level

### Viewer
- **Projects:** Cannot create, edit, or delete
- **Equipment/Vehicles:** Cannot assign, add comments
- **Files:** Cannot download
- **Everything:** View only

**Example Messages:**
- "You need Editor privileges or higher to create projects."
- "You need Viewer+ privileges or higher to assign equipment."
- "You need Viewer+ privileges or higher to download files."

### Viewer+
- **Resource Calendar:** Can ONLY add "Available" / "Not Available"
- **Equipment/Vehicles:** Can assign, return, add comments
- **Files:** Can download
- **Tasks:** Can complete (except delivery tasks)

**Example Messages:**
- "Viewer+ users can only add "Available" or "Not Available" status. You need Editor privileges to assign to projects or other activities."
- "You need Editor privileges or higher to create delivery tasks."

### Editor
- **Full access** except admin mode and announcements

**Example Messages:**
- "You need Editor+ privileges or higher to create announcements."
- "You need Admin privileges to view feedback."

### Editor+
- **Same as Editor** + can create announcements

### Admin / Super Admin
- **Full access** to everything including admin mode

---

## Utility Functions

### `isRLSError(error)`

Check if an error is an RLS violation.

```javascript
import { isRLSError } from './utils/rlsErrorHandler';

if (isRLSError(error)) {
  console.log('This is an RLS permission error');
}
```

### `getRLSErrorMessage(error, operation, resourceName)`

Get a generic RLS error message.

```javascript
import { getRLSErrorMessage } from './utils/rlsErrorHandler';

const message = getRLSErrorMessage(error, 'create', 'project');
// Output: "Insufficient Privileges: You do not have permission to create project."
```

### `getSpecificRLSMessage(tableName, operation, data)`

Get a specific error message for a table/operation.

```javascript
import { getSpecificRLSMessage } from './utils/rlsErrorHandler';

const message = getSpecificRLSMessage('projects', 'insert');
// Output: "You need Editor privileges or higher to create projects."
```

---

## Best Practices

1. **Always use `handleSupabaseError()`** - It handles all error types, not just RLS
2. **Pass the data parameter** when available for more specific messages
3. **Use toast notifications** instead of alerts for better UX
4. **Log errors** to console for debugging: `console.error('Error:', err)`
5. **Provide user feedback** - Never silently fail

### Good Example ✅

```javascript
try {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData);

  if (error) {
    const message = handleSupabaseError(error, 'projects', 'insert', projectData);
    showToast(message, 'error');
    console.error('Insert error:', error);
    return;
  }

  showToast('Project created successfully', 'success');
  return data;
} catch (err) {
  console.error('Unexpected error:', err);
  showToast('An unexpected error occurred', 'error');
}
```

### Bad Example ❌

```javascript
const { data, error } = await supabase
  .from('projects')
  .insert(projectData);

if (error) {
  alert(error.message); // Generic, unhelpful message
}
```

---

## Supported Tables

The error handler provides specific messages for:

- projects
- tasks
- delivery_tasks
- resource_allocations
- dummy_resource_allocations
- equipment & equipment_assignments & equipment_comments
- vehicles & vehicle_assignments & vehicle_comments
- announcements
- document_files & project_files
- feedback
- audit_logs
- dropdown_categories & dropdown_items
- users
- useful_contacts

---

## Need to Add a New Table?

Edit `src/utils/rlsErrorHandler.js` and add your table to the `messages` object:

```javascript
const messages = {
  your_table_name: {
    insert: 'Custom message for insert...',
    update: 'Custom message for update...',
    delete: 'Custom message for delete...',
    select: 'Custom message for select...',
  },
  // ... other tables
};
```

---

## Common RLS Error Codes

- `42501` - Insufficient privilege (RLS violation)
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `23502` - Not null constraint violation

The `handleSupabaseError()` function handles all of these automatically!
