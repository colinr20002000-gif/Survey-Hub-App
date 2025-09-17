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

    // Create client with service role key but pass the user's JWT for verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user's JWT token manually
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('User not found:', userError);
      throw new Error(userError?.message || 'User not found');
    }

    const subscription = await req.json();
    const userAgent = req.headers.get('user-agent');
    const ipAddress = req.headers.get('x-forwarded-for'); // Standard header for client IP in Supabase

    const { error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert({
        subscription_object: subscription,
        user_id: user.id,
        user_agent: userAgent,
        ip_address: ipAddress
      });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
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