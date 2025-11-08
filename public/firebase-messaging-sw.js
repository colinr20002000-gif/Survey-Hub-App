// Firebase Messaging Service Worker
// This file handles background push notifications for the Survey Hub application

console.log('🔔 [SW] Firebase messaging service worker loading...');

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

console.log('🔔 [SW] Firebase scripts loaded successfully');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAL6kYLAXcTglnkDC3iR5skcRgeetsVQ84",
  authDomain: "survey-hub-xyz.firebaseapp.com",
  projectId: "survey-hub-xyz",
  storageBucket: "survey-hub-xyz.firebasestorage.app",
  messagingSenderId: "825099555628",
  appId: "1:825099555628:web:c061c4a41c68375e231289",
  measurementId: "G-JK8KXZTETN"
};

console.log('🔔 [SW] Initializing Firebase with config:', firebaseConfig.projectId);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
console.log('🔔 [SW] Firebase app initialized successfully');

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();
console.log('🔔 [SW] Firebase messaging instance created');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] BACKGROUND MESSAGE RECEIVED!');
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] Received background message:', payload);
  console.log('🔔 [SW] Payload structure:', JSON.stringify(payload, null, 2));
  console.log('🔔 [SW] Notification permission:', Notification.permission);

  // Prevent default notification by handling it manually
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Survey Hub Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || payload.data?.icon || '/android-chrome-192x192.png',
    badge: payload.notification?.badge || payload.data?.badge || '/favicon-32x32.png',
    tag: payload.data?.tag || 'survey-hub-notification',
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type || 'general',
      priority: payload.data?.priority || 'medium',
      timestamp: Date.now(),
      ...payload.data
    },
    requireInteraction: payload.data?.priority === 'urgent',
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Show the notification manually (this prevents Firebase's default notification)
  console.log('🔔 [SW] Showing notification:', notificationTitle, notificationOptions);

  // Close any existing browser update notifications before showing our notification
  return self.registration.getNotifications().then((notifications) => {
    // Close any notifications that might be browser-generated update messages
    notifications.forEach(notification => {
      if (notification.tag === 'sw-update' ||
          notification.title?.toLowerCase().includes('updated') ||
          notification.body?.toLowerCase().includes('updated in the background')) {
        console.log('🔔 [SW] Closing browser update notification:', notification.title);
        notification.close();
      }
    });
    // Show our actual notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action (click on notification body) or 'view' action
  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        const existingClient = clientList.find(client =>
          client.url.includes(self.location.origin)
        );

        if (existingClient) {
          // Focus on the existing window/tab and navigate to the target URL
          existingClient.focus();
          return existingClient.navigate(urlToOpen);
        } else {
          // Open a new window/tab with the target URL
          return clients.openWindow(self.location.origin + urlToOpen);
        }
      })
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  // Optional: track notification dismissal analytics
  if (event.notification.data?.type) {
    console.log(`Notification of type "${event.notification.data.type}" was dismissed`);
  }
});

// Handle push events directly (fallback/debug)
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] DIRECT PUSH EVENT RECEIVED!');
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] Push event object:', event);
  console.log('🔔 [SW] Event type:', event.type);
  console.log('🔔 [SW] Has data:', !!event.data);

  if (event.data) {
    const textData = event.data.text();
    console.log('🔔 [SW] Push event data (text):', textData);
    try {
      const payload = JSON.parse(textData);
      console.log('🔔 [SW] Parsed push payload:', JSON.stringify(payload, null, 2));

      // Show notification from direct push event
      const title = payload.notification?.title || payload.data?.title || 'Survey Hub';
      const options = {
        body: payload.notification?.body || payload.data?.body || 'New notification',
        icon: payload.notification?.icon || payload.data?.icon || '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'survey-hub-push',
        data: payload.data || {}
      };

      console.log('🔔 [SW] Showing notification from push event:', title, options);
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('🔔 [SW] Failed to parse push data:', e);
      console.error('🔔 [SW] Raw data:', textData);

      // Show a generic notification even if parsing fails
      event.waitUntil(
        self.registration.showNotification('Survey Hub', {
          body: 'You have a new notification',
          icon: '/android-chrome-192x192.png'
        })
      );
    }
  } else {
    console.warn('🔔 [SW] Push event has no data!');
  }
});

// Service worker installation and activation
self.addEventListener('install', (event) => {
  console.log('Firebase messaging service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Firebase messaging service worker activated');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});