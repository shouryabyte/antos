-- AntOS - Supabase backend foundation.
-- Run this file in the Supabase SQL Editor before running scripts/seed-supabase.mjs.
-- Frontend demo/localStorage mode is intentionally unchanged by this schema.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  head text,
  head_employee_id uuid,
  employee_count int default 0,
  budget numeric default 0,
  status text default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null,
  name text not null,
  email text unique not null,
  phone text,
  department text,
  department_id uuid references public.departments(id) on delete set null,
  designation text,
  manager text,
  manager_id uuid references public.employees(id) on delete set null,
  joining_date date,
  employment_type text not null default 'Full-time',
  salary numeric default 0,
  work_location text,
  status text default 'Active',
  avatar text,
  avatar_url text,
  skills text[] default '{}',
  documents text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'departments_head_employee_id_fkey'
  ) then
    alter table public.departments
      add constraint departments_head_employee_id_fkey
      foreign key (head_employee_id) references public.employees(id) on delete set null
      not valid;
  end if;
end $$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique not null,
  name text not null,
  email text unique not null,
  phone text,
  college text,
  degree text,
  graduation_year int,
  skills text[] default '{}',
  career_interest text,
  sprint_history text[] default '{}',
  readiness_score numeric default 0,
  portfolio_link text,
  mentor_feedback text,
  ppo_status text default 'Not Eligible',
  status text default 'Registered',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.corporate_partners (
  id uuid primary key default gen_random_uuid(),
  company_name text unique not null,
  contact_person text,
  email text unique,
  phone text,
  industry text,
  hiring_need text,
  active_sprints int default 0,
  interns_deployed int default 0,
  ppos_issued int default 0,
  revenue_generated numeric default 0,
  account_owner text,
  account_owner_id uuid references public.employees(id) on delete set null,
  status text default 'Lead',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role_id uuid references public.roles(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  avatar_url text,
  status text default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  check_in time,
  check_out time,
  work_mode text default 'Hybrid',
  status text default 'Not Checked In',
  working_hours numeric default 0,
  regularization_status text default 'None',
  regularization_reason text,
  corrected_check_in time,
  corrected_check_out time,
  leave_request_id uuid,
  approved_by text,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

alter table public.attendance add column if not exists corrected_check_in time;
alter table public.attendance add column if not exists corrected_check_out time;
alter table public.attendance add column if not exists regularization_reason text;
alter table public.attendance add column if not exists approved_by text;
alter table public.attendance add column if not exists remarks text;
alter table public.attendance add column if not exists leave_request_id uuid;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  days numeric not null,
  reason text not null,
  status text default 'Pending',
  manager_remarks text,
  approved_by text,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by text,
  rejected_by_profile_id uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leave_requests add column if not exists employee_id uuid references public.employees(id) on delete cascade;
alter table public.leave_requests add column if not exists leave_type text;
alter table public.leave_requests add column if not exists from_date date;
alter table public.leave_requests add column if not exists to_date date;
alter table public.leave_requests add column if not exists days numeric default 0;
alter table public.leave_requests add column if not exists reason text;
alter table public.leave_requests add column if not exists status text default 'Pending';
alter table public.leave_requests add column if not exists manager_remarks text;
alter table public.leave_requests add column if not exists approved_by text;
alter table public.leave_requests add column if not exists approved_at timestamptz;
alter table public.leave_requests add column if not exists rejected_by text;
alter table public.leave_requests add column if not exists rejected_at timestamptz;
alter table public.leave_requests add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'attendance_leave_request_id_fkey'
  ) then
    alter table public.attendance
      add constraint attendance_leave_request_id_fkey
      foreign key (leave_request_id) references public.leave_requests(id) on delete set null
      not valid;
  end if;
end $$;

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  month text not null,
  basic_salary numeric default 0,
  allowances numeric default 0,
  deductions numeric default 0,
  lop numeric default 0,
  lop_days numeric default 0,
  net_salary numeric default 0,
  status text default 'Draft',
  payment_date date,
  generated_at timestamptz,
  processed_at timestamptz,
  processed_by text,
  processed_by_profile_id uuid references public.profiles(id) on delete set null,
  paid_by text,
  paid_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, month)
);

