You already generated the AntOS ERP frontend. Now upgrade the existing app from a static/mock ERP dashboard into a working authentication, authorization, RBAC, and attendance-enabled ERP MVP.

Do not redesign the whole UI. Keep the current AntOS layout, sidebar, dashboard style, cards, charts, and pages. Extend the existing app carefully.

Main objective:
Add real authentication flow, employee login, role-based authorization, protected routes, attendance working flow, manager approvals, and automated business logic.

Tech stack:
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- Supabase Auth
- Supabase PostgreSQL-ready structure
- localStorage fallback only for demo mode
- Zustand or React Context for auth/session/role state

Important:
Do not break the current app.
Do not remove existing pages.
Do not rewrite unrelated components.
Do not create a generic login screen only.
Build a complete ERP access flow.

Required auth features:

1. Login page
Create a professional /login page with:
- AntOS branding
- Email/password login
- Demo role login buttons:
  - Super Admin
  - HR Manager
  - Project Manager
  - Mentor
  - Finance Manager
  - Employee
  - Intern
  - Student
  - Corporate Partner
- Remember session
- Error state
- Loading state

2. Authentication provider
Create:
src/auth/AuthProvider.tsx
src/auth/useAuth.ts
src/auth/ProtectedRoute.tsx
src/auth/RoleGuard.tsx
src/auth/permissions.ts

Auth state must contain:
- user
- profile
- role
- permissions
- employeeId/studentId/partnerId mapping
- isAuthenticated
- isLoading
- login()
- logout()
- hasPermission()
- hasRole()

3. Protected routes
All ERP routes must be protected.
Unauthenticated users should be redirected to /login.
Authenticated users should go to /dashboard.

Routes:
- /login public
- /dashboard protected
- all ERP pages protected

4. Role-based sidebar
Sidebar menu must change based on role.

Super Admin:
Can access everything.

HR Manager:
Dashboard, Employees, Interns, Attendance, Leave, Payroll, Onboarding, Exit Management, Assets, Documents, Helpdesk.

Project Manager:
Dashboard, Projects, Tasks, Timesheets, Deliverables, Intern Deployment, Client Feedback.

Mentor:
Dashboard, Students, Career Sprints, Readiness Scores, Mentors, Certificates, PPO Tracker.

Finance Manager:
Dashboard, Invoices, Expenses, Payroll Cost, Profitability, Finance reports.

Employee:
My Dashboard, My Attendance, My Leave, My Tasks, My Timesheets, My Payslip, Helpdesk, Documents.

Intern:
My Dashboard, My Attendance, My Tasks, My Timesheets, My Deployment, Readiness Score, Helpdesk.

Student:
My Dashboard, Career Sprints, My Submissions, Readiness Score, Certificates, PPO Status.

Corporate Partner:
Partner Dashboard, Assigned Interns, Project Progress, Client Feedback, Invoices.

5. RBAC permissions
Create permission constants.

Permissions should include:
- employee.read
- employee.create
- employee.update
- employee.delete
- attendance.read_all
- attendance.read_self
- attendance.check_in
- attendance.check_out
- attendance.regularize
- attendance.approve
- leave.read_all
- leave.read_self
- leave.apply
- leave.approve
- payroll.read_all
- payroll.read_self
- payroll.process
- project.read
- project.create
- project.update
- task.read
- task.create
- task.update
- timesheet.read_all
- timesheet.read_self
- timesheet.submit
- timesheet.approve
- student.read
- student.create
- sprint.read
- sprint.create
- readiness.read
- readiness.update
- finance.read
- finance.manage
- invoice.read
- invoice.manage
- asset.manage
- document.manage
- ticket.create
- ticket.manage
- role.manage

Use permissions to:
- Hide unauthorized sidebar items
- Hide unauthorized buttons
- Block unauthorized routes
- Block unauthorized CRUD actions

6. Employee login workflow
Every employee/intern/student/corporate partner should login and see their own dashboard.

Employee should see:
- Today attendance status
- Check-in/check-out button
- My tasks
- My timesheets
- My leave balance
- My payroll summary
- Pending approvals relevant to them
- Helpdesk tickets

HR Manager should see:
- All employee attendance
- All leave requests
- Payroll
- Employee CRUD
- Attendance regularization approvals

Project Manager should see:
- Assigned projects
- Team tasks
- Timesheet approvals
- Intern deployment progress

Mentor should see:
- Students
- Career sprints
- Readiness scores
- Mentor feedback
- PPO recommendations

Finance Manager should see:
- Invoices
- Expenses
- Payroll cost
- Profitability

7. Attendance working flow
Create a complete working attendance module.

Employee attendance actions:
- Check in
- Check out
- View today status
- View monthly attendance
- Request regularization

Attendance record fields:
- id
- employeeId
- date
- checkIn
- checkOut
- workMode: Office | Remote | Hybrid
- status: Not Checked In | Present | Late | Half Day | Absent | Leave
- workingHours
- regularizationStatus: None | Pending | Approved | Rejected
- regularizationReason
- approvedBy
- remarks

Attendance logic:
- If employee has not checked in today, show Check In button.
- After check-in, show Check Out button.
- After check-out, calculate working hours.
- If check-in time is after 10:15 AM, mark Late.
- If working hours are less than 4, mark Half Day.
- If working hours are 4 to 8, mark Present with short hours warning.
- If working hours are 8 or more, mark Present.
- If no check-in by end of day, mark Absent.
- If approved leave exists for that date, mark Leave.
- If status is Absent/Half Day/Late, employee can raise regularization request.
- HR Manager can approve/reject regularization.
- Approved regularization updates status.

8. Attendance manager/HR workflow
HR Manager page should include:
- Today attendance overview
- Present count
- Absent count
- Late count
- Half-day count
- Remote count
- Pending regularization count
- Attendance table
- Approve/reject regularization
- Filter by department/date/status
- Export-ready structure

9. Leave workflow
Employee can:
- Apply leave
- Select leave type
- Select date range
- Add reason
- See leave balance
- Track approval status

Manager/HR can:
- View leave requests
- Approve/reject leave
- Add remarks

Leave logic:
- Approved leave reduces leave balance.
- Rejected leave does not reduce leave balance.
- Unpaid leave creates LOP for payroll.
- Leave dates should mark attendance as Leave.

10. Payroll connection
Payroll should automatically use:
- basic salary
- allowances
- deductions
- unpaid leave count
- LOP
- net salary

Formula:
Net Salary = Basic Salary + Allowances - Deductions - LOP

Only HR Manager, Finance Manager, and Super Admin can process payroll.
Employees can only view their own payslip.

11. Timesheet workflow
Employee/intern can:
- Select project
- Select task
- Enter hours
- Add description
- Submit timesheet

Project Manager can:
- Approve/reject timesheets
- View project-wise hours
- View billable/non-billable split

Timesheet logic:
Utilization % = Billable Hours / Total Working Hours * 100

12. Automated tasks
Implement automation utilities in:
src/lib/automation.ts

Automation should run:
- On app load
- On dashboard load
- When HR opens attendance page
- When date changes

Automated tasks required:
A. Auto mark absent
If an active employee has no check-in for a past working day and no approved leave, create attendance record as Absent.

B. Auto mark leave
If approved leave exists for an employee/date, attendance status should become Leave.

C. Auto calculate attendance status
After check-out, calculate working hours and status automatically.

D. Auto calculate project health
If deadline crossed and progress < 80, health = Red.
If progress between 50 and 80, health = Yellow.
If progress > 80, health = Green.

E. Auto calculate readiness score
Readiness Score =
Task Completion 30%
+ Mentor Feedback 25%
+ Client Feedback 20%
+ Attendance 10%
+ Communication 10%
+ Timesheet Discipline 5%

F. Auto PPO recommendation
If readiness score >= 85 and client feedback >= 80, mark PPO Ready.
If readiness score 70-84, mark Internship Ready.
If below 70, mark Needs Training.

G. Auto pending approvals
Dashboard should automatically count:
- Pending leave approvals
- Pending regularizations
- Pending timesheets
- Pending invoices
- At-risk projects

H. Auto payroll LOP
Approved unpaid leaves and unregularized absences should contribute to LOP.

13. Notifications
Add notification system.
Notification examples:
- Leave request submitted
- Leave approved/rejected
- Regularization request submitted
- Timesheet pending approval
- Payroll processed
- Project at risk
- Readiness score updated
- PPO recommended

Show notification bell count in header.

14. Supabase-ready database schema
Create a file:
supabase/schema.sql

Include SQL tables for:
- profiles
- roles
- permissions
- role_permissions
- employees
- students
- corporate_partners
- attendance
- leave_requests
- payroll
- projects
- tasks
- timesheets
- career_sprints
- intern_deployments
- readiness_scores
- invoices
- expenses
- assets
- documents
- tickets
- notifications

Add basic indexes.
Add comments for RLS policies.
Do not require Supabase to run locally, but make the project ready.

15. Demo mode
Because the project must run immediately, create demo login users.

Demo accounts:
superadmin@antos.dev / password
hr@antos.dev / password
pm@antos.dev / password
mentor@antos.dev / password
finance@antos.dev / password
employee@antos.dev / password
intern@antos.dev / password
student@antos.dev / password
partner@antos.dev / password

For demo mode, clicking role buttons should log in without backend.

16. Real Supabase mode
Create:
src/lib/supabase.ts

Use:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

If env variables are missing, app should automatically use demo mode.
If env variables exist, use Supabase Auth.

17. UI requirements
Keep existing AntOS visual style.
Add login page in same brand style.
Add role badge in header.
Add current logged-in user's name.
Add logout button.
Add “View as role” only for Super Admin demo.
Add permission-based disabled states where useful.

18. Employee self-service dashboard
Create /my-dashboard or make dashboard role-aware.

For Employee:
Show:
- Today attendance card
- Check-in/check-out
- Leave balance
- My tasks
- Pending timesheets
- Payslip summary
- Tickets

For Intern:
Show:
- Attendance
- Assigned project
- Tasks
- Timesheet compliance
- Readiness score
- PPO probability

For Student:
Show:
- Sprint status
- Readiness score
- Certificates
- PPO status

For Corporate Partner:
Show:
- Assigned interns
- Project progress
- Client feedback forms
- Invoices

19. Form validations
Use React Hook Form + Zod where forms exist.
Validate:
- login email/password
- leave dates
- attendance regularization reason
- timesheet hours
- employee creation
- task creation

20. Final quality requirements
- No TypeScript errors
- No broken imports
- No blank routes
- No console errors
- App should run with npm run dev
- Existing dashboard should still work
- Login/logout should work
- Role-based sidebar should work
- Protected routes should work
- Employee check-in/check-out should work
- HR attendance approval should work
- Leave request and approval should work
- Timesheet submission and approval should work
- Automation should update KPI cards
- README should be updated

21. README update
Update README with:
- Auth explanation
- Demo credentials
- Role-based access explanation
- Attendance workflow
- Leave workflow
- Automation logic
- Supabase integration plan
- How to run

Important instruction:
Do not rebuild the whole app from scratch. Upgrade the current AntOS app carefully by adding auth, RBAC, attendance, leave, timesheet, automation, and protected workflows.