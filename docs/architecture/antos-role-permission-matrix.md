# AntOS Role Permission Matrix

This matrix summarizes current role/module access from the inspected permission and route maps. "Full Access" applies to Super Admin because the app explicitly allows Super Admin through every authorized route.

| Module | Super Admin | HR Manager | Project Manager | Mentor | Finance Manager | Employee | Intern | Student | Corporate Partner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Full Access | View All | View All | View All | View All | View Own | View Own | View Own | View Own |
| Employees | Full Access | Manage | No Access | No Access | No Access | No Access | No Access | No Access | No Access |
| Attendance | Full Access | Approve | No Access | No Access | No Access | Submit | Submit | No Access | No Access |
| Leave | Full Access | Approve | No Access | No Access | No Access | Submit | Submit | No Access | No Access |
| Payroll | Full Access | Manage | No Access | No Access | Manage | View Own | View Own | No Access | No Access |
| Projects | Full Access | No Access | Manage | No Access | No Access | No Access | No Access | No Access | View All |
| Tasks | Full Access | No Access | Manage | Manage | No Access | View Own | View Own | No Access | No Access |
| Timesheets | Full Access | No Access | Approve | No Access | No Access | Submit | Submit | No Access | No Access |
| Students | Full Access | No Access | No Access | Manage | No Access | No Access | No Access | View Own | No Access |
| Career Sprints | Full Access | No Access | No Access | Manage | No Access | No Access | No Access | View Own | No Access |
| Readiness Scores | Full Access | No Access | No Access | Manage | No Access | No Access | View Own | View Own | No Access |
| PPO Tracker | Full Access | No Access | No Access | Manage | No Access | No Access | No Access | View Own | No Access |
| Corporate Partners | Full Access | No Access | No Access | No Access | No Access | No Access | No Access | No Access | View Own |
| Intern Deployment | Full Access | No Access | Manage | No Access | No Access | No Access | View Own | No Access | View All |
| Finance | Full Access | No Access | No Access | No Access | Manage | No Access | No Access | No Access | No Access |
| Invoices | Full Access | No Access | No Access | No Access | Manage | No Access | No Access | No Access | View Own |
| Expenses | Full Access | No Access | No Access | No Access | Manage | No Access | No Access | No Access | No Access |
| Assets | Full Access | Manage | No Access | No Access | No Access | No Access | No Access | No Access | No Access |
| Documents | Full Access | Manage | No Access | No Access | No Access | View Own | No Access | No Access | No Access |
| Helpdesk | Full Access | Manage | Submit | Submit | Submit | Submit | Submit | Submit | Submit |
| Invitations | Full Access | Manage | No Access | No Access | No Access | No Access | No Access | No Access | No Access |
| Role Changes | Full Access | Submit | No Access | No Access | No Access | No Access | No Access | No Access | No Access |
| Audit Logs | Full Access | No Access | No Access | No Access | No Access | No Access | No Access | No Access | No Access |
| Settings | Full Access | No Access | No Access | No Access | No Access | No Access | No Access | No Access | No Access |

## Notes

- Super Admin bypasses normal route permission checks in `AuthorizedRoute`.
- HR has invitation permissions, but the invitation UI restricts HR to Employee and Intern invitations.
- HR has role change request permission, while Super Admin has role change approval permission.
- Finance Manager can access payroll processing when `payroll.process` is present.
- Student and Corporate Partner access remains scoped and excludes internal HR, payroll, finance management, and admin modules.
- Some visible placeholder pages still use in-memory scaffold data until dedicated Supabase services are implemented.
