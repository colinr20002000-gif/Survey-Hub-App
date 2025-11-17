-- Fix project_id type in dummy_resource_allocations
-- It should be INTEGER to match the projects.id field, not UUID

-- Fix dummy_resource_allocations.project_id (UUID -> INTEGER)
ALTER TABLE dummy_resource_allocations
    ALTER COLUMN project_id TYPE INTEGER USING NULL;
