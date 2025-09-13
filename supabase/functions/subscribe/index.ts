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

    // Get the subscription object from the request body.
    const subscription = (await req.json()) as PushSubscription;

    // Insert the subscription object into the 'subscriptions' table.
    const { error } = await supabaseClient
      .from('subscriptions')
      .insert({ subscription_object: subscription });

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