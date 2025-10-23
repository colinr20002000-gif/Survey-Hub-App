-- ============================================================================
-- Add Useful Contacts Policies (Uses existing SECURITY DEFINER functions)
-- ============================================================================
-- The comprehensive fix (migration 18) created all SECURITY DEFINER functions
-- This migration just adds the policies for useful_contacts table
-- ============================================================================

-- Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "useful_contacts_select_all" ON public.useful_contacts;
DROP POLICY IF EXISTS "useful_contacts_manage_editor" ON public.useful_contacts;
DROP POLICY IF EXISTS "useful_contacts_insert_editor" ON public.useful_contacts;
DROP POLICY IF EXISTS "useful_contacts_update_editor" ON public.useful_contacts;
DROP POLICY IF EXISTS "useful_contacts_delete_editor" ON public.useful_contacts;

-- SELECT: Everyone can view
CREATE POLICY "useful_contacts_select_all" ON public.useful_contacts
  FOR SELECT
  USING (true);

-- INSERT: Editor+ can create
CREATE POLICY "useful_contacts_insert_editor" ON public.useful_contacts
  FOR INSERT
  WITH CHECK (current_user_is_editor_or_higher());

-- UPDATE: Editor+ can edit
CREATE POLICY "useful_contacts_update_editor" ON public.useful_contacts
  FOR UPDATE
  USING (current_user_is_editor_or_higher());

-- DELETE: Editor+ can delete
CREATE POLICY "useful_contacts_delete_editor" ON public.useful_contacts
  FOR DELETE
  USING (current_user_is_editor_or_higher());

DO $$
BEGIN
  RAISE NOTICE '✅ Useful Contacts policies created successfully';
  RAISE NOTICE 'Editor, Editor+, Admin, Super Admin can manage via app';
  RAISE NOTICE 'Viewer and Viewer+ can only view';
END $$;
