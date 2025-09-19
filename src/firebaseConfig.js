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

    // Request permission for notifications
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register service worker first
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      console.log('Service worker registration successful:', registration);
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }

    // Get the FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

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