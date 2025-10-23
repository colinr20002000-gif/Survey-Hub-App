/**
 * Department to Avatar Color Mapping
 * Returns consistent Tailwind CSS classes for avatar backgrounds based on department
 */

export const getDepartmentColor = (department) => {
    if (!department) return 'bg-gray-500'; // Default for no department

    const departmentLower = department.toLowerCase().trim();

    const colorMap = {
        'site team': 'bg-orange-600',        // Orange for Site team
        'project team': 'bg-blue-600',       // Blue for Project team
        'delivery team': 'bg-green-600',     // Green for Delivery team
        'design team': 'bg-purple-600',      // Purple for Design team
        'office staff': 'bg-indigo-600',     // Indigo for Office staff
        'subcontractor': 'bg-cyan-600',      // Cyan for Subcontractor
    };

    return colorMap[departmentLower] || 'bg-gray-500';
};

/**
 * Get user's avatar initials from their name or avatar field
 */
export const getAvatarText = (user) => {
    if (!user) return '?';

    if (user.avatar && user.avatar.trim()) {
        return user.avatar.toUpperCase();
    }

    if (user.name) {
        const nameParts = user.name.trim().split(' ');
        if (nameParts.length >= 2) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
    }

    if (user.username) {
        return user.username.substring(0, 2).toUpperCase();
    }

    return '?';
};

/**
 * Avatar component props helper
 * Returns an object with className and text for rendering an avatar
 */
export const getAvatarProps = (user, size = 'md') => {
    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-7 h-7 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-9 h-9 text-base',
        xl: 'w-12 h-12 text-lg',
    };

    const bgColor = getDepartmentColor(user?.department);
    const sizeClass = sizeClasses[size] || sizeClasses.md;

    return {
        className: `${sizeClass} rounded-full ${bgColor} text-white flex items-center justify-center font-bold`,
        text: getAvatarText(user),
    };
};
