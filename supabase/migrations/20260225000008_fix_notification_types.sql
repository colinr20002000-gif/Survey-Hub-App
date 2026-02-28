-- Fix notifications type constraint to support timesheets
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- Add updated check constraint including timesheet types
    ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assignment', 
        'announcement', 
        'system', 
        'project_task', 
        'delivery_task',
        'timesheet_rejected',
        'timesheet_approved'
    ));
    
    RAISE NOTICE '✅ Notification types updated successfully';
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
