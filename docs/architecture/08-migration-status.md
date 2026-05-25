# Migration Status

This status reflects the current codebase inspection. A module is listed as Supabase-migrated only when the code contains Supabase-backed services or direct Supabase integration.

## Migrated To Supabase

| Area | Evidence | Notes |
| --- | --- | --- |
| Auth | `src/auth/AuthProvider.tsx`, `src/lib/supabase.ts` | Uses Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist. Demo fallback remains for local review. |
| Profiles/Roles/Permissions | `AuthProvider`, `permissions.ts`, `supabase/schema.sql` | Profile, role, and role permission rows drive application authorization in Supabase mode. |
| Onboarding/account lifecycle | `src/lib/onboardingAutomation.ts`, account/admin feature pages | Invitations, profile completion, lifecycle redirects, role changes, audit logs, and notifications use Supabase when configured. |
| Attendance | `src/services/attendanceService.ts`, `AttendancePage.tsx` | Check-in/out, status calculation, regularization, approval, and employee scoping are Supabase-backed. |
| Leave | `src/services/leaveService.ts`, `LeavePage.tsx` | Leave application, HR approval/rejection, balance calculation, LOP data, and leave-to-attendance sync are Supabase-backed. |
| Payroll | `src/services/payrollService.ts`, `PayrollPage.tsx` | Payroll generation, LOP calculation, processing, paid status, and self/all views are Supabase-backed. |
| Timesheets | `src/services/timesheetService.ts`, `TimesheetsPage.tsx` | Submission, duplicate prevention, approval/rejection, project/task lookup, summary, and utilization are Supabase-backed. |
| Finance | `src/services/financeService.ts`, `FinancePage.tsx` | Invoices, expenses, payment/approval statuses, finance summary, project profitability, and sprint profitability use Supabase. |
| Dashboard aggregates | `src/services/dashboardService.ts`, `DashboardPage.tsx` | KPI cards, pending approvals, finance snapshot, attendance summary, project health, readiness, PPO, and chart data are read from Supabase services. |
| Notifications | `Header.tsx`, `src/lib/notifications.ts`, `src/lib/onboardingAutomation.ts` | Header reads Supabase notifications when configured; helpers insert notifications in Supabase. |

## Remaining localStorage Usage

| Usage | Classification | Notes |
| --- | --- | --- |
| `AuthProvider` demo session keys | Demo fallback | Used only when Supabase env variables are missing. Not production ERP record storage. |

## Remaining mockData / Zustand Usage

| Usage | Classification | Notes |
| --- | --- | --- |
| `src/lib/mockData.ts` | Demo/in-memory scaffold | Supplies initial data to legacy placeholder pages. |
| `src/lib/storage.ts` | Demo/in-memory scaffold | `saveData` is a no-op and does not persist business records to localStorage. |
| `src/store/useAppStore.ts` | Demo/in-memory scaffold | Used by placeholder pages and not persisted as production ERP data. |
| `src/features/shared/ModulePage.tsx` | Placeholder module UI | Used by non-dedicated pages such as generic master/detail placeholders. |
| `src/app/routes.tsx` placeholder routes | Placeholder module UI | Some routes still render `ModulePage` using in-memory scaffold data. |
| `src/lib/automation.ts` | Legacy in-memory helper | Uses `useAppStore`; current production migrated workflows use Supabase services instead. |

## Important Limitations

- Several routes render generic `ModulePage` placeholders backed by in-memory scaffold data rather than dedicated Supabase services. Examples include some master-data and support pages such as departments, assets, documents, helpdesk, and settings.
- Project/task master pages render placeholder UI, while timesheet project/task dropdowns use Supabase service queries.
- Student self-registration is not implemented as an open public flow in the inspected code.
- The dashboard aggregate service reads from Supabase, but row visibility depends on active RLS policies and the signed-in user's role.
- File storage is not implemented through Supabase Storage.
- Email delivery for invitations is not implemented; invitation records and test links exist in the UI.

## Production Improvements Needed

- Replace remaining placeholder pages with dedicated Supabase services and CRUD forms.
- Add Supabase Storage for documents, certificates, assets, and profile files.
- Add production email delivery for invitations and notifications.
- Add formal automated tests for RBAC, lifecycle redirects, RLS-sensitive workflows, and payroll calculations.
- Add CI checks for build, lint, schema drift, and seed idempotency.
- Add monitoring for Supabase errors and frontend runtime exceptions.
