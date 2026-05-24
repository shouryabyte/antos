# AntOS Manual Test Checklist

Use the Supabase seeded accounts below. Every seeded user uses password `Antos@12345`.

Before testing:
- Run `supabase/schema.sql` in Supabase SQL Editor.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.seed`.
- Run `npm run seed:supabase`.
- Run `npm run build`.

## Super Admin

Login: `superadmin@antos.dev`

Allowed pages:
- `/dashboard`, `/employees`, `/interns`, `/students`, `/departments`
- `/attendance`, `/leave`, `/payroll`
- `/projects`, `/tasks`, `/timesheets`, `/deliverables`
- `/career-sprints`, `/mentors`, `/readiness-scores`, `/certificates`
- `/corporate-partners`, `/intern-deployment`, `/client-feedback`, `/ppo-tracker`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/assets`, `/documents`, `/helpdesk`, `/roles-permissions`
- `/admin/invitations`, `/admin/role-change-requests`, `/admin/audit-logs`, `/settings`

Restricted pages:
- None, except account lifecycle pages should only be reached by lifecycle redirects.

Workflows:
- Verify dashboard cards and charts load from Supabase without blank states or crashes.
- Create/revoke/resend invitations and confirm audit logs update.
- Approve role change requests.
- Review all approval queues: attendance, leave, timesheets, expenses, and role changes.
- Confirm direct URL navigation works after browser refresh.

Expected result:
- Full access is allowed, all pages render, and Supabase-backed changes persist after refresh.

## HR Manager

Login: `hr@antos.dev`

Allowed pages:
- `/dashboard`, `/employees`, `/interns`, `/departments`
- `/attendance`, `/leave`, `/payroll`
- `/assets`, `/documents`, `/helpdesk`
- `/admin/invitations`, `/admin/role-change-requests`, `/admin/audit-logs`
- `/finance/payroll-cost` when payroll read permission is present.

Restricted pages:
- `/finance/invoices`, `/finance/expenses`, `/finance/profitability`
- `/roles-permissions`
- Project manager, mentor, student, and partner-only pages unless an explicit permission exists.

Workflows:
- Invite Employee and Intern users only.
- Confirm HR cannot invite Super Admin, HR Manager, Finance Manager, Project Manager, or Mentor.
- Approve/reject attendance regularization.
- Approve/reject leave and confirm approved leave syncs to attendance as `Leave`.
- Generate/process payroll and confirm employee payslip visibility remains scoped.

Expected result:
- HR can manage HR workflows and payroll when permitted, but cannot manage finance or privileged roles.

## Project Manager

Login: `pm@antos.dev`

Allowed pages:
- `/dashboard`, `/projects`, `/tasks`, `/timesheets`
- `/deliverables`, `/intern-deployment`, `/client-feedback`, `/helpdesk`

Restricted pages:
- `/attendance`, `/leave`, `/payroll`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/employees`, `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`

Workflows:
- Review pending timesheets.
- Approve/reject a timesheet with manager remarks.
- Confirm approved billable hours affect utilization.
- Confirm rejected timesheets do not count toward utilization.

Expected result:
- Project Manager can run project and timesheet approvals only; restricted URLs show Access Denied.

## Mentor

Login: `mentor@antos.dev`

Allowed pages:
- `/dashboard`, `/students`, `/career-sprints`, `/mentors`
- `/readiness-scores`, `/certificates`, `/ppo-tracker`
- `/tasks`, `/helpdesk`

Restricted pages:
- `/attendance`, `/leave`, `/payroll`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`

Workflows:
- Review student, sprint, readiness, certificate, and PPO pages.
- Confirm mentor cannot approve HR, payroll, or finance records.

Expected result:
- Mentor sees student/readiness workflows and is blocked from internal HR, payroll, finance, and admin data.

## Finance Manager

Login: `finance@antos.dev`

