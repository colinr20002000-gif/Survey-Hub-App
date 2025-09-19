# Firebase Cloud Messaging (FCM) Implementation Guide

## Overview

Your Survey Hub application has been successfully refactored to use Firebase Cloud Messaging (FCM) for push notifications instead of the previous client-side system. This provides a more robust, server-driven push notification system.

## What Was Changed

### 1. Firebase Integration
- **Added**: `src/firebaseConfig.js` - Firebase app initialization and messaging setup
- **Added**: `public/firebase-messaging-sw.js` - Service worker for handling background notifications
- **Installed**: Firebase SDK via npm

### 2. Database Changes
- **Created**: `create_push_subscriptions.sql` - SQL script to create the new database table
- **Table**: `push_subscriptions` with columns:
  - `id` (auto-incrementing primary key)
  - `user_id` (UUID, references auth.users)
  - `fcm_token` (text, unique FCM token)
  - `created_at`, `updated_at` (timestamps)
  - `is_active` (boolean)
  - `device_info` (JSONB for storing device metadata)

### 3. Backend/Edge Functions
- **Created**: `supabase/functions/send-fcm-notification/index.ts` - New Edge Function for sending FCM notifications
- **Uses**: Firebase Admin SDK to send notifications via Google's FCM service

### 4. Frontend Changes
- **Added**: `src/hooks/useFcm.js` - React hook for FCM management
- **Added**: `src/utils/fcmNotifications.js` - Utility functions for sending FCM notifications
- **Modified**: `SettingsPage` component to use new FCM controls
- **Modified**: `AnnouncementModal` to use FCM instead of old push system
- **Removed**: Old `usePushNotifications` hook

## Required Manual Steps

### 1. Database Table Creation
You need to manually execute the SQL script in Supabase Dashboard:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `create_push_subscriptions.sql`
3. Execute the script

### 2. Edge Function Deployment
Deploy the new FCM Edge Function:

```bash
npx supabase functions deploy send-fcm-notification
```

### 3. Environment Variables
Ensure these environment variables are set in your Supabase Edge Functions:

- `FIREBASE_PROJECT_ID` (already configured in the function)
- `FIREBASE_CLIENT_EMAIL` (already configured in the function)
- `FIREBASE_PRIVATE_KEY` (already configured in the function)

Note: The Firebase service account credentials are currently hardcoded in the Edge Function for simplicity, but for production you should move these to environment variables.

## How It Works

### User Flow
1. User visits Settings page
2. User toggles "Push Notifications" on
3. Browser requests notification permission
4. FCM token is generated and stored in `push_subscriptions` table
5. When announcements are created, FCM notifications are sent via the Edge Function

### Notification Flow
1. Admin creates announcement in `AnnouncementModal`
2. Announcement is saved to database
3. `send-fcm-notification` Edge Function is called
4. Function queries `push_subscriptions` for active tokens
5. Function sends FCM messages to all relevant users
6. Users receive notifications on their devices

## Key Features

### Enhanced Security
- Server-side token management
- Row Level Security (RLS) policies
- Firebase Admin SDK authentication

### Better Reliability
- FCM handles device registration and token refresh
- Automatic cleanup of invalid tokens
- Background message handling

### Improved UX
- Cleaner settings interface
- Better error handling and user feedback
- Support for targeting specific user roles

## Testing

1. Enable notifications in Settings page
2. Create a test announcement
3. Verify notification is received
4. Check browser console for FCM token logging
5. Check Supabase logs for Edge Function execution

## File Structure

```
src/
├── firebaseConfig.js           # Firebase app and messaging setup
├── hooks/
│   └── useFcm.js              # FCM React hook
├── utils/
│   └── fcmNotifications.js    # FCM utility functions
public/
└── firebase-messaging-sw.js   # Service worker for background notifications
supabase/
└── functions/
    └── send-fcm-notification/
        └── index.ts           # Edge Function for sending FCM messages
```

## Troubleshooting

### Common Issues
1. **Notifications not received**: Check browser notification permissions
2. **FCM token errors**: Verify Firebase configuration and VAPID key
3. **Edge Function errors**: Check Supabase logs and Firebase credentials
4. **Database errors**: Ensure `push_subscriptions` table exists and RLS policies are set

### Debug Steps
1. Check browser console for FCM logs
2. Verify notification permission is granted
3. Check Supabase Edge Function logs
4. Verify FCM token is saved in database
5. Test with Firebase Console (send test message)

## Migration Notes

The old push notification system has been completely replaced. Users will need to re-enable notifications in the Settings page to start receiving FCM notifications. The old `subscriptions` table and related Web Push code can be removed once you're satisfied with the FCM implementation.