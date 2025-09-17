import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from 'https://deno.land/std@0.192.0/encoding/base64url.ts';

console.log('Send notification function started');

// Helper function to create VAPID JWT
async function createVapidJWT(audience: string, privateKey: string, publicKey: string) {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12 hours
    sub: 'mailto:example@yourdomain.com' // Change this to your email
  };

  const encodedHeader = encode(JSON.stringify(header));
  const encodedPayload = encode(JSON.stringify(payload));

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Convert base64url private key to Uint8Array for PKCS8 format
  // VAPID private key should be in PKCS8 format encoded as base64url
  let keyData: Uint8Array;
  try {
    // Decode base64url to binary for PKCS8 format
    const base64 = privateKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
    keyData = Uint8Array.from(atob(paddedBase64), c => c.charCodeAt(0));
  } catch (decodeError) {
    console.error('Error decoding private key:', decodeError);
    throw new Error(`Private key decoding failed: ${decodeError.message}`);
  }

  try {
    // Import the private key for signing using PKCS8 format
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = encode(new Uint8Array(signature));
    return `${unsignedToken}.${encodedSignature}`;
  } catch (error) {
    console.error('Error creating VAPID JWT:', error);
    throw new Error(`VAPID JWT creation failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    // --- 1. AUTHENTICATION & SETUP ---
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys are not configured in environment variables.');
    }

    // --- 2. GET REQUEST DATA ---
    const { notification, targetRoles, excludeAuthorId } = await req.json();

    // --- 3. FETCH SUBSCRIPTIONS ---
    let query = supabaseClient.from('subscriptions').select(`
        id,
        user_id,
        subscription_object
      `);

    // --- 4. FILTER SUBSCRIPTIONS ---
    if (excludeAuthorId) {
      query = query.neq('user_id', excludeAuthorId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        message: 'No subscriptions found to send to.',
        sent: 0,
        total_targeted: 0
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      });
    }

    // --- 5. SEND ACTUAL PUSH NOTIFICATIONS ---
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const endpoint = sub.subscription_object.endpoint;
        const payload = JSON.stringify(notification);

        console.log(`Sending push notification to: ${endpoint}`);

        // Create proper Web Push headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400'
        };

        // Extract audience from endpoint for VAPID
        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.host}`;

        // Create proper VAPID JWT
        const vapidJWT = await createVapidJWT(audience, vapidPrivateKey, vapidPublicKey);

        // Set proper VAPID headers
        headers['Authorization'] = `vapid t=${vapidJWT}, k=${vapidPublicKey}`;
        headers['Crypto-Key'] = `p256ecdsa=${vapidPublicKey}`;

        console.log(`Sending to ${endpoint} with audience ${audience}`);
        console.log(`Headers:`, JSON.stringify(headers));

        // Send actual HTTP request to push service
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: payload
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}, body: ${responseText}`);

        if (response.ok || response.status === 201) {
          console.log(`✅ Push sent successfully to ${endpoint}`);
          return {
            status: 'success',
            endpoint: endpoint
          };
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired
          await supabaseClient.from('subscriptions').delete().eq('id', sub.id);
          console.log(`🗑️ Removed expired subscription: ${sub.id}`);
          return {
            status: 'expired',
            endpoint: endpoint
          };
        } else {
          console.error(`❌ Push failed with status ${response.status} for ${endpoint}`);
          return {
            status: 'failed',
            endpoint: endpoint,
            error: `HTTP ${response.status}`
          };
        }

      } catch (error) {
        console.error(`❌ Error sending to ${sub.subscription_object.endpoint}:`, error.message);
        return {
          status: 'failed',
          endpoint: sub.subscription_object.endpoint,
          error: error.message
        };
      }
    });

    const results = await Promise.all(notificationPromises);

    const successCount = results.filter(r => r.status === 'success').length;
    const expiredCount = results.filter(r => r.status === 'expired').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    // --- 7. RETURN RESPONSE ---
    return new Response(JSON.stringify({
      message: 'Notification sending process completed.',
      sent: successCount,
      expired_and_removed: expiredCount,
      failed: failureCount,
      total_targeted: subscriptions.length,
      detailed_results: results.map(r => ({
        status: r.status,
        endpoint: r.endpoint?.substring(0, 50) + '...',
        error: r.error
      }))
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 200
    });

  } catch (err) {
    console.error('Function error:', err.message);
    return new Response(JSON.stringify({
      error: err.message,
      stack: err.stack
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500
    });
  }
});