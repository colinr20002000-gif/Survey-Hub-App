# Announcements System Setup

This guide will help you set up the announcements and notifications system in your Survey Hub application.

## Database Setup

### 1. Run the Database Migration

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `setup-announcements-tables.sql`
4. Run the SQL script

This will create:
- `announcements` table for storing announcements
- `announcement_reads` table for tracking read/dismissed status
- Proper indexes for performance
- Row Level Security (RLS) policies
- Sample announcements (optional)

### 2. Verify Tables are Created

After running the SQL script, check that these tables exist:
- `announcements`
- `announcement_reads`

You can verify this in the Supabase Table Editor.

## Features

### Announcements System
- **Create announcements**: Users with appropriate privileges can create announcements
- **Target specific roles**: Announcements can be targeted to specific user privileges
- **Priority levels**: low, medium, high, urgent
- **Categories**: General, Safety, Equipment, etc.
- **Expiration dates**: Announcements can have expiration dates
- **Confirmation modals**: Custom confirmation popup for deletion (creation is direct)

### Notifications System
- **Real-time notifications**: Unread announcements appear in the notification bell
- **Mark as read**: Click notifications to mark them as read
- **Dismiss notifications**: Clear notifications from the notification center
- **Auto-refresh**: Notifications refresh every 5 minutes
- **Integration**: Clicking notifications navigates to the announcements page

## Troubleshooting

### "Mock announcements" in notification bell
This happens when:
1. The database tables haven't been created yet
2. There are no real announcements in the database
3. The user doesn't have access to view announcements

**Solution**: Run the SQL setup script to create tables and sample data.

### "Error when marking as read"
This can happen when:
1. The `announcement_reads` table doesn't exist
2. RLS policies are blocking the operation
3. The user ID doesn't match the auth.uid()

**Solution**:
1. Ensure the SQL setup script has been run
2. Check that the user is properly authenticated
3. Verify RLS policies are correctly configured

### No notifications appearing
Check:
1. Are there announcements in the database?
2. Is the user's privilege included in the announcement's target_roles?
3. Has the user already read/dismissed the announcements?
4. Are the announcements expired?

## Testing

After setup:
1. Create a new announcement using the "New Announcement" button
2. Check that the confirmation modal appears
3. Verify the announcement appears in the notifications bell
4. Click the notification to mark it as read
5. Verify it disappears from unread notifications

## Role-Based Visibility

Announcements are filtered based on:
- **target_roles**: Only users with matching privileges see the announcement
- **author exclusion**: Users don't see announcements they created
- **expiration**: Expired announcements are hidden
- **read/dismissed status**: Read or dismissed announcements don't appear in notifications

## Permissions

### Who can create announcements:
- Admin
- Site Staff
- Office Staff
- Project Managers
- Delivery Surveyors

### Who can edit/delete announcements:
- **Edit**: Only the author of the announcement
- **Delete**: The author of the announcement OR users with Admin privilege

### Who can see announcements:
- Users whose privilege matches the target_roles array
- Everyone (if target_roles is null/empty)
- Excludes the announcement author
- Excludes expired announcements