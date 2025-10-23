-- ============================================================================
-- Row Level Security (RLS) Implementation for Privilege System
-- ============================================================================
-- This migration implements database-level security based on user privileges
-- Privilege Levels: Viewer, Viewer+, Editor, Editor+, Admin, Super Admin
--
-- IMPORTANT: This enforces security at the database level, preventing bypassing
-- frontend checks via browser DevTools or direct API calls
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user's privilege level
CREATE OR REPLACE FUNCTION public.current_user_privilege()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT privilege
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has minimum privilege level
CREATE OR REPLACE FUNCTION public.has_min_privilege(required_privilege TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_priv TEXT;
  user_level NUMERIC;
  required_level NUMERIC;
  privilege_levels JSONB := '{
    "Viewer": 1,
    "Viewer+": 2,
    "Editor": 3,
    "Editor+": 3.5,
    "Admin": 4,
    "Super Admin": 5
  }'::jsonb;
BEGIN
  user_priv := public.current_user_privilege();

  -- Get numeric levels
  user_level := (privilege_levels->>user_priv)::NUMERIC;
  required_level := (privilege_levels->>required_privilege)::NUMERIC;

  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or above
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_min_privilege('Admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is editor or above
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_min_privilege('Editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is viewer+ or above
CREATE OR REPLACE FUNCTION public.is_viewer_plus()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_min_privilege('Viewer+');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
-- Note: Only enabling RLS on tables that exist

-- Core tables (with existence checks)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dummy_users') THEN
        ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_tasks') THEN
        ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_tasks') THEN
        ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
        ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Equipment & Vehicles
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment') THEN
        ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_assignments') THEN
        ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment_comments') THEN
        ALTER TABLE public.equipment_comments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
        ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_assignments') THEN
        ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_comments') THEN
        ALTER TABLE public.vehicle_comments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Resources
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resource_allocations') THEN
        ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dummy_resource_allocations') THEN
        ALTER TABLE public.dummy_resource_allocations ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Documents & Files (only enable if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_files') THEN
        ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_folders') THEN
        ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'policy_documents') THEN
        ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Admin tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback') THEN
        ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dropdown_categories') THEN
        ALTER TABLE public.dropdown_categories ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dropdown_items') THEN
        ALTER TABLE public.dropdown_items ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'useful_contacts') THEN
        ALTER TABLE public.useful_contacts ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'video_tutorials') THEN
        ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Notifications
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
        ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- ============================================================================
-- DROP ALL EXISTING POLICIES (for idempotency)
-- ============================================================================

-- This allows the migration to be run multiple times safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;


-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Everyone can view all users (needed for dropdowns, assignments, etc.)
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Only admins can insert new users
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can delete users
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- DUMMY USERS TABLE POLICIES
-- ============================================================================

-- Everyone can view dummy users
CREATE POLICY "dummy_users_select_all" ON public.dummy_users
  FOR SELECT
  USING (true);

-- Only admins can manage dummy users
CREATE POLICY "dummy_users_insert_admin" ON public.dummy_users
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "dummy_users_update_admin" ON public.dummy_users
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "dummy_users_delete_admin" ON public.dummy_users
  FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Everyone can view projects
CREATE POLICY "projects_select_all" ON public.projects
  FOR SELECT
  USING (true);

-- Editors+ can create projects
CREATE POLICY "projects_insert_editor" ON public.projects
  FOR INSERT
  WITH CHECK (public.is_editor());

-- Editors+ can update projects
CREATE POLICY "projects_update_editor" ON public.projects
  FOR UPDATE
  USING (public.is_editor());

-- Editors+ can delete projects
CREATE POLICY "projects_delete_editor" ON public.projects
  FOR DELETE
  USING (public.is_editor());


-- ============================================================================
-- TASKS TABLE POLICIES (Project Tasks)
-- ============================================================================

-- Everyone can view tasks
CREATE POLICY "tasks_select_all" ON public.tasks
  FOR SELECT
  USING (true);

-- Viewer+ can update tasks (complete them)
CREATE POLICY "tasks_update_viewer_plus" ON public.tasks
  FOR UPDATE
  USING (public.is_viewer_plus());

-- Editors+ can create tasks
CREATE POLICY "tasks_insert_editor" ON public.tasks
  FOR INSERT
  WITH CHECK (public.is_editor());

