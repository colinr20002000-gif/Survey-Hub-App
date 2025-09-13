// Test Supabase real-time connection
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okldykkmgmcjhgzysris.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTAzMzgsImV4cCI6MjA3MjE2NjMzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';

async function testRealtimeConnection() {
  console.log('🧪 Testing Supabase Real-time Connection');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Check announcements table access
  console.log('1️⃣ Testing table access...');
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title')
      .limit(1);

    if (error) {
      console.error('❌ Table access error:', error);
    } else {
      console.log('✅ Table access successful. Recent announcement:', data);
    }
  } catch (err) {
    console.error('❌ Table access exception:', err);
  }

  // Test 2: Test real-time subscription
  console.log('2️⃣ Testing real-time subscription...');

  let subscription;
  try {
    subscription = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          console.log('🎉 REAL-TIME EVENT RECEIVED!', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time status:', status);
      });

    // Wait a bit to see the subscription status
    setTimeout(() => {
      console.log('3️⃣ Subscription after 2 seconds:', subscription);

      // Clean up
      if (subscription) {
        supabase.removeChannel(subscription);
        console.log('🧹 Cleaned up test subscription');
      }
    }, 2000);

  } catch (err) {
    console.error('❌ Real-time subscription error:', err);
  }
}

// Run the test if in a browser environment
if (typeof window !== 'undefined') {
  window.testRealtimeConnection = testRealtimeConnection;
  console.log('🧪 Test function available as window.testRealtimeConnection()');
} else {
  testRealtimeConnection();
}