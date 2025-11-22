import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import Button from '../common/Button';
import Input from '../common/Input';

// Icon component reused from LoginPage
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

// Reset Password page where users create a new password after clicking email link
const ResetPasswordPage = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Your password has been successfully reset. Redirecting to login...');

        // Clear the recovery flag from session storage
        sessionStorage.removeItem('isPasswordRecovery');

        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);

        // Sign out the user to clear the session completely
        await supabase.auth.signOut();

        // Reload the page to ensure clean state and show login page
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 1500);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Create New Password
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below.
          </div>

          <Input
            label="New Password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            required
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {message && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">{message}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-300 disabled:bg-orange-300"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors duration-200"
            >
              Back to Login
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

ResetPasswordPage.propTypes = {
  onBack: PropTypes.func.isRequired
};

ResetPasswordPage.displayName = 'ResetPasswordPage';

export default ResetPasswordPage;
