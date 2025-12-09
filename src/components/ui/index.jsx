import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// Card Component
export const Card = ({ title, icon, children, className, ...props }) => (
    <div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
        {...props}
    >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
            {icon}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white ml-2">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// Combobox Component
export const Combobox = ({ label, name, value, onChange, options = [], placeholder, required, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes((value || '').toLowerCase()) && option !== value
    );

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className || ''}`} ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
            <input
                type="text"
                name={name}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete="off"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    disabled
                        ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
            />
            {isOpen && filteredOptions.length > 0 && !disabled && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.map((option, index) => (
                        <div
                            key={index}
                            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-600 cursor-pointer"
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ReadOnlyField Component
export const ReadOnlyField = ({ label, value, className }) => (
    <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
        <div className="text-sm font-medium text-gray-900 dark:text-white min-h-[20px]">
            {value || '-'}
        </div>
    </div>
);

// Input Component
export const Input = ({ label, disabled, className, list, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <input
            {...props}
            disabled={disabled}
            list={list}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                disabled
                    ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
            } ${className || ''}`}
        />
    </div>
);

// Select Component
export const Select = ({ label, children, className, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <select {...props} className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}>
            {children}
        </select>
    </div>
);

// Button Component
export const Button = ({ children, variant = 'primary', size = 'md', ...props }) => {
    const baseClasses = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 flex items-center justify-center";
    const variants = {
        primary: 'text-white bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
        success: 'text-white bg-green-500 hover:bg-green-600 focus:ring-green-500',
        outline: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-orange-500',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
     const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
    };
    return <button {...props} className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}>{children}</button>;
};

// Switch Component
export const Switch = ({ isChecked, onToggle, id }) => (
    <button
        id={id}
        type="button"
        className={`${isChecked ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
        onClick={onToggle}
    >
        <span className={`${isChecked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
    </button>
);

// Modal Component
export const Modal = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-700 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

// ConfirmationModal Component
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmVariant = "primary" }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" disableBackdropClick={true}>
        <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>
            </div>
        </div>
    </Modal>
);

// StatusBadge Component
export const StatusBadge = ({ status }) => {
    const statusClasses = {
        'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Planning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'On Hold': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Archived': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        'Site Not Started': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Site Work Completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Postponed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
        'Revisit Required': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        // Audit Trail Actions
        'LOGIN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'LOGOUT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'CREATE': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'UPDATE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'VIEW': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        'SYSTEM_EVENT': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        // Task Statuses
        'To Do': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusClasses[status] || statusClasses['On Hold']}`}>{status}</span>;
};

// Pagination Component
export const Pagination = ({ currentPage, setCurrentPage, totalPages, itemsPerPage, setItemsPerPage, totalItems }) => {
    if (!totalPages || totalPages <= 1) return null;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-700 dark:text-gray-400">
            <div className="flex items-center mb-2 md:mb-0">
                {itemsPerPage && setItemsPerPage ? (
                    <>
                        <span>Rows per page:</span>
                        <Select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="ml-2 !py-1 !text-sm">
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </Select>
                        <span className="ml-4">
                            {startItem}-{endItem} of {totalItems}
                        </span>
                    </>
                ) : (
                    <span>
                        Showing {startItem}-{endItem} of {totalItems}
                    </span>
                )}
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={14} className="mr-[-4px]"/><ChevronLeft size={14}/></button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16}/></button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16}/></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={14} className="ml-[-4px]"/><ChevronRight size={14}/></button>
            </div>
        </div>
    );
};
