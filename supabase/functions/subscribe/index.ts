import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Hello from Functions!');

// Define the shape of the subscription object for TypeScript
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

Deno.serve(async (req) => {
  // This is needed to handle CORS preflight requests
  // from the browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // Be more specific in production!
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Create a Supabase client with the user's auth token.
    const supabaseClient = createClient(
      // Supabase API URL - env var is automatically set by Supabase
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var is automatically set by Supabase
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with auth header
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the subscription object and user info from the request body.
    const requestData = await req.json();
    const { user_id, user_agent, ip_address, ...subscription } = requestData;

    // Check if a subscription already exists for this user
    const { data: existingSubscriptions, error: checkError } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user_id);

    if (checkError && checkError.code !== 'PGRST116') { // Ignore table not found error
      console.error('Error checking existing subscriptions:', checkError);
    }

    // If user already has subscriptions, delete them first to avoid duplicates
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('subscriptions')
        .delete()
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('Error deleting old subscriptions:', deleteError);
      } else {
        console.log(`Deleted ${existingSubscriptions.length} old subscription(s) for user ${user_id}`);
      }
    }

    // Insert the new subscription object into the 'subscriptions' table.
    const { error } = await supabaseClient
      .from('subscriptions')
      .insert({
        subscription_object: subscription,
        user_id: user_id,
        user_agent: user_agent,
        ip_address: ip_address
      });

    if (error) {
      throw error;
    }

    // Return a success response.
    return new Response(JSON.stringify({ message: 'Subscription saved successfully.' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Be more specific in production!
      },
      status: 201,
    });
  } catch (err) {
    // Return an error response.
    return new Response(String(err?.message ?? err), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Be more specific in production!
      },
      status: 500,
    });
  }
});