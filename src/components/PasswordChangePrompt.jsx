import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const PasswordChangePrompt = ({ user, onComplete, reason }) => {
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!passwords.newPassword || !passwords.confirmPassword) {
      alert('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (passwords.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) {
        throw error;
      }

      // Update last_login in users table to mark as no longer new
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating last_login:', updateError);
        // Don't throw error - password was successfully updated even if last_login fails
      }

      alert('Password updated successfully!');
      
      // Force a page reload to refresh user data and prevent password prompt loop
      // This ensures the updated last_login is reflected in the user object
      window.location.reload();
    } catch (error) {
      console.error('Error updating password:', error);
      alert(`Error updating password: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (reason === 'new_user') {
      // New users should be encouraged to set password
      if (confirm('We recommend setting a secure password. Are you sure you want to skip this step?')) {
        onComplete();
      }
    } else {
      // Password recovery users can skip more easily
      onComplete();
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'new_user':
        return 'Welcome! Please Set Your Password';
      case 'password_recovery':
        return 'Password Recovery - Set New Password';
      default:
        return 'Set New Password';
    }
  };

  const getMessage = () => {
    switch (reason) {
      case 'new_user':
        return 'Welcome to the system! For security, please set a strong password for your account.';
      case 'password_recovery':
        return 'You\'ve accessed your account via password recovery. Please set a new password to secure your account.';
      default:
        return 'Please set a new password for your account.';
    }
  };

  // Allow skipping after 30 seconds for better UX
  React.useEffect(() => {
    const timer = setTimeout(() => setCanSkip(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {getTitle()}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {getMessage()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handleChange}
              placeholder="Enter new password (min 8 characters)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Updating Password...' : 'Set Password'}
            </button>

            {canSkip && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 text-sm transition-colors"
              >
                {reason === 'new_user' ? 'Skip for now' : 'Continue without changing'}
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>💡 Tips for a strong password:</p>
          <p>• At least 8 characters long</p>
          <p>• Mix of letters, numbers, and symbols</p>
          <p>• Avoid common words or personal info</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangePrompt;