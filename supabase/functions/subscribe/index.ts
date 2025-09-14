import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Subscribe function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Use the SERVICE_ROLE_KEY for admin-level access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { subscription, user_id } = await req.json();

    if (!subscription || !user_id) {
      throw new Error('Missing subscription object or user_id in request body');
    }

    // Insert the subscription with the provided user_id
    const { error } = await supabaseClient
      .from('subscriptions')
      .insert({ 
        subscription_object: subscription,
        user_id: user_id
      });

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Subscription saved successfully.' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 201,
    });

  } catch (err) {
    console.error('Function error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});