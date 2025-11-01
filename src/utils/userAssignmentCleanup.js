import { supabase } from '../supabaseClient';

/**
 * Utility functions to automatically return equipment and vehicles when users are deactivated/deleted
 */

/**
 * Get all active equipment assignments for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of active equipment assignments
 */
export const getUserActiveEquipmentAssignments = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('equipment_assignments')
            .select(`
                *,
                equipment:equipment_id (
                    id,
                    name,
                    serial_number
                )
            `)
            .eq('user_id', userId)
            .is('returned_at', null);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user equipment assignments:', error);
        return [];
    }
};

/**
 * Get all active vehicle assignments for a user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of active vehicle assignments
 */
export const getUserActiveVehicleAssignments = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('vehicle_assignments')
            .select(`
                *,
                vehicle:vehicle_id (
                    id,
                    name,
                    serial_number
                )
            `)
            .eq('user_id', userId)
            .is('returned_at', null);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user vehicle assignments:', error);
        return [];
    }
};

/**
 * Automatically return all equipment assigned to a user
 * @param {string} userId - The ID of the user
 * @param {string} performedByUserId - The ID of the user performing the action
 * @param {string} reason - Reason for the return (e.g., "User deactivated", "User deleted")
 * @returns {Promise<Object>} Result with success status and returned items count
 */
export const returnAllUserEquipment = async (userId, performedByUserId, reason = 'User deactivated') => {
    try {
        // Get all active equipment assignments for the user
        const assignments = await getUserActiveEquipmentAssignments(userId);

        if (assignments.length === 0) {
            return { success: true, returned: 0, equipment: [] };
        }

        const returnInfo = {
            message: reason,
            returned_by_user_id: performedByUserId,
            returned_at: new Date().toISOString()
        };

        // Return all equipment
        const { error: updateError } = await supabase
            .from('equipment_assignments')
            .update({
                returned_at: new Date().toISOString(),
                return_notes: JSON.stringify(returnInfo),
                returned_by: performedByUserId
            })
            .eq('user_id', userId)
            .is('returned_at', null);

        if (updateError) throw updateError;

        // Log audit entries for each returned equipment
        for (const assignment of assignments) {
            try {
                await supabase
                    .from('equipment_audit_log')
                    .insert({
                        equipment_id: assignment.equipment_id,
                        action_type: 'returned',
                        user_id: userId,
                        performed_by_user_id: performedByUserId,
                        previous_user_id: userId,
                        details: `Equipment automatically returned: ${reason}`,
                        metadata: JSON.stringify({
                            equipment_name: assignment.equipment?.name || 'Unknown Equipment',
                            auto_return: true,
                            reason
                        })
                    });
            } catch (auditError) {
                console.error('Error logging equipment audit:', auditError);
                // Continue with other equipment even if audit logging fails
            }
        }

        return {
            success: true,
            returned: assignments.length,
            equipment: assignments.map(a => ({
                name: a.equipment?.name || 'Unknown Equipment',
                serialNumber: a.equipment?.serial_number
            }))
        };

    } catch (error) {
        console.error('Error returning user equipment:', error);
        return {
            success: false,
            error: error.message,
            returned: 0,
            equipment: []
        };
    }
};

/**
 * Automatically return all vehicles assigned to a user
 * @param {string} userId - The ID of the user
 * @param {string} performedByUserId - The ID of the user performing the action
 * @param {string} reason - Reason for the return (e.g., "User deactivated", "User deleted")
 * @returns {Promise<Object>} Result with success status and returned items count
 */
