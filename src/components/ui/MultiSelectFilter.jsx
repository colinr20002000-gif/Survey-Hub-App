import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Search, X, Check } from 'lucide-react';

const MultiSelectFilter = ({ options, selectedValues, onChange, placeholder = 'Select options...', label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Update position for portal rendering
    const updatePosition = () => {
        if (containerRef.current) {
            const anchor = containerRef.current.querySelector('button');
            if (anchor) {
                const anchorRect = anchor.getBoundingClientRect();
                setCoords({
                    top: anchorRect.bottom + window.scrollY,
                    left: anchorRect.left + window.scrollX,
                    width: anchorRect.width
                });
            }
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current && 
                !containerRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset search when opening
    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    // Standardize options to { value, label }
    const normalizedOptions = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'string') return { value: opt, label: opt };
            return opt;
        });
    }, [options]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return normalizedOptions;
        return normalizedOptions.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [normalizedOptions, searchTerm]);

    const toggleOption = (value) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const selectAll = () => onChange(normalizedOptions.map(o => o.value));
    const clearAll = () => onChange([]);

    const getDisplayText = () => {
        if (selectedValues.length === 0) return 'All';
        if (selectedValues.length === normalizedOptions.length) return 'All';
        if (selectedValues.length === 1) {
            const selected = normalizedOptions.find(o => o.value === selectedValues[0]);
            return selected ? selected.label : `${selectedValues.length} selected`;
        }
        return `${selectedValues.length} selected`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full min-h-[38px] px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:text-white transition-all ${
                    selectedValues.length > 0 && selectedValues.length < normalizedOptions.length
                        ? 'border-orange-500 ring-1 ring-orange-500' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            >
                <span className="truncate mr-2">
                    {getDisplayText()}
                </span>
                <div className="flex items-center gap-1">
                    {selectedValues.length > 0 && (
                        <X 
                            className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" 
                            onClick={(e) => {
                                e.stopPropagation();
                                clearAll();
                            }}
                        />
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed z-[9999] mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    style={{
                        top: coords.top - window.scrollY,
                        left: coords.left - window.scrollX,
                        width: coords.width,
                        minWidth: '200px'
                    }}
                >
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 dark:text-white"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <button type="button" onClick={selectAll} className="text-[10px] uppercase tracking-wider font-bold text-orange-600 hover:text-orange-700">Select All</button>
                            <button type="button" onClick={clearAll} className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700">Clear</button>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-500">No results found</div>
                        ) : (
                            filteredOptions.map(option => (
                                <label 
                                    key={option.value} 
                                    className={`flex items-center px-3 py-2 hover:bg-orange-50 dark:hover:bg-gray-700/50 cursor-pointer rounded-md transition-colors ${
                                        selectedValues.includes(option.value) ? 'bg-orange-50/50 dark:bg-orange-500/10' : ''
                                    }`}
                                >
                                    <input 
                                        type="checkbox"
                                        className="sr-only"
                                        checked={selectedValues.includes(option.value)}
                                        onChange={() => toggleOption(option.value)}
                                    />
                                    <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded transition-colors ${
                                        selectedValues.includes(option.value)
                                            ? 'bg-orange-500 border-orange-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        {selectedValues.includes(option.value) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </div>
                                    <span className={`text-sm truncate ${
                                        selectedValues.includes(option.value) 
                                            ? 'text-orange-700 dark:text-orange-400 font-medium' 
                                            : 'text-gray-700 dark:text-gray-200'
                                    }`}>
                                        {option.label === '' ? '(Blanks)' : option.label}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// Simple ChevronDown icon
const ChevronDown = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
    </svg>
);

export default MultiSelectFilter;