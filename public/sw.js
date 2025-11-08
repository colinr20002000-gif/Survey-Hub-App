/* eslint-env serviceworker */
/* global clients, firebase */

// Service Worker for Survey Hub PWA + Firebase Cloud Messaging
// IMPORTANT: Version is set during build by Vite, not dynamically
const CACHE_VERSION = 'v9'; // Increment this manually for major updates
const CACHE_NAME = `survey-hub-${CACHE_VERSION}-fcm`;
const OFFLINE_URL = '/offline.html';

console.log('🔔 [SW] Survey Hub service worker loading...');
console.log('🔔 [SW] Cache version:', CACHE_NAME);

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

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  OFFLINE_URL
];

// Install event - cache additional files
self.addEventListener('install', (event) => {
  console.log('🔔 [SW] Service Worker installing...', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🔔 [SW] Caching additional static files');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .catch((error) => {
        console.error('🔔 [SW] Failed to cache additional static files:', error);
      })
  );

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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip chrome extensions, localhost, and non-http(s) schemes
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:' ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    (!url.protocol.startsWith('http'))
  ) {
    return;
  }

  // Skip Supabase requests - always fetch fresh
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, try cache, fall back to offline page
          return caches.match(event.request).then((response) => {
            return response || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For asset requests (JS, CSS, images), try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((err) => {
              // Silently ignore caching errors (e.g., for unsupported schemes)
              console.log('🔔 [SW] Skipping cache for:', event.request.url);
            });
          });
        }

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
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