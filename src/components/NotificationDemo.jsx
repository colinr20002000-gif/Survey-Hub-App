import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationDemo = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testNotification
  } = useNotifications();

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Push Notifications</h2>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">
            Permission: <span className="font-medium">{permission}</span>
          </p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium">{isSubscribed ? 'Subscribed' : 'Not subscribed'}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isSubscribed ? (
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Subscribing...' : 'Enable Notifications'}
            </button>
          ) : (
            <>
              <button
                onClick={testNotification}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Test Notification'}
              </button>
              <button
                onClick={unsubscribe}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Unsubscribing...' : 'Disable Notifications'}
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>• Make sure to add VAPID keys to enable server-side push notifications</p>
          <p>• Deploy the Supabase Edge Function to activate the subscription endpoint</p>
          <p>• Create the subscriptions table in your Supabase database</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;