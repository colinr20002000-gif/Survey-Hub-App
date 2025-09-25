import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFcm } from '../hooks/useFcm';

const PushNotificationSettings = () => {
  const { isAutoSubscribeEnabled, optOutOfAutoSubscribe, optInToAutoSubscribe } = useAuth();
  const { isEnabled, isSupported, requestPermission, disableNotifications } = useFcm();

  const handleAutoSubscribeToggle = () => {
    if (isAutoSubscribeEnabled()) {
      optOutOfAutoSubscribe();
    } else {
      optInToAutoSubscribe();
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
        <p className="text-gray-600">Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Push Notification Settings</h3>

      <div className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <p className="font-medium">Current Status</p>
            <p className="text-sm text-gray-600">
              {isEnabled ? '✅ Enabled' : '❌ Disabled'}
            </p>
          </div>
          <div className="flex gap-2">
            {!isEnabled && (
              <button
                onClick={requestPermission}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Enable Now
              </button>
            )}
            {isEnabled && (
              <button
                onClick={disableNotifications}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Disable
              </button>
            )}
          </div>
        </div>

        {/* Auto-Subscribe Setting */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <p className="font-medium">Auto-Subscribe on Login</p>
            <p className="text-sm text-gray-600">
              Automatically enable push notifications when you log in on new devices
            </p>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAutoSubscribeEnabled()}
              onChange={handleAutoSubscribeToggle}
              className="mr-2"
            />
            <span className="text-sm">
              {isAutoSubscribeEnabled() ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {/* Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Each device you log in from will receive separate push notifications</p>
          <p>• You can disable notifications per device in your browser settings</p>
          <p>• Auto-subscribe only works if your browser supports push notifications</p>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationSettings;