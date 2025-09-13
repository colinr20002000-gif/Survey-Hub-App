/* eslint-env serviceworker */
/* global clients */

// Service Worker for Survey Hub PWA
const CACHE_NAME = 'survey-hub-v1';
const OFFLINE_URL = '/offline.html';

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

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Survey Hub',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-144x144.png',
    tag: 'survey-hub-notification',
    data: {
      url: '/'
    }
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    }
  } catch (error) {
    console.error('Error parsing push data:', error);
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200]
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (targetUrl !== '/') {
              client.postMessage({ 
                type: 'NAVIGATE', 
                url: targetUrl 
              });
            }
            return;
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Background sync event (for when connection is restored)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // You can implement sync functionality here if needed
      // For now, just log that sync was requested
      Promise.resolve().then(() => {
        console.log('Sync requested - implement backend sync if needed');
      })
    );
  }
});