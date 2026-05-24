# AntOS - AntBox Operating System

AntOS is a centralized ERP prototype customized for AntBox's talent-tech and internship-as-a-service operating model. It connects HRMS, projects, students, career sprints, corporate partners, intern deployment, readiness scoring, PPO tracking, payroll, finance, notifications, and approvals in one operating workspace.

## Key Modules
- Authentication, authorization, RBAC, and protected routes
- Employee self-service
- Attendance and attendance regularization
- Leave management
- Payroll
- Projects, tasks, and timesheets
- Students, Career Sprints, readiness scores, and PPO tracker
- Corporate partners and intern deployment
- Finance, invoices, expenses, and profitability
- Assets, documents, helpdesk tickets
- Notifications and automations

## Tech Stack
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- React Router
- Zustand
- Supabase Auth, Postgres, and RLS as the production ERP data layer
- Recharts
- lucide-react
- Demo fallback when Supabase env variables are not configured

## Demo Credentials
Local demo fallback accounts use password `password` when Supabase env variables are not configured.

Seeded Supabase accounts use password `Antos@12345`.

| Role | Email |
| --- | --- |
| Super Admin | `superadmin@antos.dev` |
| HR Manager | `hr@antos.dev` |
| Project Manager | `pm@antos.dev` |
| Mentor | `mentor@antos.dev` |
| Finance Manager | `finance@antos.dev` |
| Employee | `employee@antos.dev` |
| Intern | `intern@antos.dev` |
| Student | `student@antos.dev` |
| Corporate Partner | `partner@antos.dev` |

## Role-Based Access
AntOS uses authentication, a permission map, role-based sidebar visibility, and route-level authorization. Unauthorized users stay logged in but see an Access Denied page when opening restricted modules manually.

Super Admin can access everything. HR can manage people, attendance, leave, and payroll. Project Managers manage projects, tasks, timesheets, and deployments. Mentors manage students, sprints, readiness, and PPO workflows. Finance manages invoices, expenses, payroll cost, and profitability. Employees, interns, students, and corporate partners see scoped self-service/client-facing routes.

## Main Workflows
- Employee login with session persistence
- Attendance check-in/check-out with automatic status and working hours
- Attendance regularization request and HR approval
- Leave application and HR approval/rejection
- Approved leave sync to attendance
- Payroll generation using salary, attendance, unpaid leave, and LOP
- Timesheet submission and Project Manager approval
- Finance invoice/payment tracking and expense workflow
- Notification flow for approvals, payroll, finance, readiness, and PPO events

## Automations
- Auto attendance status calculation
- Auto absent marking for past working days
- Approved leave to attendance sync
- Payroll LOP calculation from unpaid leave and unregularized absences
- Project health calculation
- Readiness score calculation
- PPO recommendation
- Invoice overdue status
- Pending approvals count for dashboard

## How To Run
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Supabase Readiness
Supabase is the primary data source for production ERP records. `src/lib/supabase.ts` reads:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

When these variables are configured, Auth and migrated ERP modules read/write Supabase directly. `supabase/schema.sql` contains the production-ready table structure and RLS policy plan.

If the variables are empty, AntOS uses demo auth/session fallback so the UI can still open for local review. Browser storage is not used for production ERP records. Any remaining localStorage usage is limited to demo authentication/session persistence; legacy mock data is an in-memory scaffold for non-migrated placeholder pages only and is not persisted as business data.

Migrated Supabase-backed workflows:
- Dashboard aggregates
- Attendance and regularization
- Leave and leave-to-attendance sync
- Payroll generation and processing
- Timesheets and approvals
- Finance, invoices, expenses, and profitability
- Notifications surfaced from Supabase
- Onboarding/account lifecycle

The frontend must only use the public Supabase URL and anon key. The service role key is only for backend/admin scripts and must never be exposed through `VITE_` variables, bundled frontend code, browser storage, screenshots, or committed files.

## Future Production Plan
- Continue replacing legacy placeholder pages with dedicated Supabase services
- Add file uploads using Supabase Storage
- Add email notifications
- Add audit logs
- Add real payroll/statutory compliance
- Add advanced reporting

