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
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully');

        // Check for updates only every 5 minutes (reduced from 60 seconds)
        // This prevents excessive update checks that could cause issues
        setInterval(() => {
          console.log('🔍 Checking for service worker updates...');
          registration.update().catch((error) => {
            console.error('❌ Service worker update check failed:', error);
          });
        }, 5 * 60 * 1000); // 5 minutes

        // Also check for updates when the page gains focus
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            registration.update().catch((error) => {
              console.error('❌ Service worker update check failed:', error);
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('❌ Service Worker registration failed:', registrationError);
      });
  });

  // Listen for controller change (when SW updates) and reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('🔄 New service worker activated, reloading page...');
      // Set flag to show update notification after reload
      sessionStorage.setItem('appJustUpdated', 'true');
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
