/* eslint-env serviceworker */
/* global clients, firebase */

// Service Worker for Survey Hub + Firebase Cloud Messaging
// NO OFFLINE CACHING - Only Firebase push notifications
const CACHE_VERSION = 'v12-update-fix'; // Incremented after fixing update detection
const CACHE_NAME = `survey-hub-${CACHE_VERSION}-fcm`;
const OFFLINE_URL = '/offline.html';

console.log('🔔 [SW] Survey Hub service worker loading...');
console.log('🔔 [SW] Cache version:', CACHE_NAME);
console.log('🔔 [SW] Service worker file updated with update detection fix');

// Import Firebase scripts for messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

console.log('🔔 [SW] Firebase scripts loaded');

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
const messaging = firebase.messaging();
console.log('🔔 [SW] Firebase messaging initialized');

// Install event - no caching, just activate immediately
self.addEventListener('install', (event) => {
  console.log('🔔 [SW] Service Worker installing...', CACHE_NAME);
  console.log('🔔 [SW] No caching - Firebase messaging only');

  // Automatically activate new version
  self.skipWaiting();
});

// Listen for SKIP_WAITING message from client (for manual update checks)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔔 [SW] SKIP_WAITING message received from manual update check');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔔 [SW] Service Worker activating...', CACHE_NAME);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete caches that don't match current version
              const isOurCache = cacheName.startsWith('survey-hub-');
              const isCurrentCache = cacheName === CACHE_NAME;
              return isOurCache && !isCurrentCache;
            })
            .map((cacheName) => {
              console.log('🔔 [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('🔔 [SW] Service Worker activated successfully');
    })
  );
});

// Fetch event - NO CACHING, just pass through to network
// This service worker only handles Firebase push notifications
self.addEventListener('fetch', (event) => {
  // Don't intercept any requests - let them go directly to the network
  // This ensures no caching behavior interferes with live data
  return;
});

// === FIREBASE CLOUD MESSAGING ===

// Handle background messages from Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] BACKGROUND MESSAGE RECEIVED!');
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] Received background message:', payload);
  console.log('🔔 [SW] Payload structure:', JSON.stringify(payload, null, 2));

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
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  console.log('🔔 [SW] Showing notification:', notificationTitle);

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

// Handle direct push events (fallback)
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] DIRECT PUSH EVENT RECEIVED!');
  console.log('🔔 [SW] ============================================');
  console.log('🔔 [SW] Has data:', !!event.data);

  if (event.data) {
    try {
      const payload = JSON.parse(event.data.text());
      console.log('🔔 [SW] Parsed push payload:', JSON.stringify(payload, null, 2));

      const title = payload.notification?.title || payload.data?.title || 'Survey Hub';
      const options = {
        body: payload.notification?.body || payload.data?.body || 'New notification',
        icon: payload.notification?.icon || payload.data?.icon || '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: payload.data?.tag || 'survey-hub-push',
        data: payload.data || {}
      };

      console.log('🔔 [SW] Showing notification from push event');
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('🔔 [SW] Failed to parse push data:', e);
      event.waitUntil(
        self.registration.showNotification('Survey Hub', {
          body: 'You have a new notification',
          icon: '/android-chrome-192x192.png'
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find(client =>
        client.url.includes(self.location.origin)
      );

      if (existingClient) {
        existingClient.focus();
        return existingClient.navigate(urlToOpen);
      } else {
        return clients.openWindow(self.location.origin + urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 [SW] Notification closed:', event.notification.data?.type);
});

// Background sync event (for when connection is restored)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('Sync requested - implement backend sync if needed');
      })
    );
  }
});