-- Editors+ can delete tasks
CREATE POLICY "tasks_delete_editor" ON public.tasks
  FOR DELETE
  USING (public.is_editor());


-- ============================================================================
-- DELIVERY TASKS & JOBS POLICIES
-- ============================================================================

-- Everyone can view delivery tasks
CREATE POLICY "delivery_tasks_select_all" ON public.delivery_tasks
  FOR SELECT
  USING (true);

-- Viewer+ can update delivery tasks (complete them)
CREATE POLICY "delivery_tasks_update_viewer_plus" ON public.delivery_tasks
  FOR UPDATE
  USING (public.is_viewer_plus());

-- Editors+ can manage delivery tasks
CREATE POLICY "delivery_tasks_insert_editor" ON public.delivery_tasks
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "delivery_tasks_delete_editor" ON public.delivery_tasks
  FOR DELETE
  USING (public.is_editor());

-- Jobs (Delivery Tracker)
CREATE POLICY "jobs_select_all" ON public.jobs
  FOR SELECT
  USING (true);

CREATE POLICY "jobs_update_viewer_plus" ON public.jobs
  FOR UPDATE
  USING (public.is_viewer_plus());

CREATE POLICY "jobs_insert_editor" ON public.jobs
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "jobs_delete_editor" ON public.jobs
  FOR DELETE
  USING (public.is_editor());


-- ============================================================================
-- EQUIPMENT POLICIES
-- ============================================================================

-- Everyone can view equipment
CREATE POLICY "equipment_select_all" ON public.equipment
  FOR SELECT
  USING (true);

-- Editors+ can manage equipment
CREATE POLICY "equipment_insert_editor" ON public.equipment
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "equipment_update_editor" ON public.equipment
  FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "equipment_delete_editor" ON public.equipment
  FOR DELETE
  USING (public.is_editor());

-- Equipment Assignments
CREATE POLICY "equipment_assignments_select_all" ON public.equipment_assignments
  FOR SELECT
  USING (true);

-- Viewer+ can manage assignments
CREATE POLICY "equipment_assignments_insert_viewer_plus" ON public.equipment_assignments
  FOR INSERT
  WITH CHECK (public.is_viewer_plus());

CREATE POLICY "equipment_assignments_update_viewer_plus" ON public.equipment_assignments
  FOR UPDATE
  USING (public.is_viewer_plus());

CREATE POLICY "equipment_assignments_delete_viewer_plus" ON public.equipment_assignments
  FOR DELETE
  USING (public.is_viewer_plus());

-- Equipment Comments
CREATE POLICY "equipment_comments_select_all" ON public.equipment_comments
  FOR SELECT
  USING (true);

-- Viewer+ can add comments
CREATE POLICY "equipment_comments_insert_viewer_plus" ON public.equipment_comments
  FOR INSERT
  WITH CHECK (public.is_viewer_plus());

-- Users can update/delete their own comments, Editors+ can manage all
CREATE POLICY "equipment_comments_update" ON public.equipment_comments
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_editor());

CREATE POLICY "equipment_comments_delete" ON public.equipment_comments
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_editor());