alter table public.payroll add column if not exists employee_id uuid references public.employees(id) on delete cascade;
alter table public.payroll add column if not exists month text;
alter table public.payroll add column if not exists basic_salary numeric default 0;
alter table public.payroll add column if not exists allowances numeric default 0;
alter table public.payroll add column if not exists deductions numeric default 0;
alter table public.payroll add column if not exists lop numeric default 0;
alter table public.payroll add column if not exists lop_days numeric default 0;
alter table public.payroll add column if not exists net_salary numeric default 0;
alter table public.payroll add column if not exists status text default 'Draft';
alter table public.payroll add column if not exists payment_date date;
alter table public.payroll add column if not exists generated_at timestamptz;
alter table public.payroll add column if not exists processed_at timestamptz;
alter table public.payroll add column if not exists processed_by text;
alter table public.payroll add column if not exists paid_by text;
alter table public.payroll add column if not exists updated_at timestamptz default now();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique,
  name text not null,
  client text,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  manager text,
  manager_id uuid references public.employees(id) on delete set null,
  start_date date,
  deadline date,
  assigned_members uuid[] default '{}',
  budget numeric default 0,
  revenue numeric default 0,
  progress numeric default 0,
  status text default 'Not Started',
  health text default 'Green',
  priority text default 'Medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.employees(id) on delete set null,
  priority text default 'Medium',
  due_date date,
  estimated_hours numeric default 0,
  actual_hours numeric default 0,
  status text default 'To Do',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  date date not null,
  hours_worked numeric not null,
  type text default 'Billable',
  description text,
  approval_status text default 'Pending',
  submitted_at timestamptz,
  approved_by text,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by text,
  rejected_by_profile_id uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  manager_remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.timesheets add column if not exists employee_id uuid references public.employees(id) on delete cascade;
alter table public.timesheets add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.timesheets add column if not exists task_id uuid references public.tasks(id) on delete set null;
alter table public.timesheets add column if not exists date date;
alter table public.timesheets add column if not exists hours_worked numeric default 0;
alter table public.timesheets add column if not exists type text default 'Billable';
alter table public.timesheets add column if not exists description text;
alter table public.timesheets add column if not exists approval_status text default 'Pending';
alter table public.timesheets add column if not exists submitted_at timestamptz;
alter table public.timesheets add column if not exists approved_by text;
alter table public.timesheets add column if not exists approved_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.timesheets add column if not exists approved_at timestamptz;
alter table public.timesheets add column if not exists rejected_by text;
alter table public.timesheets add column if not exists rejected_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.timesheets add column if not exists rejected_at timestamptz;
alter table public.timesheets add column if not exists manager_remarks text;
alter table public.timesheets add column if not exists updated_at timestamptz default now();

