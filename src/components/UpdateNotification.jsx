import { useState, useEffect } from 'react';

/**
 * UpdateNotification Component
 * Displays a notification banner after the app has been automatically updated
 */
export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Check if the app just updated
    if (sessionStorage.getItem('appJustUpdated') === 'true') {
      // Clear the flag
      sessionStorage.removeItem('appJustUpdated');

      // Show the notification
      setShowUpdate(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowUpdate(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-green-600 text-white rounded-lg shadow-lg p-4 z-50 animate-slide-up">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">App Updated Successfully</h3>
          <p className="text-sm text-green-100">
            Survey Hub has been updated to the latest version with new features and improvements.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-green-100 hover:text-white transition-colors"
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
