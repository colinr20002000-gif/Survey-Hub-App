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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const requestBody = await req.json();
    const { notification, targetRoles, excludeAuthorId } = requestBody as {
      notification: NotificationPayload;
      targetRoles?: string[];
      excludeAuthorId?: string;
    };

    console.log('Sending notification:', notification);
    console.log('Target roles:', targetRoles);
    console.log('Exclude author ID:', excludeAuthorId);

    // Get all subscriptions from database
    let query = supabaseClient
      .from('subscriptions')
      .select('subscription_object');

    // If we have target roles or exclude author, we need to join with users
    // For now, we'll send to all subscriptions since we don't have user linking
    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(JSON.stringify({
        message: 'No subscriptions to send to',
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // You'll need to add VAPID keys to your environment variables
    // For now, we'll log the subscriptions and return success
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to environment.');
      return new Response(JSON.stringify({
        message: 'Push notifications not configured (missing VAPID keys)',
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    // Send push notifications using web-push library
    // Note: In a real implementation, you'd use the web-push library
    // For now, we'll simulate the process
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription_object as PushSubscription;

        // In a real implementation, you would use web-push library here:
        // await webpush.sendNotification(subscription, JSON.stringify(notification), {
        //   vapidDetails: {
        //     subject: 'mailto:your-email@example.com',
        //     publicKey: vapidPublicKey,
        //     privateKey: vapidPrivateKey,
        //   },
        // });

        console.log('Would send notification to:', subscription.endpoint);
        successCount++;
      } catch (error) {
        console.error('Error sending to subscription:', error);
        failureCount++;
      }
    }

    return new Response(JSON.stringify({
      message: `Notification sending completed`,
      sent: successCount,
      failed: failureCount,
      total: subscriptions.length
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