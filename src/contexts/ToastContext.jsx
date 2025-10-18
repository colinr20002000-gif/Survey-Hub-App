import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
  }
};

const Toast = ({ toast, onClose }) => {
  const { icon: Icon, className } = TOAST_TYPES[toast.type];
  
  return (
    <div className={`relative flex flex-col gap-3 p-4 mb-3 border rounded-lg shadow-lg ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-sm font-medium mb-1">{toast.title}</h4>
          )}
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {toast.requireAck && (
        <div className="flex justify-end pt-2 border-t border-current/20">
          <button
            onClick={() => onClose(toast.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-current/10 hover:bg-current/20 transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    title: PropTypes.string,
    message: PropTypes.string.isRequired,
    requireAck: PropTypes.bool
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

const ModalConfirmation = ({ modal, onClose }) => {
  const { icon: Icon, className } = TOAST_TYPES[modal.type];

  // Define modal styles based on type
  const modalStyles = {
    success: {
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      button: 'bg-green-600 hover:bg-green-700 text-white'
    },
    error: {
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      border: 'border-yellow-200 dark:border-yellow-800',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const styles = modalStyles[modal.type] || modalStyles.info;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl border max-w-md w-full mx-auto ${styles.border}`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              {modal.title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {modal.title}
                </h3>
              )}
              <p className="text-gray-700 dark:text-gray-300">
                {modal.message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl flex justify-end">
          <button
            onClick={() => onClose(modal.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

ModalConfirmation.propTypes = {
  modal: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    title: PropTypes.string,
    message: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modals, setModals] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    
    // Only auto-remove if it doesn't require acknowledgment
    if (!toast.requireAck) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addModal = useCallback((modal) => {
    const id = Date.now().toString();
    const newModal = { id, ...modal };
    
    setModals(prev => [...prev, newModal]);
    
    return id;
  }, []);

  const removeModal = useCallback((id) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);

  const showSuccess = useCallback((message, title, requireAck = false) => {
    return addToast({ type: 'success', message, title, requireAck });
  }, [addToast]);

  const showError = useCallback((message, title, requireAck = false) => {
    return addToast({ type: 'error', message, title, requireAck });
  }, [addToast]);

  const showWarning = useCallback((message, title, requireAck = false) => {
    return addToast({ type: 'warning', message, title, requireAck });
  }, [addToast]);

  const showInfo = useCallback((message, title, requireAck = false) => {
    return addToast({ type: 'info', message, title, requireAck });
  }, [addToast]);

  // Helper functions specifically for acknowledgment-required toasts
  const showSuccessAck = useCallback((message, title) => {
    return addToast({ type: 'success', message, title, requireAck: true });
  }, [addToast]);

  const showErrorAck = useCallback((message, title) => {
    return addToast({ type: 'error', message, title, requireAck: true });
  }, [addToast]);

  const showWarningAck = useCallback((message, title) => {
    return addToast({ type: 'warning', message, title, requireAck: true });
  }, [addToast]);

  const showInfoAck = useCallback((message, title) => {
    return addToast({ type: 'info', message, title, requireAck: true });
  }, [addToast]);

  // Modal confirmation functions (blocking)
  const showSuccessModal = useCallback((message, title) => {
    return addModal({ type: 'success', message, title });
  }, [addModal]);

  const showErrorModal = useCallback((message, title) => {
    return addModal({ type: 'error', message, title });
  }, [addModal]);

  const showWarningModal = useCallback((message, title) => {
    return addModal({ type: 'warning', message, title });
  }, [addModal]);

  const showInfoModal = useCallback((message, title) => {
    return addModal({ type: 'info', message, title });
  }, [addModal]);

  // Special modal for privilege errors
  const showPrivilegeError = useCallback((message) => {
    return addModal({
      type: 'warning',
      message,
      title: 'Insufficient Privileges'
    });
  }, [addModal]);

  // Generic showToast function that accepts (message, type, title, requireAck)
  const showToast = useCallback((message, type = 'info', title, requireAck = false) => {
    return addToast({ type, message, title, requireAck });
  }, [addToast]);

  const value = {
    showToast, // Generic function
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showSuccessAck,
    showErrorAck,
    showWarningAck,
    showInfoAck,
    showSuccessModal,
    showErrorModal,
    showWarningModal,
    showInfoModal,
    showPrivilegeError,
    addToast,
    removeToast,
    addModal,
    removeModal
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              toast={toast}
              onClose={removeToast}
            />
          ))}
        </div>
      )}

      {/* Modal Confirmations */}
      {modals.map(modal => (
        <ModalConfirmation
          key={modal.id}
          modal={modal}
          onClose={removeModal}
        />
      ))}
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

ToastProvider.displayName = 'ToastProvider';