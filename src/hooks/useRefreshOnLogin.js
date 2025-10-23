import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook that triggers a callback when user login state changes
 * Useful for refreshing data that should sync with database on login
 */
export const useRefreshOnLogin = (refreshCallback, dependencies = []) => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Only refresh when:
    // 1. Not in loading state
    // 2. User is logged in
    // 3. Dependencies have changed (including user.id change)
    if (!isLoading && user?.id && refreshCallback) {
      console.log('[RefreshOnLogin] User login detected, refreshing data');
      refreshCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, refreshCallback, ...dependencies]);

  // Also refresh when user logs out (to clear state)
  useEffect(() => {
    if (!isLoading && !user?.id && refreshCallback) {
      console.log('[RefreshOnLogin] User logout detected, clearing data');
      refreshCallback();
    }
  }, [user?.id, isLoading, refreshCallback]);
};

export default useRefreshOnLogin;