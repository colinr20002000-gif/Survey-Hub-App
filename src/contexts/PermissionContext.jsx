import React, { createContext, useContext } from 'react';
import { useDynamicPermissions } from '../hooks/useDynamicPermissions';

export const PermissionContext = createContext(null);

/**
 * Provider component that wraps the app and provides dynamic permissions
 */
export const PermissionProvider = ({ children }) => {
    const permissionData = useDynamicPermissions();

    return (
        <PermissionContext.Provider value={permissionData}>
            {children}
        </PermissionContext.Provider>
    );
};

/**
 * Hook to access the permission context
 * @returns {Object} - Permission data and methods
 */
export const usePermissionContext = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissionContext must be used within a PermissionProvider');
    }
    return context;
};
