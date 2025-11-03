/**
 * RLS Error Handler
 *
 * Handles Row Level Security errors from Supabase and returns
 * user-friendly messages based on the operation and table.
 */

/**
 * Check if an error is an RLS (Row Level Security) error
 * @param {Object} error - Supabase error object
 * @returns {boolean}
 */
export const isRLSError = (error) => {
  return error?.code === '42501' ||
         error?.message?.includes('row-level security') ||
         error?.message?.includes('policy');
};

/**
 * Get a user-friendly error message for RLS violations
 * @param {Object} error - Supabase error object
 * @param {string} operation - The operation being performed (insert, update, delete)
 * @param {string} resourceName - The name of the resource (e.g., "project", "allocation")
 * @returns {string} User-friendly error message
 */
export const getRLSErrorMessage = (error, operation = 'perform this action', resourceName = '') => {
  if (!isRLSError(error)) {
    return error?.message || 'An unexpected error occurred';
  }

  // Default insufficient privilege message
  const privilegeMessage = 'You do not have the appropriate privilege to perform this action.';

  // Custom messages based on operation
  const operationMessages = {
    insert: `create ${resourceName || 'this item'}`,
    update: `modify ${resourceName || 'this item'}`,
    delete: `delete ${resourceName || 'this item'}`,
    select: `view ${resourceName || 'this data'}`,
  };

  const action = operationMessages[operation.toLowerCase()] || operation;

  return `Insufficient Privileges: You do not have permission to ${action}.`;
};

/**
 * Get specific error messages for known RLS scenarios
 * @param {string} tableName - The table where the RLS error occurred
 * @param {string} operation - The operation being performed
 * @param {Object} data - The data being operated on (optional)
 * @returns {string} Specific error message
 */
export const getSpecificRLSMessage = (tableName, operation, data = null) => {
  const messages = {
    projects: {
      insert: 'You need Editor privileges or higher to create projects.',
      update: 'You need Editor privileges or higher to modify projects.',
      delete: 'You need Editor privileges or higher to delete projects.',
    },
    tasks: {
      insert: 'You need Editor privileges or higher to create tasks.',
      update: 'You need Viewer+ privileges or higher to complete tasks.',
      delete: 'You need Editor privileges or higher to delete tasks.',
    },
    delivery_tasks: {
      insert: 'You need Editor privileges or higher to create delivery tasks.',
      update: 'You need Editor privileges or higher to modify delivery tasks.',
      delete: 'You need Editor privileges or higher to delete delivery tasks.',
    },
    resource_allocations: {
      insert: (data?.assignment_type === 'project' || data?.assignment_type === 'leave' || data?.type === 'project' || data?.type === 'leave')
        ? 'You need Editor privileges or higher to update resource assignments.'
        : 'You need Viewer privileges or higher to update availability.',
      update: (data?.assignment_type === 'project' || data?.assignment_type === 'leave' || data?.type === 'project' || data?.type === 'leave')
        ? 'You need Editor privileges or higher to update resource assignments.'
        : 'You need Viewer privileges or higher to update availability.',
      delete: (data?.assignment_type === 'project' || data?.assignment_type === 'leave' || data?.type === 'project' || data?.type === 'leave')
        ? 'You need Editor privileges or higher to delete resource allocations.'
        : 'You need Viewer privileges or higher to delete availability status.',
    },
    equipment: {
      insert: 'You need Editor privileges or higher to add equipment.',
      update: 'You need Editor privileges or higher to modify equipment.',
      delete: 'You need Editor privileges or higher to delete equipment.',
    },
    equipment_assignments: {
      insert: 'You need Viewer+ privileges or higher to assign equipment.',
      update: 'You need Viewer+ privileges or higher to modify equipment assignments.',
      delete: 'You need Viewer+ privileges or higher to return equipment.',
    },
    equipment_comments: {
      insert: 'You need Viewer+ privileges or higher to add equipment comments.',
      update: 'You can only edit your own comments, or you need Editor privileges to edit others.',
      delete: 'You can only delete your own comments, or you need Editor privileges to delete others.',
    },
    vehicles: {
      insert: 'You need Editor privileges or higher to add vehicles.',
      update: 'You need Editor privileges or higher to modify vehicles.',
      delete: 'You need Editor privileges or higher to delete vehicles.',
    },
    vehicle_assignments: {
      insert: 'You need Viewer+ privileges or higher to assign vehicles.',
      update: 'You need Viewer+ privileges or higher to modify vehicle assignments.',
      delete: 'You need Viewer+ privileges or higher to return vehicles.',
    },
    vehicle_comments: {
      insert: 'You need Viewer+ privileges or higher to add vehicle comments.',
      update: 'You can only edit your own comments, or you need Editor privileges to edit others.',
      delete: 'You can only delete your own comments, or you need Editor privileges to delete others.',
    },
    announcements: {
      insert: 'You need Editor+ privileges or higher to create announcements.',
      update: 'You need Editor+ privileges or higher to modify announcements.',
      delete: 'You need Editor+ privileges or higher to delete announcements.',
    },
    document_files: {
      select: 'You need Viewer+ privileges or higher to download files.',
      insert: 'You need Editor privileges or higher to upload files.',
      update: 'You need Editor privileges or higher to modify files.',
      delete: 'You need Editor privileges or higher to delete files.',
    },
    feedback: {
      select: 'You need Admin privileges to view feedback.',
      insert: 'All users can submit feedback.',
      update: 'You need Admin privileges to manage feedback.',
      delete: 'You need Admin privileges to delete feedback.',
    },
    audit_logs: {
      select: 'You need Admin privileges to view audit logs.',
    },
    dropdown_categories: {
      insert: 'You need Admin privileges to add dropdown categories.',
      update: 'You need Admin privileges to modify dropdown categories.',
      delete: 'You need Admin privileges to delete dropdown categories.',
    },
    dropdown_items: {
      insert: 'You need Admin privileges to add dropdown items.',
      update: 'You need Admin privileges to modify dropdown items.',
      delete: 'You need Admin privileges to delete dropdown items.',
    },
    users: {
      insert: 'You need Admin privileges to create users.',
      delete: 'You need Admin privileges to delete users.',
    },
  };

  return messages[tableName]?.[operation] || 'You do not have the appropriate privilege to perform this action.';
};

/**
 * Handle Supabase error and return user-friendly message
 * @param {Object} error - Supabase error object
 * @param {string} tableName - The table where the error occurred
 * @param {string} operation - The operation being performed
 * @param {Object} data - The data being operated on (optional)
 * @returns {string} User-friendly error message
 */
export const handleSupabaseError = (error, tableName, operation, data = null) => {
  if (isRLSError(error)) {
    return getSpecificRLSMessage(tableName, operation, data);
  }

  // Handle other common Supabase errors
  if (error?.code === '23505') {
    return 'This item already exists. Please use a unique value.';
  }

  if (error?.code === '23503') {
    return 'Cannot complete this action because it would break a relationship with other data.';
  }

  if (error?.code === '23502') {
    return 'Required fields are missing. Please fill in all required information.';
  }

  // Default error message
  return error?.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Example usage in your components:
 *
 * import { handleSupabaseError } from '../utils/rlsErrorHandler';
 *
 * const handleCreateProject = async (projectData) => {
 *   const { data, error } = await supabase
 *     .from('projects')
 *     .insert(projectData);
 *
 *   if (error) {
 *     const errorMessage = handleSupabaseError(error, 'projects', 'insert');
 *     alert(errorMessage); // or use your toast/notification system
 *     return;
 *   }
 *
 *   // Success handling...
 * };
 */
