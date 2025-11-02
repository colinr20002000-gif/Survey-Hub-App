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
        console.log('SW registered: ', registration);

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });

  // Listen for controller change (when SW updates) and reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
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
