import React, { useState } from 'react';
import { 
  AuthProvider, 
  ThemeProvider, 
  useAuth 
} from './contexts';
import { LoginPage } from './components/pages';
import { Header } from './components/common';

/**
 * Refactored App Component
 * 
 * This demonstrates the clean, modular structure achieved through refactoring.
 * The original monolithic App.jsx (3,800+ lines) has been broken down into:
 * - Reusable UI components with PropTypes validation
 * - Custom hooks for shared logic
 * - Separate contexts for state management
 * - Utility functions and constants
 */

/**
 * Dashboard Component (Placeholder)
 */
const Dashboard = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
      Dashboard
    </h1>
    <p className="text-gray-600 dark:text-gray-400">
      Welcome to your dashboard!
    </p>
  </div>
);

/**
 * Main Layout Component
 */
const MainLayout = () => {
  // State management
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Event handlers
  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={handleMenuClick} setActiveTab={setActiveTab} />
      <main className="transition-all duration-200">
        {activeTab === 'Dashboard' && <Dashboard />}
        {/* Other pages would be added here */}
      </main>
    </div>
  );
};

/**
 * App Content Component
 * Handles authentication routing
 */
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainLayout />;
};

/**
 * Root App Component
 * Provides global context providers
 */
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <AppContent />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

App.displayName = 'App';

export default App;