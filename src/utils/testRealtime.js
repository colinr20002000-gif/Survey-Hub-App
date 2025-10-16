/**
 * Real-Time Connection Tester
 *
 * Use this utility to test if Realtime is properly configured for your tables.
 *
 * Usage:
 * 1. Open browser console
 * 2. Import and run: testRealtimeConnection('resource_allocations')
 * 3. Make a change to the table in Supabase dashboard or another browser tab
 * 4. Check console for events
 */

import { supabase } from '../supabaseClient';

/**
 * Test real-time connection for a specific table
 * @param {string} tableName - Name of the table to test
 * @returns {Function} - Cleanup function to stop listening
 */
export const testRealtimeConnection = (tableName) => {
    console.log(`🧪 Testing real-time connection for table: ${tableName}`);
    console.log('📡 Setting up subscription...');

    const channel = supabase
        .channel(`test-${tableName}-${Date.now()}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: tableName
            },
            (payload) => {
                console.log('✅ REAL-TIME EVENT RECEIVED!');
                console.log('Event Type:', payload.eventType);
                console.log('New Data:', payload.new);
                console.log('Old Data:', payload.old);
                console.log('Full Payload:', payload);
            }
        )
        .subscribe((status) => {
            console.log('📡 Subscription Status:', status);

            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to', tableName);
                console.log('👀 Now try making a change to the', tableName, 'table...');
                console.log('   - Insert a new row');
                console.log('   - Update an existing row');
                console.log('   - Delete a row');
                console.log('');
                console.log('You should see event messages above when changes occur.');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Subscription ERROR!');
                console.error('Possible causes:');
                console.error('1. Realtime not enabled for this table');
                console.error('2. RLS policies blocking SELECT');
                console.error('3. Invalid table name');
            } else if (status === 'TIMED_OUT') {
                console.error('❌ Subscription TIMED OUT!');
                console.error('Check your internet connection and Supabase status');
            }
        });

    // Return cleanup function
    return () => {
        console.log('🧹 Cleaning up test subscription...');
        channel.unsubscribe();
    };
};

/**
 * Test all critical tables at once
 */
export const testAllRealtimeConnections = () => {
    console.log('🧪 Testing all critical real-time connections...');
    console.log('');

    const tables = [
        'projects',
        'users',
        'dummy_users',
        'tasks',
        'project_tasks',
        'delivery_tasks',
        'equipment',
        'equipment_assignments',
        'equipment_comments',
        'vehicles',
        'vehicle_assignments',
        'vehicle_comments',
        'resource_allocations',
        'dummy_resource_allocations'
    ];

    const cleanupFunctions = [];

    tables.forEach((table, index) => {
        setTimeout(() => {
            const cleanup = testRealtimeConnection(table);
            cleanupFunctions.push(cleanup);
        }, index * 200); // Stagger subscriptions
    });

    // Return cleanup function for all subscriptions
    return () => {
        console.log('🧹 Cleaning up all test subscriptions...');
        cleanupFunctions.forEach(cleanup => cleanup());
    };
};

/**
 * Quick test for resource allocations (your reported issue)
 */
export const testResourceCalendarRealtime = () => {
    console.log('🧪 Testing Resource Calendar Real-time...');
    console.log('');

    const cleanup1 = testRealtimeConnection('resource_allocations');
    const cleanup2 = testRealtimeConnection('dummy_resource_allocations');

    console.log('');
    console.log('📝 Instructions:');
    console.log('1. Keep this console open');
    console.log('2. Open Resource Calendar in another tab');
    console.log('3. Allocate a resource or add leave');
    console.log('4. Watch this console for events');
    console.log('');

    return () => {
        cleanup1();
        cleanup2();
    };
};

// Make available in window for easy console access
if (typeof window !== 'undefined') {
    window.testRealtime = {
        test: testRealtimeConnection,
        testAll: testAllRealtimeConnections,
        testResourceCalendar: testResourceCalendarRealtime
    };

    console.log('✅ Realtime test utilities loaded!');
    console.log('Usage examples:');
    console.log('  window.testRealtime.test("resource_allocations")');
    console.log('  window.testRealtime.testAll()');
    console.log('  window.testRealtime.testResourceCalendar()');
}
