/**
 * Date Utility Functions
 * These functions help us work with dates in the survey application
 */

// This function takes any date and finds the Monday of that week
// For example, if you give it a Wednesday, it returns the Monday of that same week
export const getWeekStartDate = (date) => {
  // Make a copy of the date so we don't modify the original
  const d = new Date(date);
  
  // Get what day of the week it is (0=Sunday, 1=Monday, etc.)
  const day = d.getDay();
  
  // Calculate how many days to subtract to get to Monday
  // If it's Sunday (0), we go back 6 days. Otherwise, we go back (day-1) days
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  // Set the date to Monday and return it
  return new Date(d.setDate(diff));
};

// This function calculates which week of the fiscal year a date falls in
// The fiscal year starts on April 6th (common in UK business)
export const getFiscalWeek = (date) => {
  // Create April 6th of the same year as our starting point
  const startOfYear = new Date(date.getFullYear(), 3, 6); // Month 3 = April (0-based)
  
  // Calculate how many milliseconds have passed since the fiscal year started
  const diff = date - startOfYear;
  
  // Convert milliseconds to days (1000ms × 60s × 60min × 24hr = 1 day)
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Divide by 7 to get weeks, round up to get the week number
  return Math.ceil((dayOfYear + 1) / 7);
};

// This function adds a specific number of days to a date
// For example, adding 5 days to Monday gives you Saturday
export const addDays = (date, days) => {
  // Make a copy of the original date so we don't change it
  const result = new Date(date);
  
  // Add the specified number of days
  result.setDate(result.getDate() + days);
  
  // Return the new date
  return result;
};

// This function formats a date to show only day and month in UK format
// For example: turns "2024-03-15" into "15/03"
export const formatDateForDisplay = (date) => {
  // Use UK date formatting (day/month) with 2-digit numbers
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
};

// This function formats a date as a string that's perfect for using as object keys
// For example: turns a Date object into "2024-03-15"
export const formatDateForKey = (date) => {
  // Get the 4-digit year
  const year = date.getFullYear();
  
  // Get the month (add 1 because getMonth() returns 0-11) and pad with zero if needed
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Get the day and pad with zero if needed (so "5" becomes "05")
  const day = String(date.getDate()).padStart(2, '0');
  
  // Combine them in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
};