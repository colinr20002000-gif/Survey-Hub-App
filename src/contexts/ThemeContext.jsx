import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

// This context manages the app's theme (light mode vs dark mode)
// It keeps track of the current theme and provides functions to change it
// Any component can access this without passing props around
const ThemeContext = createContext(null);

// This hook lets any component access theme information
// Components can use this to know if they should show light or dark colors
// Must be used inside a component wrapped by ThemeProvider
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  // Get the theme data from context
  const context = useContext(ThemeContext);
  
  // If someone tries to use this hook outside ThemeProvider, show helpful error
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// This component wraps our entire app and provides theme state
// It manages whether we're in light mode or dark mode
// Any component inside this provider can use the useTheme hook
export const ThemeProvider = ({ children }) => {
  // Keep track of whether we're in dark mode (false = light mode, true = dark mode)
  const [isDark, setIsDark] = useState(false);

  // This function switches between light and dark mode
  const toggleTheme = () => {
    setIsDark(prev => !prev); // Flip the current theme
  };

  // Bundle up all the theme data and functions that components might need
  const value = {
    isDark,                              // Boolean: true if dark mode, false if light
    toggleTheme,                         // Function to switch between themes
    theme: isDark ? 'dark' : 'light',   // String version for easier checking
  };

  // Provide this theme data to all child components
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

ThemeProvider.displayName = 'ThemeProvider';