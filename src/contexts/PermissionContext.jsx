import React, { createContext, useContext, useEffect } from 'react';
import { useDynamicPermissions } from '../hooks/useDynamicPermissions';
import { supabase } from '../supabaseClient';

export const PermissionContext = createContext(null);

/**
 * Provider component that wraps the app and provides dynamic permissions
 * Includes real-time subscription to permission changes
 */
export const PermissionProvider = ({ children }) => {
    const permissionData = useDynamicPermissions();

    useEffect(() => {
        // Subscribe to privilege_permissions table changes
        const channel = supabase
            .channel('privilege_permissions_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'privilege_permissions'
                },
                (payload) => {
                    console.log('🔄 Permission changed, refreshing...', payload);
                    // Debounce refresh to avoid too many updates
                    if (permissionData.refreshPermissions) {
                        setTimeout(() => {
                            permissionData.refreshPermissions();
                        }, 500);
                    }
                }
            )
            .subscribe();

        console.log('✅ Real-time permission sync enabled');

        return () => {
            console.log('🧹 Cleaning up real-time permission subscription');
            supabase.removeChannel(channel);
        };
    }, [permissionData]);

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
