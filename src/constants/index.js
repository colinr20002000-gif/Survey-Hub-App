/**
 * Application-wide constants
 */

// Job/Delivery Tracker statuses
export const jobStatuses = [
    "Site Not Started",
    "Site Work Completed",
    "Delivered",
    "Postponed",
    "Cancelled",
    "On Hold",
    "Revisit Required"
];

// Shift colors for resource calendar
// Color scheme designed for high contrast and readability
export const shiftColors = {
    Days: 'bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-blue-50',
    Evening: 'bg-orange-100 text-orange-900 dark:bg-orange-700 dark:text-orange-50',
    Nights: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-50',
};

// Leave type colors for resource calendar
// All leave types use the same purple color for consistency
// Updated for better visibility in light mode
export const leaveColors = {
    'Annual Leave': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Annual Leave (am)': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Annual Leave (pm)': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Bank Holiday': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Office (Haydock)': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Office (Home)': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Training': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Stand Down': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Sick Day': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Rest Day': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Compassionate Leave': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Enforced Rest': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Travel Shift': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Paternity Leave': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'Xmas': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
    'No Assignment': 'bg-purple-300 text-purple-950 dark:bg-purple-800 dark:text-purple-50',
};

// Announcement priorities
export const ANNOUNCEMENT_PRIORITIES = {
    low: { label: 'Low', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
    medium: { label: 'Medium', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900' },
    high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900' },
    urgent: { label: 'Urgent', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900' }
};

// Notification delivery methods
export const NOTIFICATION_METHODS = {
    push: 'Browser Push',
    email: 'Email',
    sms: 'SMS',
    all: 'All Methods'
};
