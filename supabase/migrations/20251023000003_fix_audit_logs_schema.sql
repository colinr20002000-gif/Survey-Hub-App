-- Fix audit_logs table schema to add missing user column
alter table public.audit_logs add column if not exists "user" text;

-- Make user column not null with default for existing rows
update public.audit_logs set "user" = 'System' where "user" is null;
alter table public.audit_logs alter column "user" set not null;

-- Add missing index on user column
create index if not exists idx_audit_logs_user on public.audit_logs("user");
