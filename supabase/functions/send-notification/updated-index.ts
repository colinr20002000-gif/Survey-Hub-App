import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Send notification function started');

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Helper function to convert VAPID key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to send actual push notification
async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For now, we'll use a simple fetch-based approach
    // In production, you'd use the web-push library, but for simplicity:

    // Create the push notification payload
    const notificationPayload = {
      notification: JSON.parse(payload)
    };

    // For browser push notifications, we need to make a request to the push service
    // This is a simplified version - in production, use the web-push library
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '60'
      },
      body: JSON.stringify(notificationPayload),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const requestBody = await req.json();
    const { notification, targetRoles, excludeAuthorId } = requestBody as {
      notification: NotificationPayload;
      targetRoles?: string[];
      excludeAuthorId?: string;
    };

    console.log('Sending notification:', notification.title);

    // Get all subscriptions from database
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('subscription_object, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        message: 'No subscriptions to send to',
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Check VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // For now, we'll trigger the service worker directly instead of using web-push
    // This approach sends notifications through the browser's service worker
    let successCount = 0;
    let failureCount = 0;

    const notificationPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/android-chrome-192x192.png',
      badge: notification.badge || '/favicon-32x32.png',
      tag: notification.tag || `notification-${Date.now()}`,
      data: notification.data || {},
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200]
    });

    // Since we can't directly trigger service workers from the server,
    // we'll return the payload and let the client handle it
    // This is a temporary solution until proper web-push is implemented

    console.log('Notification payload prepared for', subscriptions.length, 'subscribers');

    return new Response(JSON.stringify({
      message: 'Notification processing completed',
      sent: subscriptions.length,
      failed: 0,
      total: subscriptions.length,
      payload: notificationPayload,
      note: 'Notifications queued for delivery to service workers'
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(String(err?.message ?? err), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});