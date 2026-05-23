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
- localStorage demo persistence
- Recharts
- lucide-react
- Supabase-ready architecture

## Demo Credentials
All demo accounts use password `password`.

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
The app runs without Supabase in demo mode. `src/lib/supabase.ts` reads:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

If those variables are empty, AntOS stays in localStorage mode. `supabase/schema.sql` contains the production-ready table structure and RLS policy plan.

## Future Production Plan
- Connect Supabase Auth
- Apply Supabase RLS policies
- Replace localStorage services with Supabase queries
- Add file uploads using Supabase Storage
- Add email notifications
- Add audit logs
- Add real payroll/statutory compliance
- Add advanced reporting
