/* eslint-env serviceworker */
/* global clients, firebase */

// Service Worker for Survey Hub PWA + Firebase Cloud Messaging
// Cache name now includes build timestamp for automatic versioning
const CACHE_NAME = `survey-hub-v4-fcm-${Date.now()}`;
const OFFLINE_URL = '/offline.html';

console.log('🔔 [SW] Survey Hub service worker loading...');

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

// Workbox will inject the manifest here during build
// self.__WB_MANIFEST is replaced by the actual precache manifest during build
if ('workbox' in self) {
  self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
  self.workbox.precaching.cleanupOutdatedCaches();
} else {
  // Fallback for when workbox is injected differently
  self.__WB_MANIFEST;
}

// Files to cache for offline functionality (in addition to Workbox precaching)
const STATIC_CACHE_FILES = [
  OFFLINE_URL
];

// Install event - cache additional files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching additional static files');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .catch((error) => {
        console.error('Failed to cache additional static files:', error);
      })
  );

  // Automatically activate the new service worker
  console.log('Service Worker installed, automatically activating...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );

  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle navigation requests - show offline page if network fails
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For other requests, let Workbox handle precached files
  // and fall back to network for non-precached resources
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
  return self.registration.showNotification(notificationTitle, notificationOptions);
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