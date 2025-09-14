import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://cdn.skypack.dev/web-push';

console.log('Send notification function started');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys are not configured in environment variables.');
    }

    const vapidDetails = {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: 'mailto:your-email@example.com',
    };

    const { notification, targetRoles, excludeAuthorId } = await req.json();

    let query = supabaseClient.from('subscriptions').select(`id, user_id, subscription_object, user:users(role)`);

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
      filteredSubscriptions = subscriptions.filter(s => s.user && targetRoles.includes(s.user.role));
    }

    const notificationPromises = filteredSubscriptions.map(sub => 
      webpush.sendNotification(sub.subscription_object, JSON.stringify(notification), vapidDetails)
        .catch(async (error) => {
          console.error(`Failed to send to ${sub.subscription_object.endpoint}:`, error.message);
          if ([404, 410].includes(error.statusCode)) {
            console.log(`Removing expired subscription: ${sub.id}`);
            await supabaseClient.from('subscriptions').delete().eq('id', sub.id);
          }
        })
    );

    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ message: 'Notifications sent.', sent: filteredSubscriptions.length }), {
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