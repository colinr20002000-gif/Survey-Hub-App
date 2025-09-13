// Test script to check if the send-notification Edge Function is working
const SUPABASE_URL = 'https://okldykkmgmcjhgzysris.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTAzMzgsImV4cCI6MjA3MjE2NjMzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';

async function testSendNotificationFunction() {
  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/send-notification`;
    console.log('Testing endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification',
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          tag: 'test-notification',
          data: { type: 'test' }
        }
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.text();
    console.log('Response body:', result);

    if (response.ok) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('Parsed JSON result:', jsonResult);
      } catch (e) {
        console.log('Response is not JSON');
      }
    }

  } catch (error) {
    console.error('Error testing function:', error);
  }
}

// Run the test if this is being executed directly in Node.js
if (typeof window === 'undefined') {
  testSendNotificationFunction();
}