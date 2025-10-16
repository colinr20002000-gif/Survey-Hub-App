-- ============================================================================
-- Comprehensive RLS Policy Fix - All Tables
-- ============================================================================
-- This migration implements the complete privilege system correctly:
--
-- VIEWER: View only, change password/theme, use filters/sort
-- VIEWER+: + complete tasks, assign/return equipment/vehicles, add comments, download files
-- EDITOR: Full access EXCEPT admin mode and announcements
-- EDITOR+: Same as Editor + can create announcements
-- ADMIN: Full access including admin mode
-- SUPER ADMIN: Full access
-- ============================================================================

-- Helper: Drop all policies on a table
CREATE OR REPLACE FUNCTION drop_all_policies(table_name TEXT)
RETURNS VOID AS $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = table_name
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_name) || ' ON public.' || quote_ident(table_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
SELECT drop_all_policies('users');

-- Everyone can view all users (needed for dropdowns, assignments)
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

-- Users can update their own profile (password, theme, etc.)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Only admins can insert/delete users
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- DUMMY USERS TABLE
-- ============================================================================
SELECT drop_all_policies('dummy_users');

CREATE POLICY "dummy_users_select_all" ON public.dummy_users
  FOR SELECT USING (true);

CREATE POLICY "dummy_users_manage_admin" ON public.dummy_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
SELECT drop_all_policies('projects');

-- Everyone can view projects
CREATE POLICY "projects_select_all" ON public.projects
  FOR SELECT USING (true);

-- Editors+ can create/update/delete projects
CREATE POLICY "projects_insert_editor" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "projects_update_editor" ON public.projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "projects_delete_editor" ON public.projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- TASKS TABLE (Project Tasks)
-- ============================================================================
SELECT drop_all_policies('tasks');

CREATE POLICY "tasks_select_all" ON public.tasks
  FOR SELECT USING (true);

-- Viewer+ can update tasks (complete them)
CREATE POLICY "tasks_update_viewer_plus" ON public.tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- Editors+ can create/delete tasks
CREATE POLICY "tasks_insert_editor" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "tasks_delete_editor" ON public.tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- DELIVERY TASKS TABLE
-- ============================================================================
SELECT drop_all_policies('delivery_tasks');

CREATE POLICY "delivery_tasks_select_all" ON public.delivery_tasks
  FOR SELECT USING (true);

-- Viewer+ can update (complete) delivery tasks
CREATE POLICY "delivery_tasks_update_viewer_plus" ON public.delivery_tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- Editors+ can create/delete delivery tasks
CREATE POLICY "delivery_tasks_insert_editor" ON public.delivery_tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "delivery_tasks_delete_editor" ON public.delivery_tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- JOBS TABLE (Delivery Tracker)
-- ============================================================================
SELECT drop_all_policies('jobs');

CREATE POLICY "jobs_select_all" ON public.jobs
  FOR SELECT USING (true);

-- Viewer+ can update jobs
CREATE POLICY "jobs_update_viewer_plus" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- Editors+ can create/delete jobs
CREATE POLICY "jobs_insert_editor" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "jobs_delete_editor" ON public.jobs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- EQUIPMENT TABLE
-- ============================================================================
SELECT drop_all_policies('equipment');

CREATE POLICY "equipment_select_all" ON public.equipment
  FOR SELECT USING (true);

-- Editors+ can manage equipment
CREATE POLICY "equipment_manage_editor" ON public.equipment
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- EQUIPMENT ASSIGNMENTS TABLE
-- ============================================================================
SELECT drop_all_policies('equipment_assignments');

CREATE POLICY "equipment_assignments_select_all" ON public.equipment_assignments
  FOR SELECT USING (true);

-- Viewer+ can assign/transfer/return equipment
CREATE POLICY "equipment_assignments_manage_viewer_plus" ON public.equipment_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- EQUIPMENT COMMENTS TABLE
-- ============================================================================
SELECT drop_all_policies('equipment_comments');

CREATE POLICY "equipment_comments_select_all" ON public.equipment_comments
  FOR SELECT USING (true);

-- Viewer+ can add comments
CREATE POLICY "equipment_comments_insert_viewer_plus" ON public.equipment_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- Users can update/delete their own comments, Editors+ can manage all
CREATE POLICY "equipment_comments_update" ON public.equipment_comments
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "equipment_comments_delete" ON public.equipment_comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
    PERFORM drop_all_policies('vehicles');

    CREATE POLICY "vehicles_select_all" ON public.vehicles FOR SELECT USING (true);
    CREATE POLICY "vehicles_manage_editor" ON public.vehicles FOR ALL USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- ============================================================================
-- VEHICLE ASSIGNMENTS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_assignments') THEN
    PERFORM drop_all_policies('vehicle_assignments');

    CREATE POLICY "vehicle_assignments_select_all" ON public.vehicle_assignments FOR SELECT USING (true);
    CREATE POLICY "vehicle_assignments_manage_viewer_plus" ON public.vehicle_assignments FOR ALL USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- ============================================================================
-- VEHICLE COMMENTS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_comments') THEN
    PERFORM drop_all_policies('vehicle_comments');

    CREATE POLICY "vehicle_comments_select_all" ON public.vehicle_comments FOR SELECT USING (true);
    CREATE POLICY "vehicle_comments_insert_viewer_plus" ON public.vehicle_comments FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    -- Check if user_id column exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vehicle_comments' AND column_name = 'user_id'
    ) THEN
      CREATE POLICY "vehicle_comments_update" ON public.vehicle_comments FOR UPDATE USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
      );
      CREATE POLICY "vehicle_comments_delete" ON public.vehicle_comments FOR DELETE USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
      );
    ELSE
      CREATE POLICY "vehicle_comments_update" ON public.vehicle_comments FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
      );
      CREATE POLICY "vehicle_comments_delete" ON public.vehicle_comments FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
      );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- RESOURCE ALLOCATIONS TABLE (already done, but ensure consistency)
-- ============================================================================
-- Already handled in previous migration

-- ============================================================================
-- DUMMY RESOURCE ALLOCATIONS TABLE
-- ============================================================================
SELECT drop_all_policies('dummy_resource_allocations');

CREATE POLICY "dummy_resource_allocations_select_all" ON public.dummy_resource_allocations
  FOR SELECT USING (true);

CREATE POLICY "dummy_resource_allocations_insert_editor" ON public.dummy_resource_allocations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "dummy_resource_allocations_update_viewer_plus" ON public.dummy_resource_allocations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "dummy_resource_allocations_delete_editor" ON public.dummy_resource_allocations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- DOCUMENT FILES TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_files') THEN
    PERFORM drop_all_policies('document_files');

    -- Viewer+ can view/download files
    CREATE POLICY "document_files_select_viewer_plus" ON public.document_files FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    -- Editors+ can upload/manage files
    CREATE POLICY "document_files_manage_editor" ON public.document_files FOR ALL USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- ============================================================================
-- DOCUMENT FOLDERS TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_folders') THEN
    PERFORM drop_all_policies('document_folders');

    -- Viewer+ can view folders
    CREATE POLICY "document_folders_select_viewer_plus" ON public.document_folders FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    -- Editors+ can manage folders
    CREATE POLICY "document_folders_manage_editor" ON public.document_folders FOR ALL USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================================
SELECT drop_all_policies('announcements');

-- Everyone can view announcements
CREATE POLICY "announcements_select_all" ON public.announcements
  FOR SELECT USING (true);

-- Editor+, Admin, Super Admin can create announcements (NOT Editor)
CREATE POLICY "announcements_insert_editor_plus" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "announcements_update_editor_plus" ON public.announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "announcements_delete_editor_plus" ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
SELECT drop_all_policies('feedback');

-- Only admins can view feedback
CREATE POLICY "feedback_select_admin" ON public.feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- Anyone can submit feedback
CREATE POLICY "feedback_insert_all" ON public.feedback
  FOR INSERT WITH CHECK (true);

-- Only admins can update/delete feedback
CREATE POLICY "feedback_manage_admin" ON public.feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
SELECT drop_all_policies('audit_logs');

-- Only admins can view audit logs (read-only)
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- DROPDOWN CATEGORIES & ITEMS TABLES
-- ============================================================================
SELECT drop_all_policies('dropdown_categories');
SELECT drop_all_policies('dropdown_items');

-- Everyone can view dropdowns
CREATE POLICY "dropdown_categories_select_all" ON public.dropdown_categories
  FOR SELECT USING (true);

CREATE POLICY "dropdown_items_select_all" ON public.dropdown_items
  FOR SELECT USING (true);

-- Only admins can manage dropdowns
CREATE POLICY "dropdown_categories_manage_admin" ON public.dropdown_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

CREATE POLICY "dropdown_items_manage_admin" ON public.dropdown_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- USEFUL CONTACTS TABLE
-- ============================================================================
SELECT drop_all_policies('useful_contacts');

-- Everyone can view useful contacts
CREATE POLICY "useful_contacts_select_all" ON public.useful_contacts
  FOR SELECT USING (true);

-- Editors+ can manage useful contacts
CREATE POLICY "useful_contacts_manage_editor" ON public.useful_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- VIDEO TUTORIALS TABLE
-- ============================================================================
SELECT drop_all_policies('video_tutorials');

-- Everyone can view video tutorials
CREATE POLICY "video_tutorials_select_all" ON public.video_tutorials
  FOR SELECT USING (true);

-- Only admins can manage video tutorials
CREATE POLICY "video_tutorials_manage_admin" ON public.video_tutorials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Admin', 'Super Admin') LIMIT 1)
  );

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE (already optimized, keep existing)
-- ============================================================================
-- Already handled in previous migration

-- ============================================================================
-- PROJECT TASKS TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_tasks') THEN
    PERFORM drop_all_policies('project_tasks');

    CREATE POLICY "project_tasks_select_all" ON public.project_tasks FOR SELECT USING (true);

    -- Viewer+ can update (complete) project tasks
    CREATE POLICY "project_tasks_update_viewer_plus" ON public.project_tasks FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    -- Editors+ can create/delete project tasks
    CREATE POLICY "project_tasks_insert_editor" ON public.project_tasks FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    CREATE POLICY "project_tasks_delete_editor" ON public.project_tasks FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- ============================================================================
-- PROJECT FILES TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_files') THEN
    PERFORM drop_all_policies('project_files');

    -- Viewer+ can view/download project files
    CREATE POLICY "project_files_select_viewer_plus" ON public.project_files FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Viewer+', 'Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );

    -- Editors+ can upload/manage project files
    CREATE POLICY "project_files_manage_editor" ON public.project_files FOR ALL USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND privilege IN ('Editor', 'Editor+', 'Admin', 'Super Admin') LIMIT 1)
    );
  END IF;
END $$;

-- Clean up helper function
DROP FUNCTION drop_all_policies(TEXT);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All RLS policies have been set according to the privilege system:
-- - Viewer: View only
-- - Viewer+: + complete tasks, manage equipment/vehicles, download files
-- - Editor: Full access except admin mode and announcements
-- - Editor+: Editor + can create announcements
-- - Admin/Super Admin: Full access including admin mode
-- ============================================================================
