-- Add missing category column to audit_logs table
alter table public.audit_logs add column if not exists category text;

-- Set default for existing rows
update public.audit_logs set category = 'Authentication' where category is null;

-- Make category not null with default
alter table public.audit_logs alter column category set default 'Authentication';
alter table public.audit_logs alter column category set not null;

-- Recreate the index on category (if it exists, drop it first)
drop index if exists idx_audit_logs_category;
create index idx_audit_logs_category on public.audit_logs(category);
