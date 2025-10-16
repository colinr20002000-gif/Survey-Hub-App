import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Select Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Select label text
 * @param {React.ReactNode} props.children - Option elements
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.error - Error message to display
 * @returns {JSX.Element} Select component
 */
const Select = ({ label, children, className = '', error, ...props }) => {
  // Build select classes based on state
  const selectClasses = [
    'block',
    'w-full',
    'px-3',
    'py-2',
    'border',
    'rounded-md',
    'shadow-sm',
    'focus:outline-none',
    // Conditional classes based on error state
    error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select className={selectClasses} {...props}>
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

Select.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  error: PropTypes.string
};

Select.displayName = 'Select';

export default Select;