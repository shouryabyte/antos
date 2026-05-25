# Attendance To Leave To Payroll Flow

Attendance, Leave, and Payroll are Supabase-backed workflows. Each feature has a service under `src/services` and a React page under `src/features`.

## Attendance Flow

Employees and interns use their `profile.employee_id` mapping to read and write their own attendance rows. HR and Super Admin can review broader attendance data according to permissions and RLS.

```mermaid
flowchart TD
  A[Employee Logs In] --> B[profile.employee_id Loaded]
  B --> C[Open /attendance]
  C --> D[Check In]
  D --> E[attendance Insert]
  E --> F[Check Out]
  F --> G[attendance Update]
  G --> H[Working Hours Calculation]
  H --> I[Status Calculation]
  I --> J{Needs Regularization?}
  J -- Yes --> K[Regularization Request Pending]
  K --> L[HR Manager / Super Admin Review]
  L --> M{Approve or Reject}
  M -- Approve --> N[attendance Corrected]
  M -- Reject --> O[Regularization Rejected]
  J -- No --> P[Attendance Final For Day]
```

## Leave And Payroll Flow

```mermaid
flowchart TD
  A[Employee Applies Leave] --> B[leave_requests Pending]
  B --> C[HR Manager / Super Admin Review]
  C --> D{Decision}
  D -- Rejected --> E[leave_requests Rejected]
  D -- Approved --> F[leave_requests Approved]
  F --> G[Approved Leave Syncs To attendance]
  G --> H[attendance Status = Leave]
  F --> I{Leave Type}
  I -- Paid Leave --> J[Leave Balance Reduced]
  I -- Unpaid Leave --> K[LOP Days Counted]
  K --> L[Payroll Generation]
  J --> L
  L --> M[payroll Rows Upserted]
  M --> N[Payroll Processed]
  N --> O[Payroll Paid]
  O --> P[Employee Payslip]
```

## Business Rules Reflected In Code

- Check-in inserts an attendance row for an employee/date.
- Check-out updates the same row and calculates working hours.
- Attendance status is calculated from check-in/check-out timing.
- Regularization stores corrected times, reason, approval status, approver, and remarks.
- Leave starts as `Pending`.
- Approved leave calls leave-to-attendance sync.
- Unpaid approved leave contributes to LOP.
- Payroll generation reads employees, leave/LOP data, and payroll records from Supabase.
- Net salary uses: Basic Salary + Allowances - Deductions - LOP.
- Employees can view only their own payroll through self-scoped service calls and RLS.

## Code References

- `src/services/attendanceService.ts`
- `src/services/leaveService.ts`
- `src/services/payrollService.ts`
- `src/features/attendance/AttendancePage.tsx`
- `src/features/leave/LeavePage.tsx`
- `src/features/payroll/PayrollPage.tsx`
- `supabase/schema.sql`
