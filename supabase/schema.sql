-- AntOS - AntBox Operating System
-- Supabase PostgreSQL readiness schema.
-- This schema is not required for local demo mode. The current app runs with localStorage.

create extension if not exists "pgcrypto";

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (role_id, permission_id)
);

create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  full_name text not null,
  role_id uuid references roles(id),
  employee_id uuid,
  student_id uuid,
  partner_id uuid,
  status text default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null,
  name text not null,
  email text unique not null,
  phone text,
  department text,
  designation text,
  manager text,
  joining_date date,
  employment_type text,
  salary numeric default 0,
  work_location text,
  status text default 'Active',
  avatar text,
  skills text[] default '{}',
  documents text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists students (
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
  ppo_status text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists corporate_partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  industry text,
  hiring_need text,
  active_sprints int default 0,
  interns_deployed int default 0,
  ppos_issued int default 0,
  revenue_generated numeric default 0,
  account_owner text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  date date not null,
  check_in time,
  check_out time,
  work_mode text,
  status text,
  working_hours numeric default 0,
  regularization_status text default 'None',
  regularization_reason text,
  corrected_check_in time,
  corrected_check_out time,
  leave_request_id uuid,
  approved_by text,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  days numeric not null,
  reason text not null,
  status text default 'Pending',
  manager_remarks text,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
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
  paid_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, month)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique,
  name text not null,
  client text,
  manager text,
  start_date date,
  deadline date,
  assigned_members uuid[] default '{}',
  budget numeric default 0,
  revenue numeric default 0,
  progress numeric default 0,
  status text,
  health text,
  priority text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  title text not null,
  description text,
  assigned_to uuid references employees(id),
  priority text,
  due_date date,
  estimated_hours numeric default 0,
  actual_hours numeric default 0,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  project_id uuid references projects(id),
  task_id uuid references tasks(id),
  date date not null,
  hours_worked numeric not null,
  type text,
  description text,
  approval_status text default 'Pending',
  submitted_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  manager_remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists career_sprints (
  id uuid primary key default gen_random_uuid(),
  sprint_code text unique,
  name text not null,
  domain text,
  corporate_partner text,
  mentor text,
  start_date date,
  end_date date,
  students_enrolled int default 0,
  completion_rate numeric default 0,
  average_readiness_score numeric default 0,
  ppos_issued int default 0,
  status text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists intern_deployments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  intern_name text,
  corporate_client text,
  project_assigned text,
  mentor text,
  start_date date,
  end_date date,
  attendance_percentage numeric default 0,
  timesheet_compliance numeric default 0,
  task_completion numeric default 0,
  client_feedback numeric default 0,
  performance_score numeric default 0,
  ppo_probability numeric default 0,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists readiness_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  task_completion numeric default 0,
  mentor_feedback numeric default 0,
  client_feedback numeric default 0,
  attendance numeric default 0,
  communication numeric default 0,
  timesheet_discipline numeric default 0,
  final_score numeric default 0,
  recommendation text,
  strengths text[] default '{}',
  improvement_areas text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  client text not null,
  project_or_sprint text,
  amount numeric not null,
  due_date date,
  payment_status text default 'Draft',
  revenue_category text,
  paid_at timestamptz,
  created_by text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text,
  description text,
  amount numeric not null,
  date date,
  status text default 'Pending',
  created_by text,
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique,
  asset_type text,
  assigned_to text,
  issue_date date,
  condition text,
  return_status text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text,
  owner text,
  uploaded_date date,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  title text not null,
  category text,
  raised_by text,
  assigned_to text,
  priority text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  role_target text,
  title text not null,
  message text not null,
  type text,
  related_module text,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role_id on profiles(role_id);
create index if not exists idx_attendance_employee_id on attendance(employee_id);
create index if not exists idx_attendance_status on attendance(status);
create index if not exists idx_leave_employee_id on leave_requests(employee_id);
create index if not exists idx_leave_status on leave_requests(status);
create index if not exists idx_payroll_employee_id on payroll(employee_id);
create index if not exists idx_projects_status on projects(status);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_timesheets_employee_id on timesheets(employee_id);
create index if not exists idx_timesheets_project_id on timesheets(project_id);
create index if not exists idx_students_status on students(status);
create index if not exists idx_readiness_student_id on readiness_scores(student_id);
create index if not exists idx_invoices_status on invoices(payment_status);
create index if not exists idx_expenses_status on expenses(status);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_role_target on notifications(role_target);
create index if not exists idx_notifications_created_at on notifications(created_at);

-- Future RLS policy plan:
-- Super Admin can access everything.
-- HR Manager can manage employees, attendance, leave, and payroll.
-- Project Manager can manage projects, tasks, timesheets, deployments, and client feedback.
-- Mentor can manage students, career sprints, readiness scores, and PPO recommendations.
-- Finance Manager can manage invoices, expenses, payroll cost, and profitability views.
-- Employee and Intern can read/write only their own attendance, leave, and timesheets.
-- Student can read own sprint, readiness, certificate, and PPO data.
-- Corporate Partner can read assigned interns, project progress, feedback, and invoices.
