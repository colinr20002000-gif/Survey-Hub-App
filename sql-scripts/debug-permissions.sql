-- Reset VIEW_CHECK_ADJUST permissions to denied for Admin/Super Admin as requested by user manual action
-- This is just to fix the state if it was manually changed in the DB by my previous script
-- Actually, the user said "i have set View Check & Adjust to denied on admin and super admin but i can still view the check & adjust page"
-- This means the PERMISSIONS check in code is still allowing it.
-- I need to update the `hasPermission` function or ensuring `App.jsx` uses the dynamic permissions correctly.

-- The issue is likely that `App.jsx` uses `can('VIEW_CHECK_ADJUST')` which calls `usePermissions` -> `hasPermission`.
-- `hasPermission` in `usePermissions.js` checks the DB permissions.
-- However, `usePermissions.js` might be falling back to hardcoded permissions if DB sync fails or isn't initialized?
-- Or the Admin/Super Admin roles have a hardcoded override?

-- Let's check `usePermissions.js`.
