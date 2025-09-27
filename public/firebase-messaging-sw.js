// Firebase Messaging Service Worker
// This file handles background push notifications for the Survey Hub application

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] Received background message:', payload);
  console.log('🔔 [SW] Payload structure:', JSON.stringify(payload, null, 2));

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
  return self.registration.showNotification(notificationTitle, notificationOptions);
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

// Handle push events directly (fallback)
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Direct push event received:', event);
  if (event.data) {
    console.log('🔔 [SW] Push event data:', event.data.text());
    try {
      const payload = JSON.parse(event.data.text());
      console.log('🔔 [SW] Parsed push payload:', payload);
    } catch (e) {
      console.log('🔔 [SW] Failed to parse push data:', e);
    }
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