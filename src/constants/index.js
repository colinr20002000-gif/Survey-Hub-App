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
export const shiftColors = {
    Days: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
    Evening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/60 dark:text-yellow-200',
    Nights: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200',
};

// Leave type colors for resource calendar
export const leaveColors = {
    'Annual Leave': 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    'Bank Holiday': 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    'Office (Haydock)': 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
    'Office (Home)': 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    'Training': 'bg-gray-200 text-gray-800 dark:bg-gray-700/60 dark:text-gray-200',
    'Stand Down': 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    'Sick Day': 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    'Rest Day': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
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
