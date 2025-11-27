import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import UpdateNotification from './components/UpdateNotification.jsx'

// CRITICAL: Check for password recovery BEFORE Supabase processes the hash
// This needs to happen before ANY other code runs
const hash = window.location.hash;
if (hash && (hash.includes('type=recovery') || hash.includes('type%3Drecovery'))) {
  console.log('🔐 [main.jsx] Password recovery detected - storing flag');
  sessionStorage.setItem('isPasswordRecovery', 'true');
} else {
  sessionStorage.removeItem('isPasswordRecovery');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use a stable URL for normal registration to avoid constant updates
    // Only manual checks will use aggressive cache busting
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none' // Bypass service worker HTTP cache
    })
      .then((registration) => {
        console.log('✅ Service Worker registered successfully');
        console.log('📦 Current SW state:', {
          installing: !!registration.installing,
          waiting: !!registration.waiting,
          active: !!registration.active
        });

        // Store registration globally for manual update checks
        window.swRegistration = registration;

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('🆕 Service Worker update found! New version installing...');
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            console.log('🔄 New SW state:', newWorker.state);
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ New Service Worker installed and ready to activate');
            }
          });
        });

        // Check for updates every 5 minutes (using standard update method)
        setInterval(() => {
          console.log('🔍 Checking for service worker updates...');
          registration.update()
            .then(() => {
              console.log('✅ Update check completed');
            })
            .catch((error) => {
              console.error('❌ Service worker update check failed:', error);
            });
        }, 5 * 60 * 1000); // 5 minutes

        // Also check for updates when the page gains focus
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            console.log('👁️ Page visible again, checking for updates...');
            registration.update()
              .then(() => {
                console.log('✅ Visibility update check completed');
              })
              .catch((error) => {
                console.error('❌ Service worker update check failed:', error);
              });
          }
        });
      })
      .catch((registrationError) => {
        console.error('❌ Service Worker registration failed:', registrationError);
      });
  });

  // Listen for controller change (when SW updates) and reload automatically
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('🔄 New service worker activated, reloading page...');
      // Set flag to show update notification after reload
      sessionStorage.setItem('appJustUpdated', 'true');
      // Set flag to skip MFA check on reload (user is already authenticated)
      sessionStorage.setItem('swUpdateReload', 'true');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <UpdateNotification />
  </StrictMode>,
)
