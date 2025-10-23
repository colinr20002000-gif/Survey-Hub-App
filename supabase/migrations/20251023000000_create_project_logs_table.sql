-- Create project_logs table for analytics dashboard
create table if not exists public.project_logs (
  id uuid not null default gen_random_uuid (),
  project_log_link text null,
  type text not null,
  client text null,
  site_name text null,
  project_no text null,
  shift_start_date date null,
  shift_start_day text null,
  night_or_day_shift text null,
  week_no smallint null,
  leave_place_of_rest time without time zone null,
  arrive_place_of_rest time without time zone null,
  total_travel_time interval null,
  arrive_on_site time without time zone null,
  leave_site time without time zone null,
  total_site_time interval null,
  time_lost interval null,
  time_lost_2 interval null,
  time_lost_3 interval null,
  time_lost_4 interval null,
  inorail_staff text null,
  elr text null,
  postcode text null,
  miles_from numeric null,
  yards_from numeric null,
  miles_to numeric null,
  yards_to numeric null,
  total_yardage numeric null,
  was_shift_cancelled boolean null,
  staff_attended_count integer null,
  subcontractors_attended_count integer null,
  survey_grid text null,
  fiscal_week smallint null,
  fiscal_month smallint null,
  fiscal_quarter smallint null,
  fiscal_year smallint null,
  calendar_week smallint null,
  calendar_month text null,
  calendar_year smallint null,
  created_at timestamp with time zone null default now(),
  constraint project_logs_pkey primary key (id)
);

-- Add indexes for frequently queried columns
create index if not exists idx_project_logs_shift_start_date on public.project_logs(shift_start_date);
create index if not exists idx_project_logs_project_no on public.project_logs(project_no);
create index if not exists idx_project_logs_type on public.project_logs(type);
create index if not exists idx_project_logs_client on public.project_logs(client);
create index if not exists idx_project_logs_was_shift_cancelled on public.project_logs(was_shift_cancelled);

-- Enable Row Level Security
alter table public.project_logs enable row level security;

-- Create RLS policies
-- Allow all authenticated users to read project logs
create policy "Allow all authenticated users to read project_logs"
on public.project_logs
for select
to authenticated
using (true);

-- Allow Dashboard and above to insert
create policy "Allow Dashboard+ to insert project_logs"
on public.project_logs
for insert
to authenticated
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.privilege in ('Dashboard', 'Admin')
  )
);

-- Allow Dashboard and above to update
create policy "Allow Dashboard+ to update project_logs"
on public.project_logs
for update
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.privilege in ('Dashboard', 'Admin')
  )
);

-- Allow Dashboard and above to delete
create policy "Allow Dashboard+ to delete project_logs"
on public.project_logs
for delete
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.privilege in ('Dashboard', 'Admin')
  )
);
