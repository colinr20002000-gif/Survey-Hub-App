import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://cdn.skypack.dev/web-push';

console.log('Send notification function started');

// Define interfaces for type safety
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

interface SubscriptionRecord {
  id: number;
  user_id: string;
  subscription_object: PushSubscription;
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
    // --- 1. AUTHENTICATION & SETUP ---
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin access
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys are not configured in environment variables.');
    }

    const vapidDetails = {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: 'mailto:your-email@example.com', // Replace with your contact email
    };

    // --- 2. GET REQUEST DATA ---
    const { notification, targetRoles, excludeAuthorId } = await req.json() as {
      notification: NotificationPayload;
      targetRoles?: string[];
      excludeAuthorId?: string;
    };

    // --- 3. FETCH SUBSCRIPTIONS ---
    let query = supabaseClient
      .from('subscriptions')
      .select(`
        id,
        user_id,
        subscription_object,
        user:users(role)
      `);

    // --- 4. FILTER SUBSCRIPTIONS ---
    if (excludeAuthorId) {
      query = query.neq('user_id', excludeAuthorId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found to send to.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    let filteredSubscriptions = subscriptions;
    if (targetRoles && targetRoles.length > 0) {
      filteredSubscriptions = subscriptions.filter(s => 
        s.user && targetRoles.includes(s.user.role)
      );
    }

    // --- 5. SEND NOTIFICATIONS ---
    const notificationPromises = filteredSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription_object,
          JSON.stringify(notification),
          vapidDetails
        );
        return { status: 'success', endpoint: sub.subscription_object.endpoint };
      } catch (error) {
        console.error(`Failed to send to ${sub.subscription_object.endpoint}:`, error.message);
        // If subscription is expired or invalid, remove it from DB
        if ([404, 410].includes(error.statusCode)) {
          await supabaseClient.from('subscriptions').delete().eq('id', sub.id);
          console.log(`Removed expired subscription: ${sub.id}`);
          return { status: 'expired', endpoint: sub.subscription_object.endpoint };
        }
        return { status: 'failed', endpoint: sub.subscription_object.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const expiredCount = results.filter(r => r.status === 'expired').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    // --- 6. RETURN RESPONSE ---
    return new Response(JSON.stringify({
      message: 'Notification sending process completed.',
      sent: successCount,
      expired_and_removed: expiredCount,
      failed: failureCount,
      total_targeted: filteredSubscriptions.length,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (err) {
    console.error('Function error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});
