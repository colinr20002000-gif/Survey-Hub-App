-- Create audit_logs table for tracking user authentication events
create table if not exists public.audit_logs (
  id uuid not null default gen_random_uuid (),
  "user" text not null,
  action text not null,
  details text null,
  category text not null,
  timestamp timestamp with time zone not null default now(),
  constraint audit_logs_pkey primary key (id)
);

-- Add index on timestamp for efficient querying
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);

-- Add index on user for user-specific queries
create index if not exists idx_audit_logs_user on public.audit_logs("user");

-- Add index on category for filtering
create index if not exists idx_audit_logs_category on public.audit_logs(category);

-- Enable Row Level Security
alter table public.audit_logs enable row level security;

-- Create RLS policies
-- Allow admins to read all audit logs
create policy "Allow admins to read audit_logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.privilege = 'Admin'
  )
);

-- Allow system to insert audit logs (bypassing RLS for service role)
create policy "Allow system to insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (true);

-- Prevent updates and deletes (audit logs should be immutable)
-- No policies for update/delete means they're not allowed
