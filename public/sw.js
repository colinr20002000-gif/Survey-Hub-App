/* eslint-env serviceworker */
/* global clients */

// Service Worker for Survey Hub PWA - PWA functionality only
// Firebase messaging is handled by firebase-messaging-sw.js
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

// Push notifications and notification clicks are handled by firebase-messaging-sw.js to prevent duplicates

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

// Note: Firebase Cloud Messaging is handled by firebase-messaging-sw.js
// This prevents duplicate notifications from multiple service workers