create table if not exists public.career_sprints (
  id uuid primary key default gen_random_uuid(),
  sprint_code text unique,
  name text not null,
  domain text,
  corporate_partner text,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  mentor text,
  mentor_id uuid references public.employees(id) on delete set null,
  start_date date,
  end_date date,
  students_enrolled int default 0,
  completion_rate numeric default 0,
  average_readiness_score numeric default 0,
  ppos_issued int default 0,
  status text default 'Upcoming',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sprint_enrollments (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.career_sprints(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text default 'Enrolled',
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sprint_id, student_id)
);

create table if not exists public.intern_deployments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  intern_name text,
  corporate_client text,
  project_assigned text,
  mentor text,
  mentor_id uuid references public.employees(id) on delete set null,
  start_date date,
  end_date date,
  attendance_percentage numeric default 0,
  timesheet_compliance numeric default 0,
  task_completion numeric default 0,
  client_feedback numeric default 0,
  performance_score numeric default 0,
  ppo_probability numeric default 0,
  status text default 'Shortlisted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.readiness_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  task_completion numeric default 0,
  mentor_feedback numeric default 0,
  client_feedback numeric default 0,
  attendance numeric default 0,
  communication numeric default 0,
  timesheet_discipline numeric default 0,
  final_score numeric default 0,
  recommendation text default 'Needs Training',
  strengths text[] default '{}',
  improvement_areas text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ppo_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  readiness_score_id uuid references public.readiness_scores(id) on delete set null,
  status text default 'Not Eligible',
  recommendation text,
  offered_role text,
  offered_ctc numeric default 0,
  offered_at timestamptz,
  accepted_at timestamptz,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  client text not null,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  sprint_id uuid references public.career_sprints(id) on delete set null,
  project_or_sprint text,
  amount numeric not null,
  due_date date,
  payment_status text default 'Draft',
  revenue_category text,
  paid_at timestamptz,
  created_by text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists client text;
alter table public.invoices add column if not exists corporate_partner_id uuid references public.corporate_partners(id) on delete set null;
alter table public.invoices add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.invoices add column if not exists sprint_id uuid references public.career_sprints(id) on delete set null;
alter table public.invoices add column if not exists project_or_sprint text;
alter table public.invoices add column if not exists amount numeric default 0;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists payment_status text default 'Draft';
alter table public.invoices add column if not exists revenue_category text;
alter table public.invoices add column if not exists paid_at timestamptz;
alter table public.invoices add column if not exists created_by text;
alter table public.invoices add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists updated_at timestamptz default now();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text,
  description text,
  amount numeric not null,
  date date,
  status text default 'Pending',
  created_by text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_by text,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.expenses add column if not exists category text;
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists amount numeric default 0;
alter table public.expenses add column if not exists date date;
alter table public.expenses add column if not exists status text default 'Pending';
alter table public.expenses add column if not exists created_by text;
alter table public.expenses add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.expenses add column if not exists approved_by text;
alter table public.expenses add column if not exists approved_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.expenses add column if not exists approved_at timestamptz;
alter table public.expenses add column if not exists paid_at timestamptz;
alter table public.expenses add column if not exists updated_at timestamptz default now();

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique,
  asset_type text,
  assigned_to text,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  issue_date date,
  condition text,
  return_status text,
  status text default 'Available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text,
  owner text,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  storage_path text,
  uploaded_date date,
  status text default 'Uploaded',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  title text not null,
  category text,
  raised_by text,
  raised_by_profile_id uuid references public.profiles(id) on delete set null,
  assigned_to text,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  priority text default 'Medium',
  status text default 'Open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  role_target text,
  title text not null,
  message text not null,
  type text default 'Info',
  related_module text,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  corporate_partner_id uuid references public.corporate_partners(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null,
  invite_token text unique not null,
  expires_at timestamptz not null,
  status text default 'Pending',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(email, status)
);

create table if not exists public.role_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_role_id uuid references public.roles(id) on delete set null,
  new_role_id uuid not null references public.roles(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  status text default 'Pending',
  reason text,
  remarks text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  module text not null,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  approver_id uuid references public.profiles(id) on delete set null,
  request_type text not null,
  target_id text,
  status text default 'Pending',
  payload jsonb default '{}',
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  task_title text not null,
  task_type text not null,
  status text default 'Pending',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id, task_type)
);

create table if not exists public.user_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create or replace function public.get_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.get_current_role() = 'Super Admin', false) $$;

create or replace function public.is_hr_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.get_current_role() = 'HR Manager', false) $$;

create or replace function public.is_project_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.get_current_role() = 'Project Manager', false) $$;

create or replace function public.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.get_current_role() = 'Mentor', false) $$;

create or replace function public.is_finance_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.get_current_role() = 'Finance Manager', false) $$;

create or replace function public.get_current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select employee_id from public.profiles where id = auth.uid() limit 1 $$;

create or replace function public.get_current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select student_id from public.profiles where id = auth.uid() limit 1 $$;

