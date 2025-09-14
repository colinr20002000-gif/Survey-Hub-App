import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Hello from Subscribe function!');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    // Create client with service role key for auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User not found:', userError);
      throw new Error(userError?.message || 'User not found');
    }

    const subscription = await req.json();

    const { error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert({
        subscription_object: subscription,
        user_id: user.id
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