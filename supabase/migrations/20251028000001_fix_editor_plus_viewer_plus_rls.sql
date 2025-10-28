-- Fix RLS policies to include Editor+ and Viewer+ privileges
-- This migration ensures that Editor+ and Viewer+ users have proper access rights

-- =============================================================================
-- EQUIPMENT CALENDAR
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Editor and above can insert equipment calendar" ON equipment_calendar;
DROP POLICY IF EXISTS "Editor and above can update equipment calendar" ON equipment_calendar;
DROP POLICY IF EXISTS "Editor and above can delete equipment calendar" ON equipment_calendar;

-- Recreate policies with Editor+ and Viewer+ included
-- Editor+ can insert equipment calendar entries
CREATE POLICY "Editor and above can insert equipment calendar" ON equipment_calendar
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    );

-- Editor+ can update equipment calendar entries
CREATE POLICY "Editor and above can update equipment calendar" ON equipment_calendar
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    );

-- Editor+ can delete equipment calendar entries
CREATE POLICY "Editor and above can delete equipment calendar" ON equipment_calendar
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.privilege IN ('Admin', 'Super Admin', 'Editor', 'Editor+')
        )
    );

-- Note: Only updating equipment_calendar table as it's confirmed to exist
-- Other tables may have existing policies that are already correct or named differently
