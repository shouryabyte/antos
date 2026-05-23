# AntOS - AntBox Operating System

AntOS is an ERP prototype customized for AntBox's talent-tech operating model. It connects HRMS, projects, attendance, career sprints, students, corporate partners, intern deployment, readiness scoring, PPO tracking, finance, assets, documents, helpdesk, and role permissions.

## Features
- Executive ERP dashboard with KPIs, charts, alerts, approvals, and the AntBox Operating Flow.
- People, HRMS, work management, academy, IaaS operations, finance, and admin modules.
- Mock data with Indian names, AntBox departments, career sprints, partners, students, internships, invoices, and tickets.
- Add/edit/delete-ready localStorage architecture for core modules.
- Business logic for attendance, leave, payroll, project health, utilization, readiness scores, finance, and PPO recommendations.
- Responsive SaaS layout with dark sidebar, light workspace, emerald accent, clean tables, status badges, progress bars, and charts.

## Tech Stack
React, Vite, TypeScript, Tailwind CSS, shadcn-style components, lucide-react, Recharts, TanStack Table, React Router, React Hook Form, Zod, Zustand, date-fns, localStorage.

## Modules
Dashboard, Employees, Interns, Students, Departments, Attendance, Leave, Payroll, Onboarding, Exit Management, Projects, Tasks, Timesheets, Deliverables, Career Sprints, Mentors, Readiness Scores, Certificates, Corporate Partners, Intern Deployment, Client Feedback, PPO Tracker, Finance, Assets, Documents, Helpdesk Tickets, Roles & Permissions, Settings.

## Business Logic
Readiness Score = task completion 30% + mentor feedback 25% + client feedback 20% + attendance 10% + communication 10% + timesheet discipline 5%. Payroll, attendance, project health, utilization, finance, and PPO recommendation formulas live in `src/lib/calculations.ts`.

## Run
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Future Production Plan
Replace localStorage services with Supabase repositories, add authentication and RLS policies, introduce audit logs and workflow approvals, connect payroll/invoice exports, and add role-based route guards.

## Supabase Integration Plan
`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It intentionally does not require Supabase for the MVP. Add the real client dependency and repository functions when moving from prototype to production.
