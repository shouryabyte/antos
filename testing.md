# AntOS Testing Guide

All demo accounts use the same password:

```text
password
```

## Demo Login Accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@antos.dev` | `password` |
| HR Manager | `hr@antos.dev` | `password` |
| Project Manager | `pm@antos.dev` | `password` |
| Mentor | `mentor@antos.dev` | `password` |
| Finance Manager | `finance@antos.dev` | `password` |
| Employee | `employee@antos.dev` | `password` |
| Intern | `intern@antos.dev` | `password` |
| Student | `student@antos.dev` | `password` |
| Corporate Partner | `partner@antos.dev` | `password` |

## Smoke Test Checklist

1. Login at `/login`.
2. Confirm refresh keeps the session when Remember session is checked.
3. Confirm Logout returns to `/login`.
4. Confirm sidebar changes by role.
5. Try opening a restricted URL manually and confirm Access Denied appears.
6. Test attendance check-in/check-out as Employee or Intern.
7. Test attendance regularization as Employee or Intern, then approve as HR Manager.
8. Test leave application as Employee or Intern, then approve/reject as HR Manager.
9. Test payroll generation/process/paid as HR Manager, Finance Manager, or Super Admin.
10. Test timesheet submission as Employee or Intern, then approve/reject as Project Manager.
11. Test invoice and expense actions as Finance Manager.
12. Confirm notification bell shows unread items and marks them read when clicked.
