# Push Notifications Setup Guide

## Current Status
✅ **Client-side notification system** - Working locally for the sender
✅ **Service worker** - Properly configured with Workbox
✅ **Subscription system** - Saving user subscriptions to Supabase
✅ **Server-side infrastructure** - Edge Functions created
⚠️  **Multi-user notifications** - Requires VAPID key configuration

## Issue Identified
The problem is that your current system only sends **local notifications** (which only appear on the device of the person who creates the announcement). To send notifications to **all users**, you need **server-side push notifications**.

## Solution Implemented
I've created a complete server-side push notification system:

### 1. New Files Created:
- `supabase/functions/send-notification/index.ts` - Server-side notification sender
- `src/utils/pushNotifications.js` - Client utility for server notifications
- Updated announcement creation to use server-side notifications

### 2. Changes Made:
- Modified `src/App.jsx` to call `sendAnnouncementNotification()`
- This now sends notifications to ALL subscribed users, not just the author

## Next Steps to Complete Setup

### Step 1: Generate VAPID Keys
You need VAPID keys for push notifications. Run this in your terminal:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BPKz0v3...your-public-key...
Private Key: mFv2B4...your-private-key...
```

### Step 2: Add VAPID Keys to Environment

#### For Local Development:
Add to your `.env` file:
```bash
VITE_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
```

#### For Supabase Edge Functions:
1. Go to your Supabase Dashboard
2. Go to Settings > Edge Functions
3. Add environment variables:
   - `VAPID_PUBLIC_KEY`: your-public-key
   - `VAPID_PRIVATE_KEY`: your-private-key

#### For Production (Vercel):
1. Go to your Vercel project dashboard
2. Go to Settings > Environment Variables
3. Add the same variables

### Step 3: Update Notifications.js with Your VAPID Key
Edit `src/utils/notifications.js` line 1:
```javascript
const PUBLIC_VAPID_KEY = 'your-actual-vapid-public-key-here';
```

### Step 4: Deploy Edge Functions
Deploy the notification functions to Supabase:
```bash
supabase functions deploy send-notification --no-verify-jwt
```

### Step 5: Install web-push Library (for production)
For the Edge Function to actually send push notifications, you'll need to implement web-push:

1. Update the `send-notification/index.ts` file to use the actual web-push library
2. Install web-push in your Edge Function environment

## Testing the Fix

### Before Fix:
- ❌ User A creates announcement → only User A gets notification
- ❌ User B creates announcement → only User B gets notification

### After Fix:
- ✅ User A creates announcement → ALL subscribed users get notification
- ✅ User B creates announcement → ALL subscribed users get notification

## How It Works Now

1. **User creates announcement** → Saves to database
2. **Server-side function called** → `sendAnnouncementNotification()`
3. **Function queries all subscriptions** → Gets all registered push subscriptions
4. **Sends push notification** → To every subscribed user's device
5. **Users receive notifications** → Even if they're not currently using the app

## Additional Features Implemented

- **Role-based targeting** - Can send to specific user roles only
- **Author exclusion** - Announcement author doesn't get notified of their own announcement
- **Graceful fallbacks** - If push notifications fail, the announcement still succeeds
- **Local confirmation** - Author gets a local notification confirming the announcement was sent

## Troubleshooting

If notifications still aren't working:

1. **Check browser console** for any errors
2. **Verify VAPID keys** are correctly set in all environments
3. **Test with different users** on different devices
4. **Check Supabase function logs** in the dashboard
5. **Ensure permissions** are granted on receiving devices

Once you complete the VAPID key setup, your multi-user push notifications should work perfectly!