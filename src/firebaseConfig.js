import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAL6kYLAXcTglnkDC3iR5skcRgeetsVQ84",
  authDomain: "survey-hub-xyz.firebaseapp.com",
  projectId: "survey-hub-xyz",
  storageBucket: "survey-hub-xyz.firebasestorage.app",
  messagingSenderId: "825099555628",
  appId: "1:825099555628:web:c061c4a41c68375e231289",
  measurementId: "G-JK8KXZTETN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

// VAPID key for web push notifications
const VAPID_KEY = "BBNKx2nNyydVZGU7UGCJvDiBPOucsz57KvQy5dDkmaR_acdfh-z6wrPs0k20-NSJEZ5UODEpi0-e6BPRAXqxRnM";

/**
 * Get the FCM registration token for the current device
 * @returns {Promise<string|null>} The FCM token or null if failed
 */
export const getFCMToken = async () => {
  try {
    // Check if messaging is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('This browser does not support messaging');
      return null;
    }

    // Check current permission status first
    const currentPermission = Notification.permission;

    let permission = currentPermission;
    if (currentPermission === 'default') {
      // Only request permission if not already decided
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('Notification permission denied or not granted');
      return null;
    }

    // Use the existing main service worker registration
    let registration;
    try {
      // Check if main service worker is already registered
      registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        // Register main service worker if not already registered
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
      }
      console.log('Service worker registration successful:', registration);

      // Wait for the service worker to be ready and ensure it has pushManager
      const readyRegistration = await navigator.serviceWorker.ready;
      console.log('Service worker is ready');

      // Additional check to ensure pushManager is available
      if (!readyRegistration.pushManager) {
        console.error('PushManager not available in service worker');
        return null;
      }

      console.log('PushManager is available');
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }

    // Get the FCM token with additional error handling
    let token;
    try {
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
    } catch (tokenError) {
      console.error('Failed to get FCM token:', tokenError);
      // Try without explicit service worker registration
      try {
        token = await getToken(messaging, {
          vapidKey: VAPID_KEY
        });
      } catch (fallbackError) {
        console.error('Fallback FCM token generation also failed:', fallbackError);
        return null;
      }
    }

    if (token) {
      console.log('FCM registration token:', token);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Set up foreground message listener
 * @param {Function} onMessageCallback - Callback function to handle received messages
 */
export const onForegroundMessage = (onMessageCallback) => {
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    onMessageCallback(payload);
  });
};

export { messaging };
export default app;