create or replace function public.get_current_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select corporate_partner_id from public.profiles where id = auth.uid() limit 1 $$;

create or replace function public.get_public_invitation_by_token(p_invite_token text)
returns table (
  id uuid,
  email text,
  full_name text,
  role_id uuid,
  role_name text,
  department_id uuid,
  employee_id uuid,
  student_id uuid,
  corporate_partner_id uuid,
  expires_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ui.id,
    ui.email,
    ui.full_name,
    ui.role_id,
    r.name as role_name,
    ui.department_id,
    ui.employee_id,
    ui.student_id,
    ui.corporate_partner_id,
    ui.expires_at,
    ui.status
  from public.user_invitations ui
  join public.roles r on r.id = ui.role_id
  where ui.invite_token = p_invite_token
  limit 1
$$;

grant execute on function public.get_public_invitation_by_token(text) to anon, authenticated;

insert into public.roles (name) values
  ('Super Admin'), ('HR Manager'), ('Project Manager'), ('Mentor'), ('Finance Manager'),
  ('Employee'), ('Intern'), ('Student'), ('Corporate Partner')
on conflict (name) do nothing;

insert into public.permissions (code) values
  ('dashboard.read'),
  ('employee.read'), ('employee.create'), ('employee.update'), ('employee.delete'),
  ('intern.read'), ('department.read'),
  ('attendance.read_all'), ('attendance.read_self'), ('attendance.check_in'), ('attendance.check_out'), ('attendance.regularize'), ('attendance.approve'),
  ('leave.read_all'), ('leave.read_self'), ('leave.apply'), ('leave.approve'),
  ('payroll.read_all'), ('payroll.read_self'), ('payroll.process'),
  ('project.read'), ('project.create'), ('project.update'),
  ('task.read'), ('task.create'), ('task.update'),
  ('timesheet.read_all'), ('timesheet.read_self'), ('timesheet.submit'), ('timesheet.approve'),
  ('student.read'), ('student.create'),
  ('partner.read'),
  ('sprint.read'), ('sprint.create'),
  ('mentor.read'), ('certificate.read'),
  ('readiness.read'), ('readiness.update'),
  ('deployment.read'), ('feedback.read'), ('ppo.read'),
  ('finance.read'), ('finance.manage'), ('invoice.read'), ('invoice.manage'),
  ('expense.read'), ('expense.manage'),
  ('asset.manage'), ('document.read'), ('document.manage'), ('ticket.create'), ('ticket.manage'), ('role.manage'), ('settings.manage')
  ,('invitation.read'), ('invitation.create'), ('invitation.revoke'), ('invitation.resend'), ('audit.read'), ('account.manage'), ('role_change.request'), ('role_change.approve'), ('onboarding.manage')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.name = 'Super Admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read',
  'employee.read','employee.create','employee.update','employee.delete',
  'intern.read','department.read','attendance.read_all','attendance.approve',
  'leave.read_all','leave.approve',
  'payroll.read_all','payroll.process',
  'asset.manage','document.read','document.manage','ticket.create','ticket.manage'
  ,'invitation.read','invitation.create','invitation.revoke','invitation.resend','account.manage','role_change.request','onboarding.manage'
]) where r.name = 'HR Manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','project.read','project.create','project.update','task.read','task.create','task.update',
  'timesheet.read_all','timesheet.approve','deployment.read','feedback.read','ticket.create'
]) where r.name = 'Project Manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','student.read','student.create','sprint.read','sprint.create','readiness.read','readiness.update',
  'mentor.read','certificate.read','ppo.read','task.read','task.create','task.update','ticket.create'
]) where r.name = 'Mentor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','finance.read','finance.manage','invoice.read','invoice.manage','expense.read','expense.manage','payroll.read_all','payroll.process','ticket.create'
]) where r.name = 'Finance Manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','attendance.read_self','attendance.check_in','attendance.check_out','attendance.regularize',
  'leave.read_self','leave.apply','payroll.read_self','task.read','timesheet.read_self','timesheet.submit','document.read','ticket.create'
]) where r.name in ('Employee', 'Intern')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','student.read','sprint.read','readiness.read','certificate.read','ppo.read','ticket.create'
]) where r.name = 'Student'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(array[
  'dashboard.read','partner.read','deployment.read','project.read','feedback.read','invoice.read','ticket.create'
]) where r.name = 'Corporate Partner'
on conflict do nothing;

