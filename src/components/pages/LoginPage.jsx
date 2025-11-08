import React, { useState } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import Button from '../common/Button';
import Input from '../common/Input';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import { Shield } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState('login'); // 'login', 'forgot-password', 'reset-password', or 'mfa'
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState(null);

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
      // First, attempt to sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      // Check if MFA is required
      const { data: factors } = await supabase.auth.mfa.listFactors();

      if (factors?.totp && factors.totp.length > 0) {
        // MFA is enabled - show MFA verification screen
        console.log('🔐 MFA required for user');
        setFactorId(factors.totp[0].id);
        setCurrentPage('mfa');
        setIsLoading(false);
        return;
      }

      // No MFA - proceed with normal login through AuthContext
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hash function for backup codes (must match the one in MFASettings)
  const hashBackupCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleMFAVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Check if this is a backup code (format: XXXX-XXXX) or TOTP code (6 digits)
    const isBackupCode = mfaCode.includes('-') && mfaCode.length === 9;
    const isTOTP = !mfaCode.includes('-') && mfaCode.length === 6;

    if (!isBackupCode && !isTOTP) {
      setError('Please enter a valid 6-digit code or backup code (XXXX-XXXX)');
      setIsLoading(false);
      return;
    }

    console.log('🔐 Starting MFA verification...', isBackupCode ? '(Backup Code)' : '(TOTP)');

    try {
      // Handle backup code verification
      if (isBackupCode) {
        console.log('🔐 Verifying backup code...');

        // Get current user session to get user ID
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        // Hash the entered backup code
        const codeHash = await hashBackupCode(mfaCode);

        // Check if this backup code exists and hasn't been used
        const { data: backupCode, error: fetchError } = await supabase
          .from('mfa_backup_codes')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('code_hash', codeHash)
          .eq('used', false)
          .maybeSingle();

        if (fetchError) {
          console.error('🔐 Error fetching backup code:', fetchError);
          throw new Error('Failed to verify backup code');
        }

        if (!backupCode) {
          throw new Error('Invalid or already used backup code');
        }

        // Mark the backup code as used
        const { error: updateError } = await supabase
          .from('mfa_backup_codes')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('id', backupCode.id);

        if (updateError) {
          console.error('🔐 Error marking backup code as used:', updateError);
          throw new Error('Failed to process backup code');
        }

        console.log('🔐 Backup code verified successfully!');

        // Set flag to allow AuthContext to accept AAL1 session
        sessionStorage.setItem('backupCodeVerified', 'true');

        // Reload page - AuthContext will detect the flag and allow login
        window.location.reload();
        return;
      }

      // Handle TOTP verification (existing code)
      // Create a challenge for the factor
      console.log('🔐 Creating challenge for factor:', factorId);

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });

      if (challengeError) {
        console.error('🔐 Challenge error:', challengeError);
        throw challengeError;
      }

      console.log('🔐 Challenge created:', challengeData?.id);
      console.log('🔐 Verifying code:', mfaCode);

      // Create a promise that resolves when MFA_CHALLENGE_VERIFIED event fires
      const mfaVerifiedPromise = new Promise((resolve, reject) => {
        const authSubscription = supabase.auth.onAuthStateChange((event, session) => {
          console.log('🔐 Auth event during login verification:', event);
          if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'SIGNED_IN') {
            console.log('🔐 MFA verification event received!');
            authSubscription.data.subscription.unsubscribe();
            resolve(true);
          }
        });

        // Set a timeout in case the event never fires
        setTimeout(() => {
          authSubscription.data.subscription.unsubscribe();
          reject(new Error('Login verification timed out'));
        }, 10000);
      });

      // Call verify (this will trigger SIGNED_IN event on success)
      const verifyPromise = supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: mfaCode
      });

      // Wait for either the event or verify to complete
      await Promise.race([mfaVerifiedPromise, verifyPromise.then(result => {
        if (result.error) {
          throw result.error;
        }
        console.log('🔐 Verify API call completed');
        return result;
      })]);

      console.log('🔐 Login verification successful! AuthContext will handle login.');
      // Keep loading state - the AuthContext will detect AAL2 and log user in
      // The loading spinner will disappear when AuthContext redirects to the app

    } catch (err) {
      console.error('🔐 MFA verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentPage('login');
    setMfaCode('');
    setFactorId(null);
    setError('');
  };

  // Show forgot password page
  if (currentPage === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setCurrentPage('login')} />;
  }

  // Show reset password page
  if (currentPage === 'reset-password') {
    return <ResetPasswordPage onBack={() => setCurrentPage('login')} />;
  }

  // Show MFA verification page
  if (currentPage === 'mfa') {
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
              <Shield className="w-12 h-12 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
              Two-Factor Authentication
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleMFAVerification}>
            <div>
              <Input
                label="Verification Code"
                type="text"
                value={mfaCode}
                onChange={(e) => {
                  let value = e.target.value.toUpperCase();
                  // Allow alphanumeric and dash for backup codes, or just digits for TOTP
                  if (value.includes('-') || value.length > 6) {
                    // Backup code format: XXXX-XXXX
                    value = value.replace(/[^A-Z0-9-]/g, '').slice(0, 9);
                    // Auto-add dash after 4 characters
                    if (value.length === 4 && !value.includes('-')) {
                      value += '-';
                    }
                  } else {
                    // TOTP format: 6 digits
                    value = value.replace(/\D/g, '').slice(0, 6);
                  }
                  setMfaCode(value);
                }}
                placeholder="000000 or XXXX-XXXX"
                maxLength={9}
                className="w-full px-4 py-2 mt-2 text-center text-2xl tracking-widest text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                required
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Enter 6-digit code from authenticator app, or use a backup code
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading || (mfaCode.length !== 6 && mfaCode.length !== 9)}
              className="w-full py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-300 disabled:bg-orange-300"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="block w-full text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors duration-200"
              >
                ← Back to login
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lost access to authenticator? Use a backup code above
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    );
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