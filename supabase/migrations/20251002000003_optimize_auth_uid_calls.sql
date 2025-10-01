-- ============================================================================
-- Optimize auth.uid() Calls in RLS Policies
-- ============================================================================
-- This fixes the Supabase advisor warnings about auth.uid() being re-evaluated
-- for each row. We wrap auth.uid() in SELECT to evaluate it once per query.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Optimize users_update_own policy
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Optimize push_subscriptions policies
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- ANNOUNCEMENT_READS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "announcement_reads_select_own" ON public.announcement_reads;
CREATE POLICY "announcement_reads_select_own" ON public.announcement_reads
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "announcement_reads_insert_own" ON public.announcement_reads;
CREATE POLICY "announcement_reads_insert_own" ON public.announcement_reads
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "announcement_reads_update_own" ON public.announcement_reads;
CREATE POLICY "announcement_reads_update_own" ON public.announcement_reads
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All auth.uid() calls are now wrapped in SELECT to prevent re-evaluation
-- per row, which significantly improves RLS performance.
-- ============================================================================
