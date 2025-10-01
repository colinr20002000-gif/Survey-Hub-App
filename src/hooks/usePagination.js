import { useState, useMemo } from 'react';

// This custom hook handles all the logic for splitting large lists into pages
// Like when you see "Page 1 of 10" with "Next" and "Previous" buttons
// Perfect for survey results, user lists, project lists, etc.
export const usePagination = (data, itemsPerPage = 10) => {
  // Keep track of which page we're currently on (starts at page 1)
  const [currentPage, setCurrentPage] = useState(1);
  
  // Keep track of how many items to show per page (can be changed by user)
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);

  // Calculate some basic numbers we need for pagination
  const totalItems = data.length; // How many items total
  const totalPages = Math.ceil(totalItems / itemsPerPageState); // How many pages needed

  // This calculates which specific items to show on the current page
  // We use useMemo so it only recalculates when data, page, or items-per-page changes
  const paginatedData = useMemo(() => {
    // Figure out where to start slicing the array
    // Page 1 starts at index 0, page 2 starts at index 10 (if showing 10 per page), etc.
    const startIndex = (currentPage - 1) * itemsPerPageState;
    
    // Slice out just the items for this page
    return data.slice(startIndex, startIndex + itemsPerPageState);
  }, [data, currentPage, itemsPerPageState]);

  // Helper functions to navigate between pages
  
  // Go to a specific page number (but stay within valid range)
  const goToPage = (page) => {
    // Make sure we don't go below 1 or above the maximum page number
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Go to the next page (but don't go past the last page)
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Go to the previous page (but don't go below page 1)
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Change how many items we show per page
  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPageState(newItemsPerPage);
    setCurrentPage(1); // Always go back to page 1 when changing this
  };

  // Return everything a component needs to display pagination
  return {
    // Current state information
    currentPage,           // What page we're on (1, 2, 3, etc.)
    totalPages,           // How many pages total
    totalItems,           // How many items total
    itemsPerPage: itemsPerPageState, // How many items per page
    paginatedData,        // The actual items to display on this page
    
    // Functions to control pagination
    goToPage,             // Jump to a specific page
    goToNextPage,         // Go forward one page
    goToPreviousPage,     // Go back one page
    changeItemsPerPage,   // Change how many items per page
    setCurrentPage,       // Direct page setter (for advanced use)
    setItemsPerPage: setItemsPerPageState, // Direct items-per-page setter
  };
};