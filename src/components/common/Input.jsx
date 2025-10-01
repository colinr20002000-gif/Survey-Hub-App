import React from 'react';
import PropTypes from 'prop-types';

// This is a reusable form input component with label and error handling
// Instead of writing <input> and <label> tags everywhere, we use this for consistency
// It automatically handles styling, error states, and accessibility
const Input = ({ 
  label,           // Text to show above the input (optional)
  className = '',  // Any extra CSS classes to add
  error,          // Error message to show below input (optional)
  ...props        // Any other input props (type, value, onChange, etc.)
}) => {
  // Build the CSS classes for the input based on whether there's an error
  const inputClasses = [
    'block',                   // Display as block element
    'w-full',                 // Take up full width of container
    'px-3',                   // Horizontal padding inside input
    'py-2',                   // Vertical padding inside input
    'border',                 // Add border
    'rounded-md',             // Rounded corners
    'shadow-sm',              // Subtle shadow
    'placeholder-gray-400',   // Gray color for placeholder text
    'focus:outline-none',     // Remove default browser focus outline
    
    // Change border and focus colors based on error state
    error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'  // Red if error
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500', // Blue if normal
    
    className  // Any extra classes passed in
  ].filter(Boolean).join(' '); // Remove empty strings and join with spaces

  // Render the complete input with label and error message
  return (
    <div className="space-y-1">  {/* Container with vertical spacing */}
      
      {/* Show label above input if one was provided */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {/* The actual input field */}
      <input 
        className={inputClasses}
        {...props}
      />
      
      {/* Show error message below input if there's an error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string
};

Input.displayName = 'Input';

export default Input;