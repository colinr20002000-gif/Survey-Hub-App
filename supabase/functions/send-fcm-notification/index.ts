import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Firebase Service Account credentials (these should be in environment variables)
const FIREBASE_PROJECT_ID = 'survey-hub-xyz';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@survey-hub-xyz.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDU/1yYR2Gp8G8E
pP4ulp39SnqCqc7HMN0gEy+SKE4N/OobwDOmcRcpKEAhV3hma5sJKyRCjSD/sVVo
wpz5gK59nP37wqyfgkXUwKQ59covNvF0gUbvLlxer2PiPV/+1NgssDcG0t/8du9W
H7IrkqV2MY2uoTBNSiMJEa1WhTG9qQmeE6gjQ+E9t0NFOaldPTo26Ur4zZjqmtHu
QpXo4hjpvy6Wc2vchBNDq/81ye+g6SWNjV9wsiOgU+GiR2hgFlRAgEJATgWTCQfJ
wtRHSqkk5ScUUUYxDU32nPzU00V6G7D+X0n3IMxk6Ct/KIWWoHe4/mq25/oVaZ9A
g4c7PTDpAgMBAAECggEARe6/6pmJNeAkuzwm3ooCPm8NMUhqhVkESSszc8P6+LnA
7bKZ4rx/07oM8EWFWO9cnFKHWbh3jKwfNEGtg3feEo0QkPAWeFqv7c4APa13IDBk
b5GghhhNKKNiYp4vHf6pKWcD8iAbfYtZQogumgLQg7F6aMswjjfYr/oXVPBvZ+r2
DrtDh/GMiDMMv5ewceZumxPOWLuQwP8ZobxkxdjTd3FMVptHXFgq1kUMhgm11XbH
4XJ7ry3s2EnmYCv3lkcVQp2nB+xaLGtUdFfBboFpcaIUt86DIeIcIrxUiL8G5cd+
BQYmIX5smXxOdFePVC1mYnAD3pTc12NwUBZ22ptCLwKBgQD3a1w4fNjz+QQBTr4Z
X76Ws9EXOig3Tgtg5+pEDBFLAXq9seMUQmuTKMURVLBxoCHzxqD9Z/UA5jpGpJHL
ZJ7HfBSK+MgPNOfxuOJHXN6fwuxAgK+XJMn6nGvRauuegbLzoxMFPdGCvvg7hqfZ
YnrtZdoeNNFZ5JvsWNDTPKKBHwKBgQDcYmWmqSKglNbkA5+8WSQYJCGjOM1yEht4
mvWw7M3u79rLrqTXdGkjWsMb4pV+RkxvH2rELc2zzMy2Fha+3mrwM9WBQkKXwdcl
YbLryyPTnkkJY7ZlzzWK19b8IghZqHj4UD/Q63xjo48VDYTe0WJuEI9OLz0jYQy1
4QtPEy3k9wKBgDlO+NFsuaPpLfBPmOCvuKmXhProUaBdx2zuyuhwEyFYemGt7ncm
21v+uYbGIwhumu6oN2n6xlkq+pyaSdret5hlOSznaw96pa7rsB3vePFwaOCX7hQI
RXBzAtZC+ciBKj4cq68vHnQ2X7EKA57qnKaYTOlqOoOj3CnmeJg1Fz7pAoGAThDw
7yN0p6txn52FBOQSvBZ4b+gcJm8xmfxSUdTgceY2+/WmYMfUwnhRKtyNlghy5N4d
JNcQycMfNNUIQ55oBSRnWf1Nt5IrkwtTpOD1lO2584CFyPSog8FHX1Ly4EekalmK
8YepLWZvtcZvLbrAAjsNeGWVY6XqKbdJGT6zACsCgYAqzhjlS8iEYdF0j+9HArPn
AN5smc5XvLHnbwzAWSJ5B5oD5bW6+lDRdXOS7vJe2coFhuMifD/s4n1fELfvdLxB
tjMEqOmWRkitv1FK/6KNxEhiJf33u/RyJ5Nf70otGDrsYhvR9XkCV+sy7K4bOwgs
CYR1IOS2YEFN0s7SiwI4Gg==
-----END PRIVATE KEY-----`;

// Helper function to create Firebase access token
async function getFirebaseAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // Token expires in 1 hour

  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp
  };

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  // Encode header and payload using base64url encoding
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import the private key - convert PEM to binary format
  const pemContent = FIREBASE_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const privateKeyBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error('❌ Access token request failed:', tokenResponse.status, tokenData);
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  console.log('✅ Access token obtained successfully');
  return tokenData.access_token;
}

// Helper function to validate active user sessions
async function getActiveUserSessions(supabaseClient: any, userIds: string[]): Promise<string[]> {
  try {
    // Get sessions for users that have been active in the last 24 hours
    // This helps ensure we only send to users who are currently logged in
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: activeSessions, error } = await supabaseClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error('[DEBUG] Error fetching user sessions:', error);
      // Fallback: return all user IDs if we can't check sessions
      return userIds;
    }

    // Filter for users who have signed in recently
    const activeUserIds = activeSessions.users
      .filter(user => {
        const lastSignIn = user.last_sign_in_at;
        return lastSignIn && new Date(lastSignIn) > new Date(twentyFourHoursAgo);
      })
      .map(user => user.id)
      .filter(id => userIds.includes(id));

    console.log(`[DEBUG] Found ${activeUserIds.length} active users out of ${userIds.length} total users`);
    return activeUserIds;
  } catch (error) {
    console.error('[DEBUG] Error validating user sessions:', error);
    // Fallback: return all user IDs if session check fails
    return userIds;
  }
}

// Helper function to send FCM message
async function sendFCMMessage(accessToken: string, fcmTokens: string[], notification: any, data: any = {}) {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

  const results = [];

  for (const token of fcmTokens) {
    try {
      const message = {
        message: {
          token: token,
          // FCM API v1 notification payload - only title and body allowed here
          notification: {
            title: notification.title,
            body: notification.body
          },
          // Data payload for service worker to access all notification details
          data: {
            ...data,
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/android-chrome-192x192.png',
            badge: notification.badge || '/favicon-32x32.png',
            tag: notification.tag || 'survey-hub-notification',
            url: data.url || '/',
            type: data.type || 'announcement',
            priority: data.priority || 'medium',
            sound: 'default'
          },
          // WebPush-specific configuration with full notification customization
          webpush: {
            headers: {
              TTL: '86400',
              Urgency: data.priority === 'urgent' ? 'high' : 'normal'
            },
            notification: {
              title: notification.title,
              body: notification.body,
              icon: notification.icon || '/android-chrome-192x192.png',
              badge: notification.badge || '/favicon-32x32.png',
              tag: notification.tag || 'survey-hub-notification',
              requireInteraction: data.priority === 'urgent',
              vibrate: [200, 100, 200],
              actions: [
                {
                  action: 'view',
                  title: 'View'
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss'
                }
              ],
              data: {
                url: data.url || '/',
                type: data.type || 'announcement'
              }
            },
            fcm_options: {
              link: data.url || '/'
            }
          }
        }
      };

      // Enhanced logging for debugging
      console.log(`📤 [FCM API] Sending to: ${fcmUrl}`);
      console.log(`📤 [FCM API] Token: ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
      console.log(`📤 [FCM API] Message payload:`, JSON.stringify(message, null, 2));

      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      const responseData = await response.json();

      console.log(`📥 [FCM API] Response status: ${response.status} ${response.statusText}`);
      console.log(`📥 [FCM API] Response data:`, JSON.stringify(responseData, null, 2));

      if (response.ok) {
        console.log(`✅ FCM message sent successfully to token: ${token.substring(0, 20)}...`);
        console.log(`✅ FCM Message ID: ${responseData.name}`);
        results.push({ token, status: 'success', messageId: responseData.name });
      } else {
        console.error(`❌ FCM message failed for token ${token.substring(0, 20)}...:`, responseData);
        console.error(`❌ Full error response:`, JSON.stringify(responseData, null, 2));
        console.error(`❌ HTTP status:`, response.status);
        results.push({ token, status: 'failed', error: responseData.error?.message || 'Unknown error' });
      }
    } catch (error) {
      console.error(`❌ Error sending FCM message to token ${token.substring(0, 20)}...:`, error);
      results.push({ token, status: 'failed', error: error.message });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] --- send-fcm-notification function invoked ---');

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
    console.log('[DEBUG] Step 1: Initializing Supabase client.');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request has proper authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // --- 2. GET REQUEST DATA ---
    console.log('[DEBUG] Step 2: Parsing request body.');
    const { notification, targetRoles, targetUserIds, excludeAuthorId } = await req.json();
    console.log(`[DEBUG] Notification payload received:`, notification);
    console.log(`[DEBUG] Target roles:`, targetRoles);
    console.log(`[DEBUG] Target user IDs:`, targetUserIds);
    console.log(`[DEBUG] Exclude author:`, excludeAuthorId);

    // --- 3. FETCH FCM TOKENS ---
    console.log('[DEBUG] Step 3: Fetching FCM tokens from push_subscriptions table.');

    // Get FCM tokens for active subscriptions
    let query = supabaseClient
      .from('push_subscriptions')
      .select('fcm_token, user_id')
      .eq('is_active', true);

    if (excludeAuthorId) {
      console.log(`[DEBUG] Excluding author ID: ${excludeAuthorId}`);
      query = query.neq('user_id', excludeAuthorId);
    }

    // If specific user IDs are targeted, filter by those
    if (targetUserIds && targetUserIds.length > 0) {
      console.log(`[DEBUG] Filtering by target user IDs: ${targetUserIds.join(', ')}`);
      query = query.in('user_id', targetUserIds);
    }
    // Otherwise, if specific roles are targeted, filter by user roles
    else if (targetRoles && targetRoles.length > 0) {
      console.log(`[DEBUG] ============================================`);
      console.log(`[DEBUG] FILTERING BY TARGET DEPARTMENTS`);
      console.log(`[DEBUG] Target departments received:`, targetRoles);
      console.log(`[DEBUG] Target departments type:`, typeof targetRoles);
      console.log(`[DEBUG] Target departments isArray:`, Array.isArray(targetRoles));
      console.log(`[DEBUG] Target departments length:`, targetRoles.length);
      console.log(`[DEBUG] ============================================`);

      // Query the users table to get users whose department matches targetRoles
      // Note: targetRoles contains department names, not privilege levels
      const { data: matchingUsers, error: usersError } = await supabaseClient
        .from('users')
        .select('id, name, email, department, privilege')
        .in('department', targetRoles);

      if (usersError) {
        console.error('[DEBUG] Error fetching users from users table:', usersError);
        throw usersError;
      }

      console.log(`[DEBUG] Query returned ${matchingUsers?.length || 0} matching users`);
      console.log(`[DEBUG] Matching users:`, matchingUsers?.map(u => ({
        name: u.name,
        email: u.email,
        department: u.department,
        privilege: u.privilege
      })));

      const targetUserIds = matchingUsers?.map(user => user.id) || [];

      if (targetUserIds.length > 0) {
        console.log(`[DEBUG] Found ${targetUserIds.length} users with target roles - will send to these user IDs:`, targetUserIds);
        query = query.in('user_id', targetUserIds);
      } else {
        console.log('[DEBUG] No users found with target roles. Sending to no one.');
        return new Response(JSON.stringify({
          message: 'No users found with target roles.',
          sent: 0
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          status: 200,
        });
      }
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[DEBUG] ERROR fetching FCM tokens:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[DEBUG] No FCM tokens found to send to. Exiting gracefully.');
      return new Response(JSON.stringify({
        message: 'No FCM subscriptions found.',
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    console.log(`[DEBUG] Found ${subscriptions.length} FCM tokens to process.`);

    // --- 3.5. VALIDATE ACTIVE USER SESSIONS ---
    console.log('[DEBUG] Step 3.5: Validating active user sessions.');
    const userIds = subscriptions.map(sub => sub.user_id);

    // Skip active session validation for announcements AND task assignments
    // Push notifications should go to all subscribed users regardless of recent login
    const notificationType = notification.data?.type || 'announcement';
    const isTaskNotification = notificationType === 'delivery_task_assignment' || notificationType === 'project_task_assignment';
    const isAnnouncement = notificationType === 'announcement';

    console.log(`[DEBUG] Notification type: ${notificationType}`);
    console.log(`[DEBUG] Is task notification: ${isTaskNotification}`);
    console.log(`[DEBUG] Is announcement: ${isAnnouncement}`);
    console.log(`[DEBUG] Full notification data:`, notification.data);

    let activeSubscriptions;
    if (isTaskNotification || isAnnouncement) {
      console.log('[DEBUG] Task/Announcement notification - skipping active session validation');
      activeSubscriptions = subscriptions;
    } else {
      console.log('[DEBUG] Other notification type - applying active session validation');
      const activeUserIds = await getActiveUserSessions(supabaseClient, userIds);
      activeSubscriptions = subscriptions.filter(sub => activeUserIds.includes(sub.user_id));
    }

    if (activeSubscriptions.length === 0) {
      console.log('[DEBUG] No active users found. Exiting gracefully.');
      return new Response(JSON.stringify({
        message: 'No active users to send notifications to.',
        sent: 0,
        totalSubscriptions: subscriptions.length,
        notificationsSent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }

    console.log(`[DEBUG] Sending to ${activeSubscriptions.length} active users out of ${subscriptions.length} total subscriptions.`);

    // --- 4. GET FIREBASE ACCESS TOKEN ---
    console.log('[DEBUG] Step 4: Getting Firebase access token.');
    const accessToken = await getFirebaseAccessToken();
    console.log('[DEBUG] Firebase access token obtained successfully.');

    // --- 5. SEND FCM NOTIFICATIONS ---
    console.log('[DEBUG] Step 5: Sending FCM notifications.');
    const fcmTokens = activeSubscriptions.map(sub => sub.fcm_token);

    const results = await sendFCMMessage(accessToken, fcmTokens, notification, {
      type: notification.data?.type || 'announcement',
      priority: notification.priority || 'medium',
      url: notification.data?.url || '/announcements',
      announcementId: notification.data?.announcementId,
      ...notification.data
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const failedTokens = results.filter(r => r.status === 'failed');

    // Clean up failed tokens that are invalid
    for (const failed of failedTokens) {
      if (
        failed.error?.includes('INVALID_ARGUMENT') ||
        failed.error?.includes('UNREGISTERED') ||
        failed.error?.includes('Requested entity was not found') ||
        failed.error?.includes('NOT_FOUND')
      ) {
        console.log(`[DEBUG] 🗑️ Removing invalid FCM token: ${failed.token.substring(0, 20)}...`);
        console.log(`[DEBUG] Reason: ${failed.error}`);
        await supabaseClient
          .from('push_subscriptions')
          .delete()
          .eq('fcm_token', failed.token);
      }
    }

    // Calculate unique users who received notifications
    const successfulResults = results.filter(r => r.status === 'success');
    const notifiedUserIds = new Set();

    // Map successful tokens back to user IDs
    successfulResults.forEach(result => {
      const subscription = activeSubscriptions.find(sub => sub.fcm_token === result.token);
      if (subscription) {
        notifiedUserIds.add(subscription.user_id);
      }
    });

    const uniqueUsersNotified = notifiedUserIds.size;

    console.log(`[DEBUG] --- Process complete. ${successCount} FCM notifications sent to ${uniqueUsersNotified} unique users. ---`);

    // --- 6. RETURN RESPONSE ---
    return new Response(JSON.stringify({
      message: 'FCM notification process completed.',
      sent: uniqueUsersNotified,
      totalSubscriptions: subscriptions.length,
      notificationsSent: successCount,
      results: results
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (err) {
    console.error('[DEBUG] !!! A top-level error occurred in send-fcm-notification function !!!');
    console.error(`[DEBUG] Error: ${err.message}`);
    console.error(`[DEBUG] Stack: ${err.stack}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});