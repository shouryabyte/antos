export type RoleName =
  | "Super Admin"
  | "HR Manager"
  | "Project Manager"
  | "Mentor"
  | "Finance Manager"
  | "Employee"
  | "Intern"
  | "Student"
  | "Corporate Partner";

export type Permission =
  | "dashboard.read"
  | "employee.read"
  | "employee.create"
  | "employee.update"
  | "employee.delete"
  | "intern.read"
  | "department.read"
  | "attendance.read_self"
  | "attendance.read_all"
  | "attendance.check_in"
  | "attendance.check_out"
  | "attendance.regularize"
  | "attendance.approve"
  | "leave.read_self"
  | "leave.read_all"
  | "leave.apply"
  | "leave.approve"
  | "payroll.read_self"
  | "payroll.read_all"
  | "payroll.process"
  | "project.read"
  | "project.create"
  | "project.update"
  | "task.read"
  | "task.create"
  | "task.update"
  | "timesheet.read_self"
  | "timesheet.read_all"
  | "timesheet.submit"
  | "timesheet.approve"
  | "student.read"
  | "student.create"
  | "partner.read"
  | "sprint.read"
  | "sprint.create"
  | "mentor.read"
  | "certificate.read"
  | "readiness.read"
  | "readiness.update"
  | "deployment.read"
  | "feedback.read"
  | "ppo.read"
  | "finance.read"
  | "finance.manage"
  | "invoice.read"
  | "invoice.manage"
  | "expense.read"
  | "expense.manage"
  | "asset.manage"
  | "document.read"
  | "document.manage"
  | "ticket.create"
  | "ticket.manage"
  | "role.manage"
  | "settings.manage"
  | "invitation.read"
  | "invitation.create"
  | "invitation.revoke"
  | "invitation.resend"
  | "audit.read"
  | "account.manage"
  | "role_change.request"
  | "role_change.approve"
  | "onboarding.manage";

export const allPermissions: Permission[] = [
  "dashboard.read",
  "employee.read","employee.create","employee.update","employee.delete","intern.read","department.read",
  "attendance.read_self","attendance.read_all","attendance.check_in","attendance.check_out","attendance.regularize","attendance.approve",
  "leave.read_self","leave.read_all","leave.apply","leave.approve",
  "payroll.read_self","payroll.read_all","payroll.process",
  "project.read","project.create","project.update",
  "task.read","task.create","task.update",
  "timesheet.read_self","timesheet.read_all","timesheet.submit","timesheet.approve",
  "student.read","student.create",
  "partner.read",
  "sprint.read","sprint.create","mentor.read","certificate.read",
  "readiness.read","readiness.update","deployment.read","feedback.read","ppo.read",
  "finance.read","finance.manage","invoice.read","invoice.manage","expense.read","expense.manage",
  "asset.manage","document.read","document.manage","ticket.create","ticket.manage","role.manage","settings.manage",
  "invitation.read","invitation.create","invitation.revoke","invitation.resend","audit.read","account.manage","role_change.request","role_change.approve","onboarding.manage"
];

export const rolePermissions: Record<RoleName, Permission[]> = {
  "Super Admin": allPermissions,
  "HR Manager": ["dashboard.read","employee.read","employee.create","employee.update","employee.delete","intern.read","department.read","attendance.read_all","attendance.approve","leave.read_all","leave.approve","payroll.read_all","payroll.process","asset.manage","document.read","document.manage","ticket.create","ticket.manage","invitation.read","invitation.create","invitation.revoke","invitation.resend","account.manage","role_change.request","onboarding.manage"],
  "Project Manager": ["dashboard.read","project.read","project.create","project.update","task.read","task.create","task.update","timesheet.read_all","timesheet.approve","deployment.read","feedback.read","ticket.create"],
  Mentor: ["dashboard.read","student.read","student.create","sprint.read","sprint.create","readiness.read","readiness.update","mentor.read","certificate.read","ppo.read","task.read","task.create","task.update","ticket.create"],
  "Finance Manager": ["dashboard.read","finance.read","finance.manage","invoice.read","invoice.manage","expense.read","expense.manage","payroll.read_all","payroll.process","ticket.create"],
  Employee: ["dashboard.read","attendance.read_self","attendance.check_in","attendance.check_out","attendance.regularize","leave.read_self","leave.apply","payroll.read_self","task.read","timesheet.read_self","timesheet.submit","document.read","ticket.create"],
  Intern: ["dashboard.read","attendance.read_self","attendance.check_in","attendance.check_out","attendance.regularize","leave.read_self","leave.apply","payroll.read_self","task.read","timesheet.read_self","timesheet.submit","deployment.read","readiness.read","ticket.create"],
  Student: ["dashboard.read","student.read","sprint.read","readiness.read","certificate.read","ppo.read","ticket.create"],
  "Corporate Partner": ["dashboard.read","partner.read","deployment.read","project.read","feedback.read","invoice.read","ticket.create"]
};

export const routePermissions: Record<string, Permission[]> = {
  "/dashboard": ["dashboard.read"],
  "/employees": ["employee.read"],
  "/interns": ["intern.read", "deployment.read"],
  "/students": ["student.read"],
  "/departments": ["department.read"],
  "/attendance": ["attendance.read_self", "attendance.read_all"],
  "/leave": ["leave.read_self", "leave.read_all"],
  "/payroll": ["payroll.read_self", "payroll.read_all"],
  "/onboarding": ["employee.read"],
  "/exit-management": ["employee.read"],
  "/projects": ["project.read"],
  "/tasks": ["task.read"],
  "/timesheets": ["timesheet.read_self", "timesheet.read_all"],
  "/deliverables": ["project.read", "task.read"],
  "/career-sprints": ["sprint.read"],
  "/mentors": ["mentor.read"],
  "/readiness-scores": ["readiness.read"],
  "/certificates": ["certificate.read"],
  "/corporate-partners": ["partner.read"],
  "/intern-deployment": ["deployment.read"],
  "/client-feedback": ["feedback.read"],
  "/ppo-tracker": ["ppo.read"],
  "/finance/invoices": ["invoice.read", "finance.read"],
  "/finance/expenses": ["expense.read", "finance.read"],
  "/finance/payroll-cost": ["payroll.read_all", "finance.read"],
  "/finance/profitability": ["finance.read"],
  "/assets": ["asset.manage"],
  "/documents": ["document.read", "document.manage"],
  "/helpdesk": ["ticket.create", "ticket.manage"],
  "/roles-permissions": ["role.manage"],
  "/settings": ["settings.manage"]
  ,"/admin/invitations": ["invitation.read"]
  ,"/admin/role-change-requests": ["role_change.request", "role_change.approve"]
  ,"/admin/audit-logs": ["audit.read"]
};

export const roleSidebarPaths: Record<RoleName, string[]> = {
  "Super Admin": ["*"],
  "HR Manager": ["/dashboard","/employees","/interns","/attendance","/leave","/payroll","/onboarding","/exit-management","/assets","/documents","/helpdesk","/admin/invitations","/admin/role-change-requests"],
  "Project Manager": ["/dashboard","/projects","/tasks","/timesheets","/deliverables","/intern-deployment","/client-feedback"],
  Mentor: ["/dashboard","/students","/career-sprints","/readiness-scores","/mentors","/certificates","/ppo-tracker"],
  "Finance Manager": ["/dashboard","/payroll","/finance/invoices","/finance/expenses","/finance/payroll-cost","/finance/profitability"],
  Employee: ["/dashboard","/attendance","/leave","/tasks","/timesheets","/payroll","/helpdesk","/documents"],
  Intern: ["/dashboard","/attendance","/leave","/tasks","/timesheets","/payroll","/intern-deployment","/readiness-scores","/helpdesk"],
  Student: ["/dashboard","/career-sprints","/readiness-scores","/certificates","/ppo-tracker"],
  "Corporate Partner": ["/dashboard","/intern-deployment","/projects","/client-feedback","/finance/invoices"]
};

export type DemoUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: RoleName;
  employeeId?: string;
  studentId?: string;
  partnerId?: string;
};

export const demoUsers: DemoUser[] = [
  { id:"u-super", email:"superadmin@antos.dev", password:"password", name:"Nikhil Rao", role:"Super Admin", employeeId:"e1" },
  { id:"u-hr", email:"hr@antos.dev", password:"password", name:"Priya Nair", role:"HR Manager", employeeId:"e2" },
  { id:"u-pm", email:"pm@antos.dev", password:"password", name:"Riya Sharma", role:"Project Manager", employeeId:"e2" },
  { id:"u-mentor", email:"mentor@antos.dev", password:"password", name:"Kabir Sethi", role:"Mentor", employeeId:"e3" },
  { id:"u-finance", email:"finance@antos.dev", password:"password", name:"Devansh Jain", role:"Finance Manager", employeeId:"e5" },
  { id:"u-employee", email:"employee@antos.dev", password:"password", name:"Aarav Mehta", role:"Employee", employeeId:"e1" },
  { id:"u-intern", email:"intern@antos.dev", password:"password", name:"Rahul Nair", role:"Intern", studentId:"s2", employeeId:"e1" },
  { id:"u-student", email:"student@antos.dev", password:"password", name:"Ishita Verma", role:"Student", studentId:"s1" },
  { id:"u-partner", email:"partner@antos.dev", password:"password", name:"Neha Bansal", role:"Corporate Partner", partnerId:"cp1" }
];
