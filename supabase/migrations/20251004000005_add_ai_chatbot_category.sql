-- Migration: Add AI Chatbot Documents category to document_files and document_folders
-- This allows documents uploaded for the AI chatbot to be properly categorized and displayed

-- Drop existing check constraints
ALTER TABLE public.document_files DROP CONSTRAINT IF EXISTS document_files_category_check;
ALTER TABLE public.document_folders DROP CONSTRAINT IF EXISTS document_folders_category_check;

-- Add new check constraints with AI Chatbot Documents category
ALTER TABLE public.document_files
ADD CONSTRAINT document_files_category_check
CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates', 'AI Chatbot Documents'));

ALTER TABLE public.document_folders
ADD CONSTRAINT document_folders_category_check
CHECK (category IN ('Standards & Specs', 'Procedures', 'Templates', 'AI Chatbot Documents'));