create index if not exists idx_profiles_role_id on public.profiles(role_id);
create index if not exists idx_profiles_employee_id on public.profiles(employee_id);
create index if not exists idx_profiles_student_id on public.profiles(student_id);
create index if not exists idx_profiles_corporate_partner_id on public.profiles(corporate_partner_id);
create index if not exists idx_employees_email on public.employees(email);
create index if not exists idx_employees_department on public.employees(department);
create index if not exists idx_attendance_employee_date on public.attendance(employee_id, date);
create index if not exists idx_leave_employee_status on public.leave_requests(employee_id, status);
create index if not exists idx_payroll_employee_month on public.payroll(employee_id, month);
create index if not exists idx_projects_status_manager_id on public.projects(status, manager_id);
create index if not exists idx_tasks_project_assigned_status on public.tasks(project_id, assigned_to, status);
create index if not exists idx_timesheets_employee_project_status on public.timesheets(employee_id, project_id, approval_status);
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_timesheets_no_duplicate_active'
  ) and not exists (
    select 1
    from public.timesheets
    where approval_status in ('Pending', 'Approved')
    group by employee_id, task_id, date
    having count(*) > 1
  ) then
    create unique index idx_timesheets_no_duplicate_active
      on public.timesheets(employee_id, task_id, date)
      where approval_status in ('Pending', 'Approved');
  end if;
end $$;
create index if not exists idx_invoices_client_status_due on public.invoices(client, payment_status, due_date);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create index if not exists idx_sprint_enrollments_student on public.sprint_enrollments(student_id);
create index if not exists idx_deployments_student_partner_project on public.intern_deployments(student_id, corporate_partner_id, project_id);
create index if not exists idx_readiness_student_id on public.readiness_scores(student_id);
create index if not exists idx_ppo_student_partner on public.ppo_records(student_id, corporate_partner_id);
create index if not exists idx_invitations_email_status on public.user_invitations(email, status);
create index if not exists idx_role_change_status on public.role_change_requests(status);
create index if not exists idx_audit_logs_actor_action on public.audit_logs(actor_user_id, action, created_at);
create index if not exists idx_onboarding_tasks_profile_status on public.onboarding_tasks(profile_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles','permissions','role_permissions','profiles','departments','employees','students','corporate_partners',
    'attendance','leave_requests','payroll','projects','tasks','timesheets','career_sprints','sprint_enrollments',
    'intern_deployments','readiness_scores','ppo_records','invoices','expenses','assets','documents','tickets','notifications',
    'user_invitations','role_change_requests','audit_logs','approval_requests','onboarding_tasks','user_security_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'roles','permissions','role_permissions','profiles','departments','employees','students','corporate_partners',
    'attendance','leave_requests','payroll','projects','tasks','timesheets','career_sprints','sprint_enrollments',
    'intern_deployments','readiness_scores','ppo_records','invoices','expenses','assets','documents','tickets','notifications',
    'user_invitations','role_change_requests','audit_logs','approval_requests','onboarding_tasks','user_security_events'
  ]
  loop
    for policy_name in
      select pol.policyname from pg_policies pol where pol.schemaname = 'public' and pol.tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
    execute format('create policy "super_admin_all" on public.%I for all using (public.is_super_admin()) with check (public.is_super_admin())', table_name);
  end loop;
end $$;

create policy "profiles_read_own_or_managers" on public.profiles
  for select using (id = auth.uid() or public.is_hr_manager() or public.is_project_manager() or public.is_mentor() or public.is_finance_manager());