Allowed pages:
- `/dashboard`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/payroll` when payroll processing permission is present.
- `/helpdesk`

Restricted pages:
- `/attendance`, `/leave`
- `/employees`, `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`
- Project Manager and Mentor approval pages unless an explicit permission exists.

Workflows:
- Create invoice, mark Sent, mark Paid, and mark Overdue.
- Create expense, approve/reject, and mark Paid.
- Confirm finance KPIs and profitability use Supabase payroll, timesheets, invoices, and expenses.
- Process payroll only when permission is present.

Expected result:
- Finance Manager can manage finance records and payroll cost, but cannot approve leave or attendance.

## Employee

Login: `employee@antos.dev`

Allowed pages:
- `/dashboard`, `/attendance`, `/leave`, `/payroll`
- `/tasks`, `/timesheets`, `/documents`, `/helpdesk`

Restricted pages:
- `/employees`, `/interns`, `/students`, `/departments`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`

Workflows:
- Check in and refresh; the current check-in remains visible.
- Check out and confirm the same attendance row updates.
- Submit attendance regularization.
- Apply leave and confirm status starts Pending.
- Submit a timesheet; duplicate pending/approved entries for the same employee/task/date should be blocked.
- View only own payslip, attendance, leave, and timesheet rows.

Expected result:
- Employee self-service works and no other employee records are visible.

## Intern

Login: `intern@antos.dev`

Allowed pages:
- `/dashboard`, `/attendance`, `/leave`, `/payroll`
- `/tasks`, `/timesheets`, `/intern-deployment`, `/readiness-scores`, `/documents`, `/helpdesk`

Restricted pages:
- Admin, finance management, employee master, HR approval, and payroll processing pages.

Workflows:
- Submit attendance, leave, and timesheet records.
- Verify own status updates after HR/PM approval.
- Confirm intern cannot process payroll or access finance.

Expected result:
- Intern sees scoped self-service and readiness/deployment data only.

## Student

Login: `student@antos.dev`

Allowed pages:
- `/dashboard`, `/students`, `/career-sprints`, `/readiness-scores`, `/certificates`, `/ppo-tracker`, `/helpdesk`

Restricted pages:
- `/attendance`, `/leave`, `/payroll`
- `/finance/invoices`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/employees`, `/interns`, `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`

Workflows:
- Confirm student-only pages render.
- Manually open restricted URLs and confirm Access Denied.
- For a Pending Verification student, confirm redirect to `/pending-verification`.

Expected result:
- Student never reaches internal HR, payroll, finance, or admin pages.

## Corporate Partner

Login: `partner@antos.dev`

Allowed pages:
- `/dashboard`, `/corporate-partners`, `/projects`, `/intern-deployment`, `/client-feedback`, `/finance/invoices`, `/helpdesk`

Restricted pages:
- `/attendance`, `/leave`, `/payroll`
- `/employees`, `/students`, `/finance/expenses`, `/finance/payroll-cost`, `/finance/profitability`
- `/roles-permissions`, `/admin/invitations`, `/admin/audit-logs`

Workflows:
- View assigned projects/intern deployments and client feedback.
- View own invoices only when partner invoice mapping exists.
- Confirm partner cannot see internal payroll, attendance, leave, or admin records.
- For Pending Partner Approval, confirm redirect to `/pending-verification`.

Expected result:
- Corporate Partner access is limited to assigned client-facing records.

## Account Lifecycle Checks

- Suspended users redirect to `/account-disabled`.
- Exited users redirect to `/account-disabled`.
- Invited and Pending Profile Completion users redirect to `/complete-profile`.
- Pending Verification students redirect to `/pending-verification`.
- Pending Partner Approval partners redirect to `/pending-verification`.
- Active users reach their allowed dashboard and preserve session after refresh.

## Route Smoke Test

For every role, manually open each allowed route and verify:
- The page renders without a blank screen.
- Refresh on the route keeps the session.
- Restricted routes show Access Denied.
- Header shows the correct full name, email, and role.
- Logout clears the session and returns to login.
