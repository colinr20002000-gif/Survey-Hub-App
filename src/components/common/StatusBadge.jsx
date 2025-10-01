import React from 'react';
import PropTypes from 'prop-types';

/**
 * Status Badge Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Status text to display
 * @param {'sm'|'md'|'lg'} props.size - Badge size
 * @returns {JSX.Element} StatusBadge component
 */
const StatusBadge = ({ status, size = 'md' }) => {
  // Base classes for all badges
  const baseClasses = [
    'inline-flex',
    'items-center', 
    'font-medium',
    'rounded-full'
  ].join(' ');
  
  // Size variations
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  // Status-specific styling
  const STATUS_STYLES = {
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Planning': 'bg-yellow-100 text-yellow-800',
    'On Hold': 'bg-red-100 text-red-800',
    'Delivered': 'bg-purple-100 text-purple-800',
    'Cancelled': 'bg-gray-100 text-gray-800',
    'Postponed': 'bg-orange-100 text-orange-800',
    'Site Not Started': 'bg-gray-100 text-gray-800',
    'Site Work Completed': 'bg-blue-100 text-blue-800',
    'Revisit Required': 'bg-yellow-100 text-yellow-800'
  };

  // Combine all classes
  const combinedClasses = [
    baseClasses,
    sizes[size],
    STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'
  ].join(' ');

  return (
    <span className={combinedClasses}>
      {status}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;