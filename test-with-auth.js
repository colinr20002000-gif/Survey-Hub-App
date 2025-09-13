// Test script with proper authentication
const SUPABASE_URL = 'https://okldykkmgmcjhgzysris.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTAzMzgsImV4cCI6MjA3MjE2NjMzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';

async function testWithAuth() {
  console.log('🧪 Testing Edge Functions with proper auth\n');

  // Test 1: Subscribe function
  console.log('1️⃣ Testing subscribe function with auth...');
  try {
    const subscribeResponse = await fetch(`${SUPABASE_URL}/functions/v1/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        endpoint: 'https://test-endpoint-' + Date.now() + '.example.com',
        keys: {
          p256dh: 'test-p256dh-key-' + Date.now(),
          auth: 'test-auth-key-' + Date.now()
        }
      }),
    });

    console.log('   Status:', subscribeResponse.status);
    const subscribeResult = await subscribeResponse.text();
    console.log('   Response:', subscribeResult);

    if (subscribeResponse.status === 201 || subscribeResponse.status === 200) {
      console.log('   ✅ Subscribe function working!\n');
    } else {
      console.log('   ❌ Subscribe function has issues\n');
    }
  } catch (error) {
    console.log('   ❌ Subscribe function error:', error.message, '\n');
  }

  // Test 2: Send-notification function
  console.log('2️⃣ Testing send-notification function with auth...');
  try {
    const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification from the deployment test',
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          tag: 'test-notification',
          data: { type: 'test' }
        }
      }),
    });

    console.log('   Status:', notifyResponse.status);
    const notifyResult = await notifyResponse.text();
    console.log('   Response:', notifyResult);

    if (notifyResponse.status === 200) {
      console.log('   ✅ Send-notification function working!');
    } else {
      console.log('   ❌ Send-notification function has issues');
    }
  } catch (error) {
    console.log('   ❌ Send-notification function error:', error.message);
  }

  console.log('\n🎯 Test complete!');
}

testWithAuth();