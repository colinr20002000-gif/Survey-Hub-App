import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce utility for search inputs and expensive operations
 * Delays execution until user stops typing for specified delay
 */

export const debounce = (func, delay = 300) => {
  let timeoutId;

  return function debounced(...args) {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Throttle utility for scroll/resize handlers
 * Ensures function runs at most once per specified interval
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;

  return function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Hook version of debounce for React components
 * Usage:
 * const debouncedSearch = useDebouncedCallback((value) => {
 *   searchProjects(value);
 * }, 300);
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Hook for debounced value
 * Usage:
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
};
