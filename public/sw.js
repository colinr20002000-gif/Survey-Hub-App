/* eslint-env serviceworker */
/* global clients, importScripts, firebase */

// Service Worker for Survey Hub PWA
const CACHE_NAME = 'survey-hub-v1';
const OFFLINE_URL = '/offline.html';

// Import Firebase scripts for messaging
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

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

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

// Push notifications are handled by firebase-messaging-sw.js to prevent duplicates

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

// Note: Firebase Cloud Messaging is handled by firebase-messaging-sw.js
// This prevents duplicate notifications from multiple service workers