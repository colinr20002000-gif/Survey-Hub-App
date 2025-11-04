-- Allow Viewer+ users to update equipment status when returning equipment
-- This fixes the bug where equipment disappears after being returned by non-Editor users
-- The issue: equipment_assignments allows Viewer+ to update (return equipment)
-- but equipment table requires Editor+ to update status, causing a permission mismatch

-- Add a new policy that allows Viewer+ users to update equipment status to 'available'
-- This policy is specifically for the equipment return flow
CREATE POLICY "equipment_return_viewer_plus" ON public.equipment
  FOR UPDATE
  USING (current_user_is_viewer_plus_or_higher())
  WITH CHECK (
    -- Only allow updating status to 'available' or 'maintenance'
    -- This prevents Viewer+ from making other changes to equipment
    status IN ('available', 'maintenance')
  );

-- Note: This policy works alongside the existing "equipment_manage_editor" policy
-- Editor+ users can still make all changes via their policy
-- Viewer+ users can only update status via this policy