-- ============================================================================
-- VEHICLES POLICIES (only if tables exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "vehicles_select_all" ON public.vehicles;
        DROP POLICY IF EXISTS "vehicles_insert_editor" ON public.vehicles;
        DROP POLICY IF EXISTS "vehicles_update_editor" ON public.vehicles;
        DROP POLICY IF EXISTS "vehicles_delete_editor" ON public.vehicles;

        -- Create new policies
        CREATE POLICY "vehicles_select_all" ON public.vehicles FOR SELECT USING (true);
        CREATE POLICY "vehicles_insert_editor" ON public.vehicles FOR INSERT WITH CHECK (public.is_editor());
        CREATE POLICY "vehicles_update_editor" ON public.vehicles FOR UPDATE USING (public.is_editor());
        CREATE POLICY "vehicles_delete_editor" ON public.vehicles FOR DELETE USING (public.is_editor());
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_assignments') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "vehicle_assignments_select_all" ON public.vehicle_assignments;
        DROP POLICY IF EXISTS "vehicle_assignments_insert_viewer_plus" ON public.vehicle_assignments;
        DROP POLICY IF EXISTS "vehicle_assignments_update_viewer_plus" ON public.vehicle_assignments;
        DROP POLICY IF EXISTS "vehicle_assignments_delete_viewer_plus" ON public.vehicle_assignments;

        -- Create new policies
        CREATE POLICY "vehicle_assignments_select_all" ON public.vehicle_assignments FOR SELECT USING (true);
        CREATE POLICY "vehicle_assignments_insert_viewer_plus" ON public.vehicle_assignments FOR INSERT WITH CHECK (public.is_viewer_plus());
        CREATE POLICY "vehicle_assignments_update_viewer_plus" ON public.vehicle_assignments FOR UPDATE USING (public.is_viewer_plus());
        CREATE POLICY "vehicle_assignments_delete_viewer_plus" ON public.vehicle_assignments FOR DELETE USING (public.is_viewer_plus());
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_comments') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "vehicle_comments_select_all" ON public.vehicle_comments;
        DROP POLICY IF EXISTS "vehicle_comments_insert_viewer_plus" ON public.vehicle_comments;
        DROP POLICY IF EXISTS "vehicle_comments_update" ON public.vehicle_comments;
        DROP POLICY IF EXISTS "vehicle_comments_delete" ON public.vehicle_comments;

        -- Create new policies
        CREATE POLICY "vehicle_comments_select_all" ON public.vehicle_comments FOR SELECT USING (true);
        CREATE POLICY "vehicle_comments_insert_viewer_plus" ON public.vehicle_comments FOR INSERT WITH CHECK (public.is_viewer_plus());

        -- Check if user_id column exists before creating policies that use it
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'vehicle_comments'
            AND column_name = 'user_id'
        ) THEN
            CREATE POLICY "vehicle_comments_update" ON public.vehicle_comments FOR UPDATE USING (user_id = auth.uid() OR public.is_editor());
            CREATE POLICY "vehicle_comments_delete" ON public.vehicle_comments FOR DELETE USING (user_id = auth.uid() OR public.is_editor());
        ELSE
            -- If no user_id column, only editors can update/delete
            CREATE POLICY "vehicle_comments_update" ON public.vehicle_comments FOR UPDATE USING (public.is_editor());
            CREATE POLICY "vehicle_comments_delete" ON public.vehicle_comments FOR DELETE USING (public.is_editor());
        END IF;
    END IF;
END $$;


-- ============================================================================
-- RESOURCE ALLOCATIONS POLICIES
-- ============================================================================

-- Everyone can view allocations
CREATE POLICY "resource_allocations_select_all" ON public.resource_allocations
  FOR SELECT
  USING (true);

-- Viewer+ can set availability status
-- Editors+ can manage all allocations
CREATE POLICY "resource_allocations_insert_editor" ON public.resource_allocations
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "resource_allocations_update_viewer_plus" ON public.resource_allocations
  FOR UPDATE
  USING (public.is_viewer_plus());

CREATE POLICY "resource_allocations_delete_editor" ON public.resource_allocations
  FOR DELETE
  USING (public.is_editor());

-- Dummy Resource Allocations
CREATE POLICY "dummy_resource_allocations_select_all" ON public.dummy_resource_allocations
  FOR SELECT
  USING (true);

CREATE POLICY "dummy_resource_allocations_insert_editor" ON public.dummy_resource_allocations
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "dummy_resource_allocations_update_viewer_plus" ON public.dummy_resource_allocations
  FOR UPDATE
  USING (public.is_viewer_plus());

CREATE POLICY "dummy_resource_allocations_delete_editor" ON public.dummy_resource_allocations
  FOR DELETE
  USING (public.is_editor());


-- ============================================================================
-- DOCUMENTS & FILES POLICIES
-- ============================================================================
-- Note: These tables may not exist in all deployments, policies are skipped if table doesn't exist

