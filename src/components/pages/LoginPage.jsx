import React, { useState } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Input from '../common/Input';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

// This creates a custom icon for our login page that looks like a survey target
// It's an SVG with concentric circles and crosshairs, giving it a surveying theme
const RetroTargetIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
    <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="5"/>
    <path d="M50 0V100" stroke="currentColor" strokeWidth="5"/>
    <path d="M0 50H100" stroke="currentColor" strokeWidth="5"/>
  </svg>
);

RetroTargetIcon.propTypes = {
  className: PropTypes.string
};

// This is the main login page that users see when they're not logged in
// It shows a form where they can enter their username and password
const LoginPage = () => {
  // Get the login function from our authentication context
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'forgot-password', or 'reset-password'

  // Check if URL has a password reset token (Supabase redirects with hash)
  React.useEffect(() => {
    const hash = window.location.hash;
    const isRecoveryFromStorage = sessionStorage.getItem('isPasswordRecovery') === 'true';

    console.log('🔐 LoginPage: Checking URL hash:', hash);
    console.log('🔐 LoginPage: Storage flag:', isRecoveryFromStorage);

    // Check for errors (expired link, etc.)
    if (hash && (hash.includes('error=access_denied') || hash.includes('otp_expired'))) {
      console.log('🔐 LoginPage: Password reset link expired or invalid');
      setError('The password reset link has expired or is invalid. Please request a new one.');
      // Clear the hash from URL and storage
      sessionStorage.removeItem('isPasswordRecovery');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    // Check both hash and sessionStorage for recovery token
    if ((hash && hash.includes('type=recovery')) || isRecoveryFromStorage) {
      console.log('🔐 LoginPage: Recovery token detected, showing reset page');
      setCurrentPage('reset-password');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error || 'Invalid email or password.');
      }
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show forgot password page
  if (currentPage === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setCurrentPage('login')} />;
  }

  // Show reset password page
  if (currentPage === 'reset-password') {
    return <ResetPasswordPage onBack={() => setCurrentPage('login')} />;
  }

  // Show login page (default)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <RetroTargetIcon className="w-12 h-12 text-orange-500" />
            <h1 className="ml-3 text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
              Survey Hub
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Railway Survey & Design Management
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleLogin}>
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="e.g. colin.rogers@surveyhub.co.uk"
            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            required
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            required
          />
          
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-300 disabled:bg-orange-300"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setCurrentPage('forgot-password')}
              className="text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors duration-200"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

LoginPage.displayName = 'LoginPage';

export default LoginPage;