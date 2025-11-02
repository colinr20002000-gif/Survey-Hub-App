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

// Forgot Password page where users can request a password reset email
const ForgotPasswordPage = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Send password reset email using Supabase
      // Note: Supabase automatically appends the token hash to the URL
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Password reset instructions have been sent to your email. Please check your inbox.');
        setEmail('');
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
            Reset Your Password
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you instructions to reset your password.
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. colin.rogers@surveyhub.co.uk"
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
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
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

ForgotPasswordPage.propTypes = {
  onBack: PropTypes.func.isRequired
};

ForgotPasswordPage.displayName = 'ForgotPasswordPage';

export default ForgotPasswordPage;
