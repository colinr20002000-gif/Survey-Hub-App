-- Update notifications table to support task assignment notifications
-- This migration updates the existing notifications table structure

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add dismissed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'dismissed'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN dismissed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added dismissed column';
    END IF;

    -- Add dismissed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'dismissed_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN dismissed_at TIMESTAMPTZ;
        RAISE NOTICE 'Added dismissed_at column';
    END IF;

    -- Add data column if it doesn't exist (for storing task metadata)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'data'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added data column';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column';
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'system';
        RAISE NOTICE 'Added type column';
    END IF;
END $$;

-- Update type column to support task assignment types if needed
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    RAISE NOTICE 'Dropped old type check constraint if existed';

    -- Add updated check constraint for type column
    ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('task_assignment', 'announcement', 'system', 'project_task', 'delivery_task'));
    RAISE NOTICE 'Added updated type check constraint';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Type check constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding type check constraint: %', SQLERRM;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_dismissed ON public.notifications(user_id, dismissed) WHERE dismissed = false;

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies and create new ones
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

-- Create RLS policies

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can only update their own notifications (mark as read/dismissed)
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Notifications table updated successfully';
    RAISE NOTICE '✅ RLS policies applied';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Ready for task assignment notifications';
END $$;
