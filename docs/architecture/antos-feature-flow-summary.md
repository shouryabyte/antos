# AntOS Role-Based ERP Feature Flow Summary

AntOS starts every protected workflow with login. In Supabase mode, `AuthProvider` signs the user in through Supabase Auth, loads the matching `profiles` row, resolves the role from `roles`, and loads permissions through `role_permissions` and `permissions`.

The resolved role controls the sidebar through `roleSidebarPaths`. It also controls direct URL access through `routePermissions` and `AuthorizedRoute`. Hiding sidebar items is not the only protection; unauthorized routes render Access Denied.

Approvals follow a consistent pattern. A requester creates a pending record, an authorized approver reviews it, the target business table is updated, and notifications or audit logs are created where helper functions are integrated.

Super Admin owns the full ERP control plane: users, roles, invitations, role changes, audit logs, all modules, and override approval capability.

HR Manager owns people operations: employees, interns, attendance, leave, onboarding, payroll where permitted, assets, documents, and HR helpdesk workflows.

Project Manager owns delivery operations: projects, tasks, deliverables, intern deployment, project progress, and timesheet approval.

Mentor owns academy operations: students, career sprints, readiness review, feedback, certificates, and PPO tracking.

Finance Manager owns commercial operations: invoices, expenses, payroll cost, profitability, finance dashboard, and finance status updates.

Employee and Intern users contribute self-service records: attendance, regularization, leave, timesheets, tasks, payslips, helpdesk tickets, and documents where permitted. They see scoped data rather than all employee records.

Student and Corporate Partner users are external-facing roles. Student access is limited to student, sprint, readiness, certificate, and PPO flows. Corporate Partner access is limited to assigned interns, project progress, feedback, and own invoices where mapping exists.

Notifications and audit logs provide accountability across invitation, onboarding, role changes, attendance, leave, payroll, timesheets, and finance workflows. Dashboard aggregates use Supabase data from operational modules to summarize pending approvals, finance, attendance, project health, readiness, and PPO status.
