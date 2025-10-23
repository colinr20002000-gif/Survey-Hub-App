-- Make entity column nullable or add default value
alter table public.audit_logs alter column entity drop not null;

-- Or alternatively, add a default value
-- alter table public.audit_logs alter column entity set default 'System';
