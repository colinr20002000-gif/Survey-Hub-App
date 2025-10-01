import { useState, useCallback } from 'react';

// This custom hook manages a simple on/off (true/false) state
// Perfect for things like show/hide modals, light/dark mode, expand/collapse, etc.
// It gives you the current state plus easy functions to control it
export const useToggle = (initialValue = false) => {
  // Keep track of the current true/false state
  const [value, setValue] = useState(initialValue);

  // Function to flip the state (true becomes false, false becomes true)
  // We use useCallback so this function doesn't change on every render
  const toggle = useCallback(() => {
    setValue(prev => !prev); // Flip whatever the previous value was
  }, []);

  // Function to force the state to true
  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  // Function to force the state to false
  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  // Return the current state and an object with control functions
  return [value, { toggle, setTrue, setFalse, setValue }];
  
  // Usage examples:
  // const [isOpen, { toggle, setTrue, setFalse }] = useToggle();
  // const [isDark, { toggle }] = useToggle(false);
};