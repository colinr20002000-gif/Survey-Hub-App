-- Drop existing policies if they exist
drop policy if exists "Allow admins to read audit_logs" on public.audit_logs;
drop policy if exists "Allow system to insert audit_logs" on public.audit_logs;

-- Create new RLS policies for audit_logs

-- Allow all authenticated users to insert audit logs (for automatic logging)
create policy "Allow authenticated users to insert audit_logs"
on public.audit_logs
for insert
to authenticated
with check (true);

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

-- No update or delete policies (audit logs are immutable)