-- Document Files policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_files') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "document_files_select_all" ON public.document_files;
        DROP POLICY IF EXISTS "document_files_insert_editor" ON public.document_files;
        DROP POLICY IF EXISTS "document_files_update_editor" ON public.document_files;
        DROP POLICY IF EXISTS "document_files_delete_editor" ON public.document_files;

        -- Create new policies
        CREATE POLICY "document_files_select_all" ON public.document_files FOR SELECT USING (true);
        CREATE POLICY "document_files_insert_editor" ON public.document_files FOR INSERT WITH CHECK (public.is_editor());
        CREATE POLICY "document_files_update_editor" ON public.document_files FOR UPDATE USING (public.is_editor());
        CREATE POLICY "document_files_delete_editor" ON public.document_files FOR DELETE USING (public.is_editor());
    END IF;
END $$;

-- Document Folders policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_folders') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "document_folders_select_all" ON public.document_folders;
        DROP POLICY IF EXISTS "document_folders_insert_editor" ON public.document_folders;
        DROP POLICY IF EXISTS "document_folders_update_editor" ON public.document_folders;
        DROP POLICY IF EXISTS "document_folders_delete_editor" ON public.document_folders;

        -- Create new policies
        CREATE POLICY "document_folders_select_all" ON public.document_folders FOR SELECT USING (true);
        CREATE POLICY "document_folders_insert_editor" ON public.document_folders FOR INSERT WITH CHECK (public.is_editor());
        CREATE POLICY "document_folders_update_editor" ON public.document_folders FOR UPDATE USING (public.is_editor());
        CREATE POLICY "document_folders_delete_editor" ON public.document_folders FOR DELETE USING (public.is_editor());
    END IF;
END $$;


-- ============================================================================
-- ADMIN TABLES POLICIES
-- ============================================================================

-- Announcements - Everyone can view, Admin can manage
CREATE POLICY "announcements_select_all" ON public.announcements
  FOR SELECT
  USING (true);

CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "announcements_delete_admin" ON public.announcements
  FOR DELETE
  USING (public.is_admin());

-- Feedback - Admin only
CREATE POLICY "feedback_select_admin" ON public.feedback
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "feedback_insert_all" ON public.feedback
  FOR INSERT
  WITH CHECK (true);  -- Anyone can submit feedback

CREATE POLICY "feedback_update_admin" ON public.feedback
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "feedback_delete_admin" ON public.feedback
  FOR DELETE
  USING (public.is_admin());

-- Audit Logs - Admin only (read-only)
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT
  USING (public.is_admin());

-- Dropdown Categories & Items - Admin can manage, everyone can view
CREATE POLICY "dropdown_categories_select_all" ON public.dropdown_categories
  FOR SELECT
  USING (true);

CREATE POLICY "dropdown_categories_manage_admin" ON public.dropdown_categories
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "dropdown_items_select_all" ON public.dropdown_items
  FOR SELECT
  USING (true);

CREATE POLICY "dropdown_items_manage_admin" ON public.dropdown_items
  FOR ALL
  USING (public.is_admin());

-- Useful Contacts - Everyone can view, Editor+ can manage
CREATE POLICY "useful_contacts_select_all" ON public.useful_contacts
  FOR SELECT
  USING (true);

CREATE POLICY "useful_contacts_insert_editor" ON public.useful_contacts
  FOR INSERT
  WITH CHECK (public.is_editor());

CREATE POLICY "useful_contacts_update_editor" ON public.useful_contacts
  FOR UPDATE
  USING (public.is_editor());

CREATE POLICY "useful_contacts_delete_editor" ON public.useful_contacts
  FOR DELETE
  USING (public.is_editor());

-- Video Tutorials - Everyone can view, Admin can manage
CREATE POLICY "video_tutorials_select_all" ON public.video_tutorials
  FOR SELECT
  USING (true);

CREATE POLICY "video_tutorials_insert_admin" ON public.video_tutorials
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "video_tutorials_update_admin" ON public.video_tutorials
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "video_tutorials_delete_admin" ON public.video_tutorials
  FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- PUSH SUBSCRIPTIONS POLICIES
-- ============================================================================

-- Users can manage their own subscriptions
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "push_subscriptions_select_admin" ON public.push_subscriptions
  FOR SELECT
  USING (public.is_admin());


-- ============================================================================
-- GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.current_user_privilege() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_privilege(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer_plus() TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables now have Row Level Security enabled
-- Policies enforce privilege-based access at the database level
-- Frontend checks are now backed by database-level security
-- ============================================================================
