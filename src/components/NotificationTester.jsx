import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationTester = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    testNotification,
    isLoading,
    error
  } = useNotifications();

  const [testResult, setTestResult] = useState('');

  const handleTestSequence = async () => {
    setTestResult('Starting test sequence...\n');

    // Step 1: Check support
    if (!isSupported) {
      setTestResult(prev => prev + '❌ Push notifications not supported\n');
      return;
    }
    setTestResult(prev => prev + '✅ Push notifications supported\n');

    // Step 2: Check permission
    if (permission !== 'granted') {
      setTestResult(prev => prev + `❌ Permission: ${permission}\n`);
      setTestResult(prev => prev + 'Requesting permission...\n');
      try {
        await subscribe();
        setTestResult(prev => prev + '✅ Permission granted and subscribed\n');
      } catch (err) {
        setTestResult(prev => prev + `❌ Permission error: ${err.message}\n`);
        return;
      }
    } else {
      setTestResult(prev => prev + '✅ Permission already granted\n');
    }

    // Step 3: Test local notification
    setTestResult(prev => prev + 'Testing local notification...\n');
    try {
      await testNotification();
      setTestResult(prev => prev + '✅ Local notification sent\n');
    } catch (err) {
      setTestResult(prev => prev + `❌ Local notification error: ${err.message}\n`);
    }

    // Step 4: Check if subscription exists in database
    setTestResult(prev => prev + 'Checking database subscription...\n');
    try {
      const { data, error } = await window.supabase
        .from('subscriptions')
        .select('count(*)')
        .single();

      if (error) {
        setTestResult(prev => prev + `❌ Database error: ${error.message}\n`);
      } else {
        setTestResult(prev => prev + `✅ Found ${data.count || 0} subscriptions in database\n`);
      }
    } catch (err) {
      setTestResult(prev => prev + `❌ Database check error: ${err.message}\n`);
    }

    setTestResult(prev => prev + '\n🎯 Test sequence complete!\n');
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded-md">
        <p className="text-red-700">Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        🔔 Push Notification Tester
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Support:</strong> {isSupported ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Permission:</strong> {permission}
          </div>
          <div>
            <strong>Subscribed:</strong> {isSubscribed ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Status:</strong> {isLoading ? '⏳ Loading' : '✅ Ready'}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex gap-2">
          {!isSubscribed && (
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Subscribing...' : 'Subscribe to Notifications'}
            </button>
          )}

          {isSubscribed && (
            <button
              onClick={testNotification}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Local Notification'}
            </button>
          )}

          <button
            onClick={handleTestSequence}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? 'Running...' : 'Run Full Test'}
          </button>
        </div>

        {testResult && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Test Results:</h3>
            <pre className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm whitespace-pre-wrap font-mono">
              {testResult}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationTester;