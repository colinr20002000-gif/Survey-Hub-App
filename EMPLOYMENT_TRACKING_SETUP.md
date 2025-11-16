# Employment Tracking Setup Instructions

## Overview
This document explains the employment date tracking feature that has been implemented to solve the following problems:
1. **Former employees** appearing in the resource calendar after they've left
2. **New employees** appearing on dates before they started with the company

## What Was Implemented

### 1. Database Changes
Three new columns were added to both `users` and `dummy_users` tables:
- `hire_date` (DATE) - When the employee started
- `termination_date` (DATE) - When the employee left (NULL for active employees)
- `employment_status` (TEXT) - Either 'active' or 'terminated'

### 2. User Interface Changes
The User Admin modal now includes:
- **Hire Date** field - Optional date picker
- **Termination Date** field - Optional date picker (leave blank for active employees)

### 3. Resource Calendar Filtering
The Resource Calendar now automatically filters users based on:
- Only shows users who were employed during the visible week
- Historical data is preserved - you can still see allocations from former employees when viewing past weeks
- Future weeks won't show employees who haven't been hired yet

## How to Apply the Database Migration

**IMPORTANT**: You need to apply the SQL migration to your Supabase database before the new fields will work.

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of the file:
   ```
   supabase/migrations/20251116000000_add_employment_tracking_fields.sql
   ```
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
```bash
cd "E:\Visual Studio\survey-hub-app"
npx supabase db push --include-all
```
Note: This may require resolving conflicts with existing migrations.

## How to Use the Feature

### Setting Up Existing Users

#### For Active Employees:
1. Go to **User Admin** page
2. Edit a user
3. (Optional) Set their **Hire Date** if you know it
4. Leave **Termination Date** blank
5. Click **Save**

#### For Former Employees:
1. Go to **User Admin** page
2. Edit the user who has left
3. (Optional) Set their **Hire Date** if you know it
4. Set their **Termination Date** to the date they left
5. Click **Save**

### Adding New Users:
1. Go to **User Admin** page
2. Click **Add User**
3. Fill in the required fields
4. Set the **Hire Date** to when they started (or will start)
5. Leave **Termination Date** blank for new employees
6. Click **Save**

## How It Works

### Resource Calendar Behavior:
- When you view **any week** in the Resource Calendar, the system checks:
  - Did the user start on or before the end of that week?
  - Is the user still employed OR did they leave on or after the start of that week?

- If both conditions are true, the user appears in the calendar for that week

### Examples:

**Example 1: Former Employee**
- Hire Date: 2023-01-01
- Termination Date: 2024-12-31
- When viewing January 2025: ❌ User won't appear
- When viewing December 2024: ✅ User will appear
- When viewing their entire employment period: ✅ All historical allocations preserved

**Example 2: New Employee**
- Hire Date: 2025-02-01
- Termination Date: (blank - still employed)
- When viewing January 2025: ❌ User won't appear
- When viewing February 2025 onwards: ✅ User will appear

**Example 3: No Dates Set**
- Hire Date: (blank)
- Termination Date: (blank)
- Result: ✅ User appears in all weeks (default behavior for legacy users)

## Benefits

1. ✅ **Cleaner Calendar Views** - Only see relevant employees for the time period
2. ✅ **Historical Data Preserved** - All past allocations remain intact
3. ✅ **Accurate Planning** - New employees won't clutter historical views
4. ✅ **Automatic Status Updates** - Employment status automatically updates when termination date is set
5. ✅ **Flexible** - Dates are optional, so you can gradually add them as needed

## Troubleshooting

### Q: I applied the migration but don't see the new fields
**A:** Hard refresh your browser (Ctrl+Shift+R) to clear the cache.

### Q: A former employee still appears in current weeks
**A:** Make sure you've set their `termination_date` in the User Admin page.

### Q: A new employee appears in weeks before they were hired
**A:** Set their `hire_date` in the User Admin page.

### Q: Can I undo setting a termination date?
**A:** Yes! Simply edit the user and clear the termination date field.

### Q: What about the Analytics page?
**A:** The Analytics page uses the same user data, so employment filtering will automatically apply there as well.

## Migration Rollback

If you need to remove these fields, run this SQL:

```sql
-- Remove from users table
ALTER TABLE users DROP COLUMN IF EXISTS hire_date;
ALTER TABLE users DROP COLUMN IF EXISTS termination_date;
ALTER TABLE users DROP COLUMN IF EXISTS employment_status;

-- Remove from dummy_users table
ALTER TABLE dummy_users DROP COLUMN IF EXISTS hire_date;
ALTER TABLE dummy_users DROP COLUMN IF EXISTS termination_date;
ALTER TABLE dummy_users DROP COLUMN IF EXISTS employment_status;

-- Remove triggers
DROP TRIGGER IF EXISTS trigger_update_users_employment_status ON users;
DROP TRIGGER IF EXISTS trigger_update_dummy_users_employment_status ON dummy_users;

-- Remove function
DROP FUNCTION IF EXISTS update_employment_status();
```

## Support
If you encounter any issues, check the browser console for errors or contact support.
