-- Make the 'type' column nullable to handle CSV imports with empty type values
alter table public.project_logs
alter column type drop not null;
