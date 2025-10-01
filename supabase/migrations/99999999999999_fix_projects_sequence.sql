-- Fix projects table ID sequence
-- Run this whenever you bulk delete/insert projects and the sequence gets out of sync
-- This ensures the auto-increment starts from the correct number

SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 0) FROM projects) + 1, false);
