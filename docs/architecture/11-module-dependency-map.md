# Module Dependency Map

AntOS modules are organized as a modular frontend with shared identity, RBAC, workflow, and data services.

```mermaid
flowchart TD
  A[Auth/RBAC] --> B[Profiles / Roles / Permissions]
  B --> C[Employees / Students / Corporate Partners]
  C --> D[Attendance]
  C --> E[Leave]
  D --> F[Payroll]
  E --> D
  E --> F
  C --> G[Projects / Tasks]
  G --> H[Timesheets]
  H --> I[Utilization]
  F --> J[Finance]
  H --> J
  K[Invoices] --> J
  L[Expenses] --> J
  J --> M[Dashboard]
  D --> M
  E --> M
  H --> M
  G --> M
  B --> N[Notifications / Audit Logs]
  D --> N
  E --> N
  F --> N
  H --> N
  J --> N
```

## Dependency Notes

- Auth/RBAC is the gate for every protected module.
- Profiles connect Supabase Auth users to employee, student, or corporate partner records.
- Attendance feeds Payroll through working day status and unregularized absences.
- Leave updates Attendance when approved and feeds Payroll through unpaid leave/LOP.
- Payroll feeds Finance through payroll cost.
- Projects and Tasks provide context for Timesheets.
- Timesheets feed Utilization and Project Profitability.
- Invoices and Expenses feed Finance summaries and profitability.
- Finance and operational modules feed Dashboard KPI aggregates.
- Notifications and Audit Logs are cross-cutting governance modules.
- Remaining placeholder pages still use shared in-memory scaffolding until dedicated Supabase services are added.
