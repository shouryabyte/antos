# Presentation Summary

## 10-Line Architecture Explanation

1. AntOS is a React + Vite single-page ERP application.
2. Supabase provides Auth, PostgreSQL, and Row Level Security.
3. The frontend uses `AuthProvider` to restore sessions and load profile, role, and permissions.
4. `ProtectedRoute` handles authentication and account lifecycle redirects.
5. `AuthorizedRoute` enforces route-level permission checks.
6. Feature pages call a services layer for Supabase reads and writes.
7. RLS policies protect table access at the database level.
8. Attendance, Leave, Payroll, Timesheets, Finance, Notifications, Onboarding, and Dashboard aggregates are Supabase-backed.
9. Seed scripts create demo users, RBAC records, profiles, and sample ERP data.
10. Remaining placeholder pages use non-persistent in-memory data until they receive dedicated Supabase services.

## Why This Is Not Microservices

AntOS does not have independent backend services, service discovery, service-specific deployments, or inter-service messaging. It is a modular React frontend connected to Supabase Backend-as-a-Service.

## Why Supabase Was Used

Supabase gives AntOS a production-ready foundation for authentication, relational storage, joins, RLS, seedable demo users, and secure browser-based access through the anon key.

## How RBAC Works

Users authenticate through Supabase Auth. Their `profiles` row points to a `roles` row. Permissions are loaded through `role_permissions` and `permissions`. The frontend uses those permissions for route access, sidebar filtering, and action visibility.

## How Approvals Work

Workflow records start in a pending state. The assigned approver role updates the record to approved, rejected, processed, or paid. Approval actions may update a target business table, create a notification, and write an audit log when helper functions are available.

## How Data Moves

Browser actions call React page handlers. Page handlers call service functions. Services call Supabase tables with the current user session. Supabase evaluates RLS before returning or changing rows.

## How RLS Protects Data

RLS policies in `supabase/schema.sql` scope access by role, profile mapping, employee ID, student ID, partner ID, and workflow ownership. The frontend cannot bypass RLS because it only uses the anon key.

## Automations

Current automation behavior is split between Supabase-backed workflow logic and legacy in-memory helpers. Supabase-backed logic includes attendance status calculation, leave-to-attendance sync, payroll LOP calculation, invoice overdue updates, dashboard pending counts, notifications, and audit logging where implemented.

## Production Improvements

Complete dedicated Supabase services for remaining placeholder pages, add email delivery, add file storage, strengthen automated test coverage, add CI/CD checks, and add operational monitoring.
