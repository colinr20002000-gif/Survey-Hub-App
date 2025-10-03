/**
 * Date helper functions for resource calendar and other date-related operations
 */

/**
 * Get the Saturday (start of work week) for a given date
 * @param {Date} d - The date to get the week start for
 * @returns {Date} - The Saturday of that week
 */
export const getWeekStartDate = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    // Calculate days to subtract to get to Saturday (day 6)
    const diff = day === 6 ? 0 : -(day + 1);
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + diff);
    saturday.setHours(0, 0, 0, 0);
    return saturday;
};

/**
 * Get the fiscal week number for a given date
 * @param {Date} d - The date to get the fiscal week for
 * @returns {number} - The fiscal week number
 */
export const getFiscalWeek = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/**
 * Add days to a date
 * @param {Date} date - The starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} - The new date
 */
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Format date for display (e.g., "15 Jan")
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/**
 * Format date as YYYY-MM-DD for database keys
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const formatDateForKey = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