## Supabase Backend Setup
Run the Supabase backend setup before using production data workflows.

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. In Supabase Project Settings, copy the project URL and the `service_role` key.
4. Create `.env.seed` from `.env.seed.example`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Run the seed script:

```bash
npm run seed:supabase
```

The seed script creates Supabase Auth users, confirms their emails, and inserts matching profiles, RBAC records, employees, students, partners, projects, tasks, attendance, leave, payroll, timesheets, sprints, deployments, readiness scores, PPO records, invoices, expenses, assets, documents, tickets, and notifications.

Seeded Supabase login password for every user is `Antos@12345`.

| Role | Email |
| --- | --- |
| Super Admin | `superadmin@antos.dev` |
| HR Manager | `hr@antos.dev` |
| Project Manager | `pm@antos.dev` |
| Mentor | `mentor@antos.dev` |
| Finance Manager | `finance@antos.dev` |
| Employee | `employee@antos.dev` |
| Intern | `intern@antos.dev` |
| Student | `student@antos.dev` |
| Corporate Partner | `partner@antos.dev` |

Do not put the service role key in `VITE_` variables, frontend code, or committed files. `.env.seed` and `.env.local` are ignored by git.

## Architecture Notes

- Authentication comes from Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present.
- User role, lifecycle status, and entity mappings are loaded from Supabase `profiles`.
- Frontend authorization uses route-level permission checks plus role-aware sidebar filtering.
- Database authorization is enforced with Supabase RLS policies in `supabase/schema.sql`.
- Production ERP records for Attendance, Leave, Payroll, Timesheets, Finance, Notifications, Onboarding, and Dashboard aggregates are read from Supabase.
- Legacy mock data remains only as an in-memory scaffold for non-migrated placeholder pages and is not persisted to browser storage.

## Manual Testing

Use the role-wise checklist before demo or deployment:

- [docs/testing/MANUAL_TEST_CHECKLIST.md](docs/testing/MANUAL_TEST_CHECKLIST.md)

The checklist covers seeded credentials, allowed pages, restricted pages, core workflows, lifecycle redirects, route smoke tests, and expected results for all supported roles.

## Deployment Notes

1. Run `npm run build` locally or in CI before deploying.
2. Apply `supabase/schema.sql` to the target Supabase project.
3. Seed only with `.env.seed` on a trusted machine or CI secret context.
4. Configure deployed frontend env variables with only:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Verify SPA route fallback is configured by the hosting provider so refreshed protected routes load `index.html`.
6. Run the manual testing checklist with at least Super Admin, HR Manager, Project Manager, Finance Manager, Employee, Student, and Corporate Partner accounts.

Security warning: never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code, committed files, public logs, or browser-accessible environment variables.

## Professional User Onboarding
AntOS now uses invitation-first account provisioning for employees, interns, and privileged roles. Public users cannot choose admin roles.

- Super Admin can invite any role.
- HR Manager can invite only Employee and Intern users.
- HR Manager can request role changes, but privileged roles require Super Admin approval.
- Student access is limited to Student workflows and remains `Pending Verification` after profile completion.
- Corporate Partner access remains `Pending Partner Approval` until verified.
- Suspended and Exited users are blocked from protected ERP routes.
- Pending Profile Completion users are redirected to `/complete-profile`.

New account lifecycle statuses:

```text
Invited
Pending Profile Completion
Pending Verification
Pending Partner Approval
Active
Suspended
Exited
```

Admin routes:

```text
/admin/invitations
/admin/role-change-requests
/admin/audit-logs
/complete-profile
/account-disabled
/pending-verification
```

Onboarding automations:
- Auto-expire pending invitations after `expires_at`.
- Prevent duplicate active pending invitations for the same email.
- Accept matching pending invitations during first login.
- Create profile records from invitation data when needed.
- Generate role-aware onboarding tasks.
- Complete onboarding tasks after profile completion.
- Activate employee/admin accounts after required profile fields are complete.
- Keep students and partners in verification/approval statuses.
- Log account, invitation, profile, lifecycle, and role-change events.
- Create account notifications for invitations, role changes, profile completion, verification, partner approval, and lifecycle changes.

If production email delivery is not configured, invitation records are still created and the UI exposes a copyable test invite link. Production email delivery can later be implemented with Supabase Auth `inviteUserByEmail`, a Supabase Edge Function, or an external email provider.