export const returnAllUserVehicles = async (userId, performedByUserId, reason = 'User deactivated') => {
    try {
        // Get all active vehicle assignments for the user
        const assignments = await getUserActiveVehicleAssignments(userId);

        if (assignments.length === 0) {
            return { success: true, returned: 0, vehicles: [] };
        }

        const returnInfo = {
            message: reason,
            returned_by_user_id: performedByUserId,
            returned_at: new Date().toISOString()
        };

        // Return all vehicles
        const { error: updateError } = await supabase
            .from('vehicle_assignments')
            .update({
                returned_at: new Date().toISOString(),
                return_notes: JSON.stringify(returnInfo),
                returned_by: performedByUserId
            })
            .eq('user_id', userId)
            .is('returned_at', null);

        if (updateError) throw updateError;

        // Log audit entries for each returned vehicle
        for (const assignment of assignments) {
            try {
                await supabase
                    .from('vehicle_audit_log')
                    .insert({
                        vehicle_id: assignment.vehicle_id,
                        action_type: 'returned',
                        user_id: userId,
                        performed_by_user_id: performedByUserId,
                        previous_user_id: userId,
                        details: `Vehicle automatically returned: ${reason}`,
                        metadata: JSON.stringify({
                            vehicle_name: assignment.vehicle?.name || 'Unknown Vehicle',
                            auto_return: true,
                            reason
                        })
                    });
            } catch (auditError) {
                console.error('Error logging vehicle audit:', auditError);
                // Continue with other vehicles even if audit logging fails
            }
        }

        return {
            success: true,
            returned: assignments.length,
            vehicles: assignments.map(a => ({
                name: a.vehicle?.name || 'Unknown Vehicle',
                serialNumber: a.vehicle?.serial_number
            }))
        };

    } catch (error) {
        console.error('Error returning user vehicles:', error);
        return {
            success: false,
            error: error.message,
            returned: 0,
            vehicles: []
        };
    }
};

/**
 * Check if a user has any active equipment or vehicle assignments
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} Object with counts of active assignments
 */
export const checkUserActiveAssignments = async (userId) => {
    try {
        const [equipmentAssignments, vehicleAssignments] = await Promise.all([
            getUserActiveEquipmentAssignments(userId),
            getUserActiveVehicleAssignments(userId)
        ]);

        return {
            equipment: equipmentAssignments.length,
            vehicles: vehicleAssignments.length,
            total: equipmentAssignments.length + vehicleAssignments.length,
            equipmentList: equipmentAssignments.map(a => ({
                name: a.equipment?.name || 'Unknown Equipment',
                serialNumber: a.equipment?.serial_number
            })),
            vehicleList: vehicleAssignments.map(a => ({
                name: a.vehicle?.name || 'Unknown Vehicle',
                serialNumber: a.vehicle?.serial_number
            }))
        };
    } catch (error) {
        console.error('Error checking user assignments:', error);
        return {
            equipment: 0,
            vehicles: 0,
            total: 0,
            equipmentList: [],
            vehicleList: []
        };
    }
};

/**
 * Automatically return all equipment and vehicles for a user
 * @param {string} userId - The ID of the user
 * @param {string} performedByUserId - The ID of the user performing the action
 * @param {string} reason - Reason for the return
 * @returns {Promise<Object>} Combined result of all returns
 */
export const returnAllUserAssignments = async (userId, performedByUserId, reason = 'User deactivated') => {
    try {
        const [equipmentResult, vehicleResult] = await Promise.all([
            returnAllUserEquipment(userId, performedByUserId, reason),
            returnAllUserVehicles(userId, performedByUserId, reason)
        ]);

        return {
            success: equipmentResult.success && vehicleResult.success,
            equipment: equipmentResult,
            vehicles: vehicleResult,
            totalReturned: equipmentResult.returned + vehicleResult.returned,
            errors: [
                ...(equipmentResult.success ? [] : [equipmentResult.error]),
                ...(vehicleResult.success ? [] : [vehicleResult.error])
            ].filter(Boolean)
        };
    } catch (error) {
        console.error('Error returning all user assignments:', error);
        return {
            success: false,
            equipment: { success: false, returned: 0, equipment: [] },
            vehicles: { success: false, returned: 0, vehicles: [] },
            totalReturned: 0,
            errors: [error.message]
        };
    }
};