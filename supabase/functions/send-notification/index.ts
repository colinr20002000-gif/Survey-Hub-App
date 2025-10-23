import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from 'https://deno.land/std@0.192.0/encoding/base64url.ts';

// Helper function to create VAPID JWT
async function createVapidJWT(audience, privateKey, publicKey) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    sub: 'mailto:your-email@example.com' // IMPORTANT: Change this to your email
  };

  const encodedHeader = encode(JSON.stringify(header));
  const encodedPayload = encode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  let keyData;
  try {
    const base64 = privateKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
    keyData = Uint8Array.from(atob(paddedBase64), c => c.charCodeAt(0));
  } catch (decodeError) {
    console.error('[DEBUG] VAPID private key decoding failed:', decodeError);
    throw new Error(`Private key decoding failed: ${decodeError.message}`);
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );
    return `${unsignedToken}.${encode(new Uint8Array(signature))}`;
  } catch (jwtError) {
    console.error('[DEBUG] VAPID JWT creation failed:', jwtError);
    throw new Error(`VAPID JWT creation failed: ${jwtError.message}`);
  }
}

Deno.serve(async (req) => {
  console.log('[DEBUG] --- send-notification function invoked ---');
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Responding to OPTIONS preflight request.');
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
    console.log('[DEBUG] Step 1: Initializing clients and getting VAPID keys.');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[DEBUG] ERROR: VAPID keys are not configured in environment variables.');
      throw new Error('VAPID keys are not configured in environment variables.');
    }
    console.log('[DEBUG] VAPID keys found.');

    // --- 2. GET REQUEST DATA ---
    console.log('[DEBUG] Step 2: Parsing request body.');
    const { notification, targetRoles, excludeAuthorId } = await req.json();
    console.log(`[DEBUG] Notification payload received: ${JSON.stringify(notification)}`);

    // --- 3. FETCH SUBSCRIPTIONS ---
    console.log('[DEBUG] Step 3: Fetching subscriptions from database.');
    console.log(`[DEBUG] Target roles: ${JSON.stringify(targetRoles)}`);

    let query;

    if (targetRoles && targetRoles.length > 0) {
      // When targetRoles are specified, we need to filter by user departments
      console.log('[DEBUG] Filtering subscriptions by target roles/departments.');
      query = supabaseClient
        .from('subscriptions')
        .select(`
          id,
          user_id,
          subscription_object,
          users!inner(department, privilege, email)
        `);

      // Build the OR condition for department and privilege matching
      const conditions = [];

      // Add department matching for each target role
      targetRoles.forEach(role => {
        conditions.push(`users.department.eq.${role}`);
      });

      // Add privilege matching for backwards compatibility
      targetRoles.forEach(role => {
        conditions.push(`users.privilege.eq.${role}`);
      });

      // Add super admin condition if needed
      if (targetRoles.length > 0) {
        conditions.push('users.email.eq.colin.rogers@inorail.co.uk');
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }

      console.log(`[DEBUG] Applied OR conditions: ${conditions.join(', ')}`);
    } else {
      // No target roles - send to all users
      console.log('[DEBUG] No target roles specified - fetching all subscriptions.');
      query = supabaseClient.from('subscriptions').select('id, user_id, subscription_object');
    }

    if (excludeAuthorId) {
      console.log(`[DEBUG] Excluding author ID: ${excludeAuthorId}`);
      query = query.neq('user_id', excludeAuthorId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[DEBUG] ERROR fetching subscriptions:', fetchError);
      throw fetchError;
    }
    if (!subscriptions || subscriptions.length === 0) {
      console.log('[DEBUG] No subscriptions found to send to. Exiting gracefully.');
      return new Response(JSON.stringify({ message: 'No subscriptions found.', sent: 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }
    console.log(`[DEBUG] Found ${subscriptions.length} subscriptions to process.`);

    // --- 4. SEND PUSH NOTIFICATIONS ---
    console.log('[DEBUG] Step 4: Processing and sending notifications.');
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const endpoint = sub.subscription_object.endpoint;
        const payload = JSON.stringify(notification);
        console.log(`[DEBUG] Preparing to send to endpoint: ${endpoint}`);

        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.host}`;
        
        console.log(`[DEBUG] Creating VAPID JWT for audience: ${audience}`);
        const vapidJWT = await createVapidJWT(audience, vapidPrivateKey, vapidPublicKey);

        const headers = {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400',
          'Authorization': `vapid t=${vapidJWT}, k=${vapidPublicKey}`,
        };
        console.log(`[DEBUG] Sending with headers: ${JSON.stringify(headers)}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: payload,
        });

        const responseText = await response.text();
        console.log(`[DEBUG] Push service response for ${sub.id}: Status=${response.status}, Body=${responseText}`);

        if (response.ok || response.status === 201) {
          console.log(`[DEBUG] ✅ Push sent successfully to subscription ID: ${sub.id}`);
          return { status: 'success', id: sub.id };
        } else if (response.status === 404 || response.status === 410) {
          console.log(`[DEBUG] 🗑️ Subscription expired (ID: ${sub.id}). Deleting from DB.`);
          await supabaseClient.from('subscriptions').delete().eq('id', sub.id);
          return { status: 'expired', id: sub.id };
        } else {
          console.error(`[DEBUG] ❌ Push failed for subscription ID ${sub.id} with status ${response.status}.`);
          return { status: 'failed', id: sub.id, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        console.error(`[DEBUG] ❌ CRITICAL ERROR sending to subscription ID ${sub.id}:`, error.message);
        return { status: 'failed', id: sub.id, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter((r) => r.status === 'success').length;
    console.log(`[DEBUG] --- Process complete. ${successCount} notifications sent successfully. ---`);

    // --- 5. RETURN RESPONSE ---
    return new Response(JSON.stringify({
        message: 'Notification process completed.',
        sent: successCount,
        total: subscriptions.length,
        results,
      }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (err) {
    console.error('[DEBUG] !!! A top-level error occurred in send-notification function !!!');
    console.error(`[DEBUG] Error: ${err.message}`);
    console.error(`[DEBUG] Stack: ${err.stack}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});