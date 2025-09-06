import React from 'react';
import PropTypes from 'prop-types';

// This is a reusable button component that can look different based on props
// Instead of writing <button> tags everywhere, we use this for consistency
// It handles different styles (primary, secondary, etc.) and sizes automatically
const Button = ({ 
  children,        // What goes inside the button (text, icons, etc.)
  variant = 'primary',  // What style: 'primary', 'secondary', 'danger', or 'outline'
  size = 'md',          // How big: 'sm', 'md', or 'lg'
  className = '',       // Any extra CSS classes to add
  ...props             // Any other button props (onClick, disabled, etc.)
}) => {
  // These CSS classes get applied to every button for consistent base styling
  const baseClasses = [
    'font-medium',           // Medium font weight
    'rounded-lg',           // Rounded corners
    'transition-colors',    // Smooth color transitions when hovering
    'focus:outline-none',   // Remove default browser focus outline
    'focus:ring-2',         // Add our own focus ring instead
    'focus:ring-offset-2',  // Space between element and focus ring
    'disabled:opacity-50',  // Make disabled buttons look faded
    'disabled:cursor-not-allowed'  // Show "not allowed" cursor when disabled
  ].join(' ');
  
  // Different color schemes for different button types
  const variants = {
    // Primary: bright blue, used for main actions like "Save" or "Submit"
    primary: [
      'bg-blue-600',          // Blue background
      'hover:bg-blue-700',    // Darker blue when hovering
      'text-white',           // White text
      'focus:ring-blue-500'   // Blue focus ring
    ].join(' '),
    
    // Secondary: gray, used for less important actions like "Cancel"
    secondary: [
      'bg-gray-200',          // Light gray background
      'hover:bg-gray-300',    // Darker gray when hovering
      'text-gray-900',        // Dark gray text
      'focus:ring-gray-500'   // Gray focus ring
    ].join(' '),
    
    // Danger: red, used for destructive actions like "Delete"
    danger: [
      'bg-red-600',           // Red background
      'hover:bg-red-700',     // Darker red when hovering
      'text-white',           // White text
      'focus:ring-red-500'    // Red focus ring
    ].join(' '),
    
    // Outline: just a border, used for subtle actions
    outline: [
      'border',               // Add border
      'border-gray-300',      // Gray border color
      'hover:bg-gray-50',     // Very light gray background when hovering
      'text-gray-700',        // Dark gray text
      'focus:ring-gray-500'   // Gray focus ring
    ].join(' ')
  };

  // Different sizes for different contexts
  const sizes = {
    sm: 'px-3 py-2 text-sm',     // Small: less padding, smaller text
    md: 'px-4 py-2 text-sm',     // Medium: standard size (default)
    lg: 'px-6 py-3 text-base'    // Large: more padding, bigger text
  };

  // Combine all the CSS classes together
  const combinedClasses = [
    baseClasses,          // Base styles that every button gets
    variants[variant],    // Colors based on the variant prop
    sizes[size],          // Size based on the size prop
    className             // Any extra classes passed in
  ].filter(Boolean).join(' '); // Remove any empty strings and join with spaces

  // Render the actual button element
  return (
    <button 
      className={combinedClasses}  // Apply all our calculated CSS classes
      {...props}                   // Spread any other props (onClick, disabled, etc.)
    >
      {children}  {/* Whatever content was passed in (text, icons, etc.) */}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

Button.displayName = 'Button';

export default Button;