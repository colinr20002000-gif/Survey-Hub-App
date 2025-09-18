import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Hello from Subscribe function!');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header received:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      throw new Error('Auth session missing!');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('User not found:', userError);
      throw new Error(userError?.message || 'User not found');
    }

    const subscription = await req.json();
    const userAgent = req.headers.get('user-agent');
    const ipAddress = req.headers.get('x-forwarded-for');

    // Check if this endpoint is already subscribed for this user
    const { data: existingSub, error: existingSubError } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('subscription_object->>endpoint', subscription.endpoint)
      .maybeSingle();

    if (existingSubError && existingSubError.code !== 'PGRST116') { // PGRST116 = single row not found
      console.error('Error checking for existing subscription:', existingSubError);
      throw existingSubError;
    }

    if (existingSub) {
      console.log('Subscription already exists for this user and endpoint. Skipping insert.');
      return new Response(JSON.stringify({
        message: 'Subscription already exists.'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200 // 200 OK instead of 201 Created
      });
    }

    // No existing subscription found, so insert it
    console.log('New subscription, inserting into database...');
    const { error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert({
        subscription_object: subscription,
        user_id: user.id,
        user_agent: userAgent,
        ip_address: ipAddress
      });

    if (insertError) {
      console.error('Error inserting new subscription:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({
      message: 'Subscription saved successfully.'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 201
    });

  } catch (err) {
    console.error('An unexpected error occurred:', err);
    return new Response(String(err?.message ?? err), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500
    });
  }
});