import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// This is a reusable modal (popup) component with smooth animations
// It creates an overlay that darkens the background and shows content in the center
// Perfect for forms, confirmations, image previews, etc.
const Modal = ({
  isOpen,          // Boolean: whether to show the modal
  onClose,         // Function to call when user wants to close modal
  title,           // Text to show in the modal header
  children,        // The actual content to show inside the modal
  size = 'md',     // How big the modal should be: 'sm', 'md', 'lg', or 'xl'
  disableBackdropClick = false  // Prevent closing when clicking outside
}) => {
  // Different maximum widths for different modal sizes
  const sizes = {
    sm: 'max-w-md',    // Small: good for simple confirmations
    md: 'max-w-lg',    // Medium: good for forms (default)
    lg: 'max-w-2xl',   // Large: good for detailed content
    xl: 'max-w-4xl'    // Extra large: good for tables or complex layouts
  };

  // If the modal isn't supposed to be open, don't render anything
  if (!isOpen) return null;

  // Render the modal with animations
  return (
    <AnimatePresence>  {/* Handles enter/exit animations */}
      
      {/* Full-screen container that sits on top of everything else */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        
        {/* Centering container */}
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          
          {/* Dark background overlay that fades in/out */}
          <motion.div
            initial={{ opacity: 0 }}     // Start invisible
            animate={{ opacity: 1 }}     // Fade in
            exit={{ opacity: 0 }}        // Fade out when closing
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={disableBackdropClick ? undefined : onClose}  // Close modal if user clicks background (unless disabled)
          />
          
          {/* Invisible element to help with vertical centering on desktop */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;  {/* Zero-width space character */}
          </span>
          
          {/* The actual modal content box that slides and fades in */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}  // Start slightly small and below center
            animate={{ opacity: 1, scale: 1, y: 0 }}      // Grow to normal size and center
            exit={{ opacity: 0, scale: 0.95, y: 20 }}     // Shrink and move down when closing
            className={[
              'inline-block',    // Inline-block for centering
              'w-full',         // Full width up to max-width
              sizes[size],      // Max width based on size prop
              'p-6',            // Padding inside the modal
              'my-8',           // Margin top and bottom
              'overflow-hidden', // Hide any content that overflows
              'text-left',      // Left-align text
              'align-middle',   // Vertical alignment
              'transition-all', // Smooth transitions
              'transform',      // Allow transforms for animation
              'bg-white',       // White background
              'shadow-xl',      // Large shadow
              'rounded-lg'      // Rounded corners
            ].join(' ')}
          >
            
            {/* Modal header with title and close button */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
              
              {/* Close button (X) in top right corner */}
              {!disableBackdropClick && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md p-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />  {/* X icon */}
                </button>
              )}
            </div>
            
            {/* Modal content area */}
            <div className="mt-4">
              {children}  {/* Whatever content was passed in */}
            </div>
            
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  disableBackdropClick: PropTypes.bool
};

Modal.displayName = 'Modal';

export default Modal;