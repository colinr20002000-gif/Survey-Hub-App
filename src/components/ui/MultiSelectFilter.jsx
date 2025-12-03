import React, { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';

const MultiSelectFilter = ({ options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const selectAll = () => onChange(options);
    const clearAll = () => onChange([]);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-gray-700 dark:text-white ${
                    selectedValues.length > 0 ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-300 dark:border-gray-600'
                }`}
            >
                <span className="truncate">
                    {selectedValues.length === 0 
                        ? 'All' 
                        : selectedValues.length === options.length 
                            ? 'All' 
                            : `${selectedValues.length} selected`}
                </span>
                <Filter className="w-3 h-3 ml-1 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-48 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                        <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">Clear</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {options.map(option => (
                            <label key={option} className="flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded">
                                <input 
                                    type="checkbox" 
                                    checked={selectedValues.includes(option)}
                                    onChange={() => toggleOption(option)}
                                    className="w-3 h-3 mr-2 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{option === '' ? '(Blanks)' : option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectFilter;