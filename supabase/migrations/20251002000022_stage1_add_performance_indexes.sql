-- ============================================================================
-- STAGE 1: Database Performance Indexes (SAFE VERSION)
-- ============================================================================
-- Adds indexes on columns we KNOW exist based on migrations
-- Focuses on the highest impact indexes first
-- ============================================================================

-- ============================================================================
-- DELIVERY_TASKS TABLE
-- ============================================================================
-- Known columns from migration 20241222 and 20241223
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_created_by ON delivery_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_completed_by ON delivery_tasks(completed_by);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_created_at ON delivery_tasks(created_at DESC);

-- ============================================================================
-- EQUIPMENT TABLE
-- ============================================================================
-- Known columns from migration 20250928053801
CREATE INDEX IF NOT EXISTS idx_equipment_created_by ON equipment(created_by);
CREATE INDEX IF NOT EXISTS idx_equipment_updated_by ON equipment(updated_by);
CREATE INDEX IF NOT EXISTS idx_equipment_created_at ON equipment(created_at DESC);

-- ============================================================================
-- EQUIPMENT_ASSIGNMENTS TABLE
-- ============================================================================
-- Known columns: assigned_at, returned_at (some indexes already exist)
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_by ON equipment_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_returned_at ON equipment_assignments(returned_at);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_created_at ON equipment_assignments(created_at DESC);

-- ============================================================================
-- EQUIPMENT_COMMENTS TABLE
-- ============================================================================
-- Known columns (equipment_id index already exists)
CREATE INDEX IF NOT EXISTS idx_equipment_comments_user_id ON equipment_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_comments_created_at ON equipment_comments(created_at DESC);

-- ============================================================================
-- RESOURCE_ALLOCATIONS TABLE
-- ============================================================================
-- Core columns for resource calendar
CREATE INDEX IF NOT EXISTS idx_resource_allocations_user_id ON resource_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_allocation_date ON resource_allocations(allocation_date);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_user_date ON resource_allocations(user_id, allocation_date);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_created_at ON resource_allocations(created_at DESC);

-- ============================================================================
-- DUMMY_RESOURCE_ALLOCATIONS TABLE
-- ============================================================================
-- Known columns from migration 20250930051059 (user_id, allocation_date index already exists)
CREATE INDEX IF NOT EXISTS idx_dummy_resource_allocations_created_at ON dummy_resource_allocations(created_at DESC);

-- ============================================================================
-- DUMMY_USERS TABLE
-- ============================================================================
-- Known columns from migration 20250928120000
CREATE INDEX IF NOT EXISTS idx_dummy_users_created_by ON dummy_users(created_by);
CREATE INDEX IF NOT EXISTS idx_dummy_users_updated_by ON dummy_users(updated_by);
CREATE INDEX IF NOT EXISTS idx_dummy_users_created_at ON dummy_users(created_at DESC);

-- ============================================================================
-- DROPDOWN_ITEMS TABLE
-- ============================================================================
-- Known columns from migration 20241224
CREATE INDEX IF NOT EXISTS idx_dropdown_items_category_id ON dropdown_items(category_id);
CREATE INDEX IF NOT EXISTS idx_dropdown_items_created_at ON dropdown_items(created_at DESC);

-- ============================================================================
-- DROPDOWN_CATEGORIES TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dropdown_categories_created_at ON dropdown_categories(created_at DESC);

-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================================
-- Core columns for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- ============================================================================
-- USEFUL_CONTACTS TABLE
-- ============================================================================
-- Known columns from migration 20250930082209
CREATE INDEX IF NOT EXISTS idx_useful_contacts_created_at ON useful_contacts(created_at DESC);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Index on email for lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- Conditional indexes for tables that might exist
-- ============================================================================

-- PROJECTS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
  END IF;
END $$;

-- JOBS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
  END IF;
END $$;

-- FEEDBACK TABLE
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
  END IF;
END $$;

-- VEHICLES TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
  END IF;
END $$;

-- VEHICLE_ASSIGNMENTS TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_assignments' AND column_name = 'vehicle_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_id ON vehicle_assignments(vehicle_id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_assignments' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_user_id ON vehicle_assignments(user_id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_assignments' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_created_at ON vehicle_assignments(created_at DESC);
  END IF;
END $$;

-- VEHICLE_COMMENTS TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_comments' AND column_name = 'vehicle_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_comments_vehicle_id ON vehicle_comments(vehicle_id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_comments' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_comments_user_id ON vehicle_comments(user_id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_comments' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_comments_created_at ON vehicle_comments(created_at DESC);
  END IF;
END $$;

-- DOCUMENT_FILES TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_files' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_document_files_created_at ON document_files(created_at DESC);
  END IF;
END $$;

-- DOCUMENT_FOLDERS TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_folders' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_document_folders_created_at ON document_folders(created_at DESC);
  END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ STAGE 1 COMPLETE: Performance Indexes Added';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Added indexes on:';
  RAISE NOTICE '   • Foreign key columns (user_id, equipment_id, category_id, etc.)';
  RAISE NOTICE '   • Date columns for sorting (created_at, allocation_date, etc.)';
  RAISE NOTICE '   • Composite indexes for common queries (user_id + date)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Expected performance improvements:';
  RAISE NOTICE '   • Faster page loads with date sorting';
  RAISE NOTICE '   • Faster resource calendar queries';
  RAISE NOTICE '   • Faster equipment/vehicle assignment lookups';
  RAISE NOTICE '   • Better JOIN performance across tables';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