create policy "profiles_insert_own_invited" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own_or_account_admin" on public.profiles
  for update using (id = auth.uid() or public.is_super_admin() or public.is_hr_manager())
  with check (id = auth.uid() or public.is_super_admin() or public.is_hr_manager());

create policy "roles_authenticated_read" on public.roles
  for select using (auth.uid() is not null);
create policy "permissions_authenticated_read" on public.permissions
  for select using (auth.uid() is not null);
create policy "role_permissions_authenticated_read" on public.role_permissions
  for select using (auth.uid() is not null);

create policy "employees_hr_manage" on public.employees
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "employees_read_self_and_managers" on public.employees
  for select using (
    id = public.get_current_employee_id()
    or public.is_project_manager()
    or public.is_mentor()
    or public.is_finance_manager()
  );
create policy "employees_self_update_profile_fields" on public.employees
  for update using (id = public.get_current_employee_id())
  with check (id = public.get_current_employee_id());

create policy "attendance_hr_manage" on public.attendance
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "attendance_finance_payroll_read" on public.attendance
  for select using (public.is_finance_manager());
create policy "attendance_self_read" on public.attendance
  for select using (employee_id = public.get_current_employee_id());
create policy "attendance_self_insert" on public.attendance
  for insert with check (employee_id = public.get_current_employee_id());
create policy "attendance_self_update" on public.attendance
  for update using (employee_id = public.get_current_employee_id()) with check (employee_id = public.get_current_employee_id());
create policy "leave_hr_manage" on public.leave_requests
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "leave_finance_payroll_read" on public.leave_requests
  for select using (public.is_finance_manager());
create policy "leave_self_read" on public.leave_requests
  for select using (employee_id = public.get_current_employee_id());
create policy "leave_self_insert" on public.leave_requests
  for insert with check (employee_id = public.get_current_employee_id());
create policy "leave_self_update_pending" on public.leave_requests
  for update using (employee_id = public.get_current_employee_id() and status = 'Pending')
  with check (employee_id = public.get_current_employee_id());
create policy "payroll_hr_finance_read" on public.payroll
  for select using (public.is_hr_manager() or public.is_finance_manager());
create policy "payroll_hr_process" on public.payroll
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "payroll_finance_insert" on public.payroll
  for insert with check (public.is_finance_manager());
create policy "payroll_finance_update" on public.payroll
  for update using (public.is_finance_manager()) with check (public.is_finance_manager());
create policy "payroll_self_read" on public.payroll
  for select using (employee_id = public.get_current_employee_id());
create policy "projects_pm_manage" on public.projects
  for all using (public.is_project_manager()) with check (public.is_project_manager());
create policy "projects_finance_read_profitability" on public.projects
  for select using (public.is_finance_manager());
create policy "projects_partner_read_assigned" on public.projects
  for select using (corporate_partner_id = public.get_current_partner_id());
create policy "projects_employee_member_read" on public.projects
  for select using (public.get_current_employee_id() = any(assigned_members) or manager_id = public.get_current_employee_id());
create policy "tasks_pm_manage" on public.tasks
  for all using (public.is_project_manager()) with check (public.is_project_manager());
create policy "tasks_finance_read_profitability" on public.tasks
  for select using (public.is_finance_manager());
create policy "tasks_self_read" on public.tasks
  for select using (assigned_to = public.get_current_employee_id());
create policy "tasks_mentor_manage" on public.tasks
  for all using (public.is_mentor()) with check (public.is_mentor());

create policy "timesheets_pm_manage" on public.timesheets
  for all using (public.is_project_manager()) with check (public.is_project_manager());
create policy "timesheets_finance_read_profitability" on public.timesheets
  for select using (public.is_finance_manager());
create policy "timesheets_self_read" on public.timesheets
  for select using (employee_id = public.get_current_employee_id());
create policy "timesheets_self_insert" on public.timesheets
  for insert with check (employee_id = public.get_current_employee_id());
