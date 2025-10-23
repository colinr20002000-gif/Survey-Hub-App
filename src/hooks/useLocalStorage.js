import { useState } from 'react';

// This custom hook lets you store data in the browser's localStorage
// It's like having a variable that remembers its value even after the user closes the browser
// Perfect for storing user preferences, form data, etc.
export const useLocalStorage = (key, initialValue) => {
  // When this hook first runs, try to get the saved value from localStorage
  // We use useState with a function so this only runs once when the component mounts
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Look for our data in localStorage using the provided key
      const item = window.localStorage.getItem(key);
      
      // If we found something, parse it from JSON back into a JavaScript value
      // If nothing was saved, use the initialValue instead
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If something goes wrong (corrupted data, etc.), just use the initial value
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // This function updates both our React state AND localStorage at the same time
  const setValue = (value) => {
    try {
      // Handle both direct values and updater functions (just like useState)
      // For example: setValue(5) or setValue(prev => prev + 1)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update the React state so components re-render
      setStoredValue(valueToStore);
      
      // Save to localStorage so it persists after browser closes
      // We stringify it because localStorage can only store strings
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // If localStorage is full or disabled, just warn but don't crash
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Return the current value and the setter function
  // This works exactly like useState, but with localStorage persistence
  return [storedValue, setValue];
};