# AntOS Architecture Documentation

This folder contains presentation-ready architecture documentation for the current AntOS codebase.

AntOS is a modular React SPA connected to Supabase Backend-as-a-Service. It is not a microservices system.

## Documents

- [System Architecture](01-system-architecture.md)
- [Auth/RBAC/Lifecycle Flow](02-auth-rbac-lifecycle-flow.md)
- [Onboarding and Invitation Flow](03-onboarding-invitation-flow.md)
- [Attendance to Leave to Payroll Flow](04-attendance-leave-payroll-flow.md)
- [Timesheets to Finance to Dashboard Flow](05-timesheets-finance-dashboard-flow.md)
- [Database ER Diagram](06-database-er-diagram.md)
- [Deployment and Environment Flow](07-deployment-environment-flow.md)
- [Migration Status](08-migration-status.md)
- [Presentation Summary](09-presentation-summary.md)
- [Approval Workflow Architecture](10-approval-workflow-architecture.md)
- [Module Dependency Map](11-module-dependency-map.md)
- [Draw.io Diagram](antos-architecture.drawio)

## Source Of Truth

These documents are based on:

- `ANTOS_REQUIREMENTS.md`
- `src/auth/*`
- `src/app/routes.tsx`
- `src/services/*`
- `src/features/*`
- `src/lib/supabase.ts`
- `src/lib/onboardingAutomation.ts`
- `supabase/schema.sql`
- `scripts/seed-supabase.mjs`

The migrated modules listed here are only marked migrated when the current code contains a Supabase-backed service or direct Supabase integration.
