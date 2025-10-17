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
 * Get the fiscal week number for a given date (April to April fiscal year)
 * @param {Date} d - The date to get the fiscal week for
 * @returns {number} - The fiscal week number (1-52/53)
 */
export const getFiscalWeek = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);

    // Determine fiscal year start (April 1st)
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0-indexed (0 = Jan, 3 = April)

    // If date is before April, fiscal year started previous year
    // If date is April or later, fiscal year started this year
    const fiscalYearStart = new Date(currentMonth < 3 ? currentYear - 1 : currentYear, 3, 1); // Month 3 = April
    fiscalYearStart.setHours(0, 0, 0, 0);

    // Find the Saturday of the week that CONTAINS April 1st (Week 1 start)
    const firstSaturday = getWeekStartDate(fiscalYearStart);

    // Get the Saturday of the current week
    const currentWeekStart = getWeekStartDate(date);

    // Calculate the difference in days - use exact milliseconds to avoid DST issues
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.round((currentWeekStart.getTime() - firstSaturday.getTime()) / msPerDay);

    // Divide by 7 to get weeks, add 1 because Week 1 starts at firstSaturday
    const weekNumber = Math.floor(daysDiff / 7) + 1;

    return weekNumber;
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
    // Ensure time is normalized to avoid DST issues
    result.setHours(0, 0, 0, 0);
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
