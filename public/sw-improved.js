/* eslint-env serviceworker */
/* global clients, firebase */

// Service Worker for Survey Hub PWA - Improved Offline Support
const CACHE_VERSION = 'v10'; // Increment this manually for major updates
const STATIC_CACHE_NAME = `survey-hub-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `survey-hub-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

console.log('🔔 [SW] Survey Hub service worker loading...');
console.log('🔔 [SW] Cache version:', CACHE_VERSION);

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

// === OFFLINE-FIRST CACHING STRATEGY ===

// Critical files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - precache critical files
self.addEventListener('install', (event) => {
  console.log('🔔 [SW] Service Worker installing...', STATIC_CACHE_NAME);

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('🔔 [SW] Precaching critical files');
        return cache.addAll(PRECACHE_URLS);
      })
      .catch((error) => {
        console.error('🔔 [SW] Failed to precache files:', error);
      })
  );

  // Don't automatically activate - wait for SKIP_WAITING message
  console.log('🔔 [SW] New service worker installed, waiting for activation...');
});

// Listen for SKIP_WAITING message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔔 [SW] SKIP_WAITING message received');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔔 [SW] Service Worker activating...', STATIC_CACHE_NAME);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('survey-hub-') &&
                     cacheName !== STATIC_CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE_NAME;
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

// === FETCH STRATEGIES ===

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and non-http(s) schemes
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:' ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // STRATEGY 1: Network-only for Supabase API (data always fresh when online)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.log('🔔 [SW] Supabase offline - request failed:', url.pathname);
          // Return a custom offline response for API calls
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'You are currently offline. Some features may be unavailable.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // STRATEGY 2: Cache-first for static assets (JS, CSS, images, fonts)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/)
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('🔔 [SW] Serving from cache:', url.pathname);
            // Return cached version while updating cache in background
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {
                // Network failed, but we already have cache - no action needed
              });

            return cachedResponse;
          }

          // Not in cache - fetch from network and cache it
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('🔔 [SW] Failed to fetch asset:', url.pathname, error);
              throw error;
            });
        })
    );
    return;
  }

  // STRATEGY 3: Network-first for HTML pages (app shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the successful response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed - try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('🔔 [SW] Serving cached page:', url.pathname);
                return cachedResponse;
              }
              // No cache - return offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // STRATEGY 4: Stale-while-revalidate for everything else
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.log('🔔 [SW] Network request failed:', url.pathname);
            return cachedResponse; // Return stale cache if network fails
          });

        // Return cached version immediately if available, while updating in background
        return cachedResponse || fetchPromise;
      })
  );
});

// === FIREBASE CLOUD MESSAGING ===

// Handle background messages from Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] Background message received:', payload);

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

  return self.registration.showNotification(notificationTitle, notificationOptions);
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

// === BACKGROUND SYNC (for offline action queuing) ===

self.addEventListener('sync', (event) => {
  console.log('🔔 [SW] Background sync event:', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(
      // Notify the app to sync pending actions
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: event.tag
          });
        });
      })
    );
  }
});
