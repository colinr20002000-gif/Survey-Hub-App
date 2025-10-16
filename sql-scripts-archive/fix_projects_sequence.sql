-- Fix the projects table ID sequence
-- This resets the sequence to start from the next available ID

-- First, find the maximum ID currently in the table
SELECT MAX(id) FROM projects;

-- Reset the sequence to the next value after the max ID
-- Replace <max_id_value> with the result from above query + 1
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects) + 1);

-- Verify the sequence is now set correctly
SELECT currval('projects_id_seq');