create policy "timesheets_self_update_pending" on public.timesheets
  for update using (employee_id = public.get_current_employee_id() and approval_status = 'Pending')
  with check (employee_id = public.get_current_employee_id());
create policy "invoices_finance_manage" on public.invoices
  for all using (public.is_finance_manager()) with check (public.is_finance_manager());
create policy "invoices_partner_read" on public.invoices
  for select using (corporate_partner_id = public.get_current_partner_id());
create policy "expenses_finance_manage" on public.expenses
  for all using (public.is_finance_manager()) with check (public.is_finance_manager());

create policy "career_sprints_finance_read_profitability" on public.career_sprints
  for select using (public.is_finance_manager());

create policy "notifications_read_targeted" on public.notifications
  for select using (user_id = auth.uid() or role_target = public.get_current_role());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_managers_insert" on public.notifications
  for insert with check (
    public.is_hr_manager() or public.is_project_manager() or public.is_mentor() or public.is_finance_manager()
  );
create policy "notifications_attendance_request_insert" on public.notifications
  for insert with check (
    auth.uid() is not null
    and related_module = 'Attendance'
    and role_target in ('HR Manager', 'Super Admin')
  );
create policy "notifications_leave_request_insert" on public.notifications
  for insert with check (
    auth.uid() is not null
    and related_module = 'Leave'
    and role_target in ('HR Manager', 'Super Admin')
  );
create policy "notifications_timesheet_request_insert" on public.notifications
  for insert with check (
    auth.uid() is not null
    and related_module = 'Timesheets'
    and role_target in ('Project Manager', 'Super Admin')
  );
create policy "notifications_self_service_insert" on public.notifications
  for insert with check (
    auth.uid() is not null
    and (user_id = auth.uid() or role_target in ('HR Manager', 'Finance Manager', 'Super Admin'))
    and related_module in ('Leave', 'Payroll', 'Account', 'Role Change', 'Profile', 'Security', 'Approval')
  );

create policy "invitations_admin_read" on public.user_invitations
  for select using (public.is_super_admin() or public.is_hr_manager() or lower(email) = lower((auth.jwt() ->> 'email')));
create policy "invitations_admin_insert" on public.user_invitations
  for insert with check (public.is_super_admin() or public.is_hr_manager());
create policy "invitations_admin_update" on public.user_invitations
  for update using (public.is_super_admin() or public.is_hr_manager() or lower(email) = lower((auth.jwt() ->> 'email')))
  with check (public.is_super_admin() or public.is_hr_manager() or lower(email) = lower((auth.jwt() ->> 'email')));

create policy "role_changes_admin_read" on public.role_change_requests
  for select using (public.is_super_admin() or public.is_hr_manager() or user_id = auth.uid());
create policy "role_changes_hr_insert" on public.role_change_requests
  for insert with check (public.is_super_admin() or public.is_hr_manager());
create policy "role_changes_super_update" on public.role_change_requests
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.is_super_admin() or public.is_hr_manager());
create policy "audit_logs_authenticated_insert" on public.audit_logs
  for insert with check (auth.uid() is not null);

create policy "approval_requests_admin_manage" on public.approval_requests
  for all using (public.is_super_admin() or public.is_hr_manager()) with check (public.is_super_admin() or public.is_hr_manager());
create policy "approval_requests_own_read" on public.approval_requests
  for select using (requester_id = auth.uid() or approver_id = auth.uid());

create policy "onboarding_tasks_own_manage" on public.onboarding_tasks
  for all using (profile_id = auth.uid() or public.is_super_admin() or public.is_hr_manager())
  with check (profile_id = auth.uid() or public.is_super_admin() or public.is_hr_manager());

create policy "security_events_own_insert" on public.user_security_events
  for insert with check (user_id = auth.uid());
create policy "security_events_admin_read" on public.user_security_events
  for select using (public.is_super_admin() or public.is_hr_manager());

create policy "students_mentor_manage" on public.students
  for all using (public.is_mentor()) with check (public.is_mentor());
