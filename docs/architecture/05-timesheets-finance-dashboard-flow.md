# Timesheets To Finance To Dashboard Flow

Timesheets, Finance, and Dashboard aggregates are Supabase-backed in the current codebase. Project/task master pages still use shared placeholder UI, but the timesheet submission and finance calculations use Supabase services.

## Timesheet Flow

```mermaid
flowchart TD
  A[Employee or Intern Logs In] --> B[profile.employee_id Loaded]
  B --> C[Open /timesheets]
  C --> D[Select Project and Task]
  D --> E[Submit Hours]
  E --> F[timesheets Pending]
  F --> G[Project Manager / Super Admin Review]
  G --> H{Decision}
  H -- Approved --> I[approval_status Approved]
  H -- Rejected --> J[approval_status Rejected]
  I --> K[Approved Billable Hours]
  K --> L[Utilization Calculation]
  J --> M[Rejected Hours Excluded]
```

## Finance And Dashboard Flow

```mermaid
flowchart TD
  A[Finance Manager Creates Invoice] --> B[invoices Table]
  C[Finance Manager Creates Expense] --> D[expenses Table]
  B --> E[Mark Draft / Sent / Paid / Overdue]
  D --> F[Approve / Reject / Paid]
  G[payroll Table] --> H[Finance Summary]
  I[timesheets Approved Rows] --> H
  E --> H
  F --> H
  H --> J[Project Profitability]
  H --> K[Sprint Profitability]
  J --> L[Dashboard KPI Aggregates]
  K --> L
  M[Attendance / Leave / Role Changes] --> L
```

## Metrics

- Utilization: Approved Billable Hours / Total Approved Hours * 100.
- Monthly revenue: paid invoice revenue in the selected period.
- Payroll cost: payroll net salary totals.
- Operational expenses: approved/paid expense values where applicable.
- Project profitability: invoices plus approved timesheet labor cost and expenses where related data exists.
- Sprint profitability: sprint invoice/expense calculations where related data exists.
- Dashboard pending approvals: leave, attendance regularization, timesheets, expenses, invoices, role changes, invitations, and at-risk projects.

## Code References

- `src/services/timesheetService.ts`
- `src/services/financeService.ts`
- `src/services/dashboardService.ts`
- `src/features/timesheets/TimesheetsPage.tsx`
- `src/features/finance/FinancePage.tsx`
- `src/features/dashboard/DashboardPage.tsx`
