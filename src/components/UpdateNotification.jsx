import { useState, useEffect } from 'react';

/**
 * UpdateNotification Component
 * Displays a notification banner when a new version of the app is available
 */
export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = (reg) => {
      setRegistration(reg);
      setShowUpdate(true);
    };

    // Listen for updates
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        // Check if there's already an update waiting
        if (reg.waiting) {
          handleUpdate(reg);
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleUpdate(reg);
            }
          });
        });
      }
    });

    // Check localStorage for pending update
    if (localStorage.getItem('updateAvailable') === 'true') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          handleUpdate(reg);
        }
      });
    }

    // Listen for custom update event
    const handleUpdateEvent = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting || reg?.installing) {
          handleUpdate(reg);
        }
      });
    };

    window.addEventListener('swUpdateAvailable', handleUpdateEvent);

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdateEvent);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      localStorage.removeItem('updateAvailable');

      // Reload will happen automatically via controllerchange event
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    localStorage.setItem('updateAvailable', 'true');
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Update Available</h3>
          <p className="text-sm text-blue-100 mb-3">
            A new version of Survey Hub is ready. Update now for the latest features and fixes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-100 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