create policy "students_self_read" on public.students
  for select using (id = public.get_current_student_id());
create policy "students_self_update_profile_fields" on public.students
  for update using (id = public.get_current_student_id())
  with check (id = public.get_current_student_id());
create policy "partners_admin_manage" on public.corporate_partners
  for all using (public.is_super_admin() or public.is_hr_manager()) with check (public.is_super_admin() or public.is_hr_manager());
create policy "partners_self_read_update" on public.corporate_partners
  for all using (id = public.get_current_partner_id()) with check (id = public.get_current_partner_id());
create policy "career_sprints_mentor_manage" on public.career_sprints
  for all using (public.is_mentor()) with check (public.is_mentor());
create policy "career_sprints_student_enrolled_read" on public.career_sprints
  for select using (
    exists (
      select 1 from public.sprint_enrollments se
      where se.sprint_id = career_sprints.id and se.student_id = public.get_current_student_id()
    )
  );

create policy "sprint_enrollments_mentor_manage" on public.sprint_enrollments
  for all using (public.is_mentor()) with check (public.is_mentor());
create policy "sprint_enrollments_student_read" on public.sprint_enrollments
  for select using (student_id = public.get_current_student_id());

create policy "deployments_pm_manage" on public.intern_deployments
  for all using (public.is_project_manager()) with check (public.is_project_manager());
create policy "deployments_partner_read" on public.intern_deployments
  for select using (corporate_partner_id = public.get_current_partner_id());
create policy "deployments_student_read" on public.intern_deployments
  for select using (student_id = public.get_current_student_id());
create policy "readiness_mentor_manage" on public.readiness_scores
  for all using (public.is_mentor()) with check (public.is_mentor());
create policy "readiness_student_read" on public.readiness_scores
  for select using (student_id = public.get_current_student_id());
create policy "ppo_mentor_manage" on public.ppo_records
  for all using (public.is_mentor()) with check (public.is_mentor());
create policy "ppo_student_read" on public.ppo_records
  for select using (student_id = public.get_current_student_id());
create policy "ppo_partner_read" on public.ppo_records
  for select using (corporate_partner_id = public.get_current_partner_id());
create policy "assets_hr_manage" on public.assets
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "documents_hr_manage" on public.documents
  for all using (public.is_hr_manager()) with check (public.is_hr_manager());
create policy "documents_owner_read" on public.documents
  for select using (
    owner_profile_id = auth.uid()
    or employee_id = public.get_current_employee_id()
    or student_id = public.get_current_student_id()
    or corporate_partner_id = public.get_current_partner_id()
  );

create policy "tickets_staff_manage" on public.tickets
  for all using (public.is_hr_manager() or public.is_project_manager() or public.is_finance_manager())
  with check (public.is_hr_manager() or public.is_project_manager() or public.is_finance_manager());
create policy "tickets_own_create" on public.tickets
  for insert with check (raised_by_profile_id = auth.uid());
create policy "tickets_own_read" on public.tickets
  for select using (raised_by_profile_id = auth.uid() or assigned_to_profile_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles','permissions','profiles','departments','employees','students','corporate_partners',
    'attendance','leave_requests','payroll','projects','tasks','timesheets','career_sprints',
    'sprint_enrollments','intern_deployments','readiness_scores','ppo_records','invoices',
    'expenses','assets','documents','tickets','notifications','user_invitations','role_change_requests',
    'approval_requests','onboarding_tasks'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

comment on table public.profiles is 'Application profile linked one-to-one with Supabase Auth users.';
comment on table public.role_permissions is 'Database-backed RBAC mapping used by future frontend auth integration.';
comment on table public.notifications is 'Target either a specific profile user_id or a role_target name.';
comment on policy "deployments_partner_read" on public.intern_deployments is 'Corporate partner visibility currently uses corporate_partner_id assignment.';
comment on policy "invoices_partner_read" on public.invoices is 'Corporate partner invoice visibility currently uses corporate_partner_id assignment.';
