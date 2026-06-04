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
 * Week 1 starts on the first Saturday of April that results in at least 4 days of April in that week.
 * This is equivalent to saying Week 1 starts on the Saturday of the week containing April 1st,
 * UNLESS April 1st is Wednesday, Thursday, or Friday (in which case Week 1 starts the following Saturday).
 * @param {Date} d - The date to get the fiscal week for
 * @returns {number} - The fiscal week number (1-52/53)
 */
export const getFiscalWeek = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);

    const getWeek1Saturday = (year) => {
        const apr1 = new Date(year, 3, 1); // Month 3 = April
        let week1Sat = getWeekStartDate(apr1);
        
        // If April 1st is Wed (3), Thu (4), or Fri (5), the week has only 1-3 days in April.
        // In these cases, Week 1 starts the following Saturday.
        const apr1Day = apr1.getDay();
        if (apr1Day === 3 || apr1Day === 4 || apr1Day === 5) {
            week1Sat.setDate(week1Sat.getDate() + 7);
        }
        return week1Sat;
    };

    const year = date.getFullYear();
    const currentYearWeek1 = getWeek1Saturday(year);

    let fiscalYearStartSat;
    if (date < currentYearWeek1) {
        // Date is before this year's fiscal start, so it belongs to the previous fiscal year
        fiscalYearStartSat = getWeek1Saturday(year - 1);
    } else {
        fiscalYearStartSat = currentYearWeek1;
    }

    // Get the Saturday of the current week
    const currentWeekStart = getWeekStartDate(date);

    // Calculate the difference in days - use exact milliseconds to avoid DST issues
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.round((currentWeekStart.getTime() - fiscalYearStartSat.getTime()) / msPerDay);

    // Divide by 7 to get weeks, add 1 because Week 1 starts at fiscalYearStartSat
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
