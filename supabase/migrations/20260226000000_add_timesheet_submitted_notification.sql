-- Add timesheet_submitted to notification types
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- Add updated check constraint including timesheet_submitted
    ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assignment', 
        'announcement', 
        'system', 
        'project_task', 
        'delivery_task',
        'timesheet_rejected',
        'timesheet_approved',
        'timesheet_submitted'
    ));
    
    RAISE NOTICE '✅ Notification types updated to include timesheet_submitted';
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
