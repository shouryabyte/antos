import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import WebSocket from "ws";

loadSeedEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.seed.example to .env.seed and fill both values.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket }
});

const password = "Antos@12345";

const ids = {
  employees: {
    superadmin: "10000000-0000-4000-8000-000000000001",
    hr: "10000000-0000-4000-8000-000000000002",
    pm: "10000000-0000-4000-8000-000000000003",
    mentor: "10000000-0000-4000-8000-000000000004",
    finance: "10000000-0000-4000-8000-000000000005",
    employee: "10000000-0000-4000-8000-000000000006",
    intern: "10000000-0000-4000-8000-000000000007"
  },
  students: {
    student: "20000000-0000-4000-8000-000000000001",
    intern: "20000000-0000-4000-8000-000000000002",
    extra: "20000000-0000-4000-8000-000000000003"
  },
  partners: {
    scalegrid: "30000000-0000-4000-8000-000000000001",
    insightloop: "30000000-0000-4000-8000-000000000002"
  },
  departments: {
    leadership: "40000000-0000-4000-8000-000000000001",
    hr: "40000000-0000-4000-8000-000000000002",
    product: "40000000-0000-4000-8000-000000000003",
    academy: "40000000-0000-4000-8000-000000000004",
    finance: "40000000-0000-4000-8000-000000000005",
    engineering: "40000000-0000-4000-8000-000000000006"
  },
  projects: {
    revops: "50000000-0000-4000-8000-000000000001",
    analytics: "50000000-0000-4000-8000-000000000002"
  },
  tasks: {
    brief: "60000000-0000-4000-8000-000000000001",
    qa: "60000000-0000-4000-8000-000000000002",
    rubric: "60000000-0000-4000-8000-000000000003"
  },
  sprints: {
    revops: "70000000-0000-4000-8000-000000000001",
    ai: "70000000-0000-4000-8000-000000000002"
  },
  readiness: {
    student: "80000000-0000-4000-8000-000000000001",
    intern: "80000000-0000-4000-8000-000000000002"
  }
};

const seedUsers = [
  { key: "superadmin", name: "Aarav Mehta", email: "superadmin@antos.dev", role: "Super Admin", employeeId: ids.employees.superadmin },
  { key: "hr", name: "Priya Sharma", email: "hr@antos.dev", role: "HR Manager", employeeId: ids.employees.hr },
  { key: "pm", name: "Rohan Kapoor", email: "pm@antos.dev", role: "Project Manager", employeeId: ids.employees.pm },
  { key: "mentor", name: "Neha Iyer", email: "mentor@antos.dev", role: "Mentor", employeeId: ids.employees.mentor },
  { key: "finance", name: "Vikram Rao", email: "finance@antos.dev", role: "Finance Manager", employeeId: ids.employees.finance },
  { key: "employee", name: "Karan Malhotra", email: "employee@antos.dev", role: "Employee", employeeId: ids.employees.employee },
  { key: "intern", name: "Ananya Sen", email: "intern@antos.dev", role: "Intern", employeeId: ids.employees.intern, studentId: ids.students.intern },
  { key: "student", name: "Riya Nair", email: "student@antos.dev", role: "Student", studentId: ids.students.student },
  { key: "partner", name: "Arjun Bose", email: "partner@antos.dev", role: "Corporate Partner", corporatePartnerId: ids.partners.scalegrid }
];

const permissions = [
  "dashboard.read",
  "employee.read", "employee.create", "employee.update", "employee.delete",
  "intern.read", "department.read",
  "attendance.read_all", "attendance.read_self", "attendance.check_in", "attendance.check_out", "attendance.regularize", "attendance.approve",
  "leave.read_all", "leave.read_self", "leave.apply", "leave.approve",
  "payroll.read_all", "payroll.read_self", "payroll.process",
  "project.read", "project.create", "project.update",
  "task.read", "task.create", "task.update",
  "timesheet.read_all", "timesheet.read_self", "timesheet.submit", "timesheet.approve",
  "student.read", "student.create",
  "partner.read",
  "sprint.read", "sprint.create",
  "mentor.read", "certificate.read",
  "readiness.read", "readiness.update",
  "deployment.read", "feedback.read", "ppo.read",
  "finance.read", "finance.manage", "invoice.read", "invoice.manage",
  "expense.read", "expense.manage",
  "asset.manage", "document.read", "document.manage", "ticket.create", "ticket.manage", "role.manage", "settings.manage"
];

const rolePermissionMap = {
  "Super Admin": permissions,
  "HR Manager": [
    "dashboard.read",
    "employee.read", "employee.create", "employee.update", "employee.delete",
    "intern.read", "department.read",
    "attendance.read_all", "attendance.approve",
    "leave.read_all", "leave.approve",
    "payroll.read_all", "payroll.process",
    "asset.manage", "document.read", "document.manage", "ticket.create", "ticket.manage"
  ],
  "Project Manager": [
    "dashboard.read",
    "project.read", "project.create", "project.update", "task.read", "task.create", "task.update",
    "timesheet.read_all", "timesheet.approve", "deployment.read", "feedback.read", "ticket.create"
  ],
  Mentor: ["dashboard.read", "student.read", "student.create", "sprint.read", "sprint.create", "readiness.read", "readiness.update", "mentor.read", "certificate.read", "ppo.read", "task.read", "task.create", "task.update", "ticket.create"],
  "Finance Manager": ["dashboard.read", "finance.read", "finance.manage", "invoice.read", "invoice.manage", "expense.read", "expense.manage", "payroll.read_all", "payroll.process", "ticket.create"],
  Employee: ["dashboard.read", "attendance.read_self", "attendance.check_in", "attendance.check_out", "attendance.regularize", "leave.read_self", "leave.apply", "payroll.read_self", "task.read", "timesheet.read_self", "timesheet.submit", "document.read", "ticket.create"],
  Intern: ["dashboard.read", "attendance.read_self", "attendance.check_in", "attendance.check_out", "attendance.regularize", "leave.read_self", "leave.apply", "payroll.read_self", "task.read", "timesheet.read_self", "timesheet.submit", "deployment.read", "readiness.read", "ticket.create"],
  Student: ["dashboard.read", "student.read", "sprint.read", "readiness.read", "certificate.read", "ppo.read", "ticket.create"],
  "Corporate Partner": ["dashboard.read", "partner.read", "deployment.read", "project.read", "feedback.read", "invoice.read", "ticket.create"]
};

async function main() {
  console.log("Seeding AntOS Supabase backend...");

  const rolesByName = await seedRoles();
  const permissionsByCode = await seedPermissions();
  await seedRolePermissions(rolesByName, permissionsByCode);

  await upsert("departments", departments(), "id");
  await upsert("employees", employees(), "id");
  await upsert("students", students(), "id");
  await upsert("corporate_partners", corporatePartners(), "id");
  await upsert("projects", projects(), "id");
  await upsert("tasks", tasks(), "id");
  await upsert("attendance", attendance(), "employee_id,date");
  await upsert("leave_requests", leaveRequests(), "id");
  await upsert("payroll", payroll(), "employee_id,month");
  await upsert("timesheets", timesheets(), "id");
  await upsert("career_sprints", careerSprints(), "id");
  await upsert("sprint_enrollments", sprintEnrollments(), "sprint_id,student_id");
  await upsert("intern_deployments", internDeployments(), "id");
  await upsert("readiness_scores", readinessScores(), "id");
  await upsert("ppo_records", ppoRecords(), "id");
  await upsert("invoices", invoices(), "invoice_number");
  await upsert("expenses", expenses(), "id");
  await upsert("assets", assets(), "asset_code");
  await upsert("documents", documents(), "id");
  await upsert("tickets", tickets(), "ticket_number");

  const usersByEmail = {};
  for (const user of seedUsers) {
    usersByEmail[user.email] = await ensureAuthUser(user);
  }

  await upsert("profiles", profiles(rolesByName, usersByEmail), "id");
  await upsert("notifications", notifications(usersByEmail), "id");

  console.log("Seed complete.");
  console.log("Login password for seeded users: Antos@12345");
}

async function seedRoles() {
  await upsert("roles", Object.keys(rolePermissionMap).map((name) => ({ name })), "name");
  const { data, error } = await supabase.from("roles").select("id,name");
  if (error) throw error;
  return Object.fromEntries(data.map((role) => [role.name, role.id]));
}

async function seedPermissions() {
  await upsert("permissions", permissions.map((code) => ({ code })), "code");
  const { data, error } = await supabase.from("permissions").select("id,code");
  if (error) throw error;
  return Object.fromEntries(data.map((permission) => [permission.code, permission.id]));
}

async function seedRolePermissions(rolesByName, permissionsByCode) {
  const rows = Object.entries(rolePermissionMap).flatMap(([roleName, codes]) =>
    codes.map((code) => ({
      role_id: rolesByName[roleName],
      permission_id: permissionsByCode[code]
    }))
  );
  await upsert("role_permissions", rows, "role_id,permission_id");
}

async function ensureAuthUser(user) {
  const existing = await findAuthUserByEmail(user.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      user_metadata: { full_name: user.name, role: user.role }
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.name, role: user.role }
  });
  if (error) throw error;
  return data.user;
}

async function findAuthUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return [];
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select();
  if (error) {
    console.error(`Failed seeding ${table}:`, error.message);
    throw error;
  }
  return data;
}

function departments() {
  return [
    { id: ids.departments.leadership, name: "Leadership", head: "Aarav Mehta", employee_count: 1, budget: 1200000, status: "Active" },
    { id: ids.departments.hr, name: "HR", head: "Priya Sharma", employee_count: 8, budget: 900000, status: "Active" },
    { id: ids.departments.product, name: "Product", head: "Rohan Kapoor", employee_count: 14, budget: 1600000, status: "Active" },
    { id: ids.departments.academy, name: "Academy", head: "Neha Iyer", employee_count: 20, budget: 1400000, status: "Active" },
    { id: ids.departments.finance, name: "Finance", head: "Vikram Rao", employee_count: 5, budget: 800000, status: "Active" },
    { id: ids.departments.engineering, name: "Engineering", head: "Karan Malhotra", employee_count: 18, budget: 2200000, status: "Active" }
  ];
}

function employees() {
  return [
    employee(ids.employees.superadmin, "ABX-001", "Aarav Mehta", "superadmin@antos.dev", "Leadership", ids.departments.leadership, "Founder", null, "Full-time", 220000, "Bengaluru", ["Strategy", "Operations"]),
    employee(ids.employees.hr, "ABX-014", "Priya Sharma", "hr@antos.dev", "HR", ids.departments.hr, "HR Manager", ids.employees.superadmin, "Full-time", 150000, "Bengaluru", ["HRMS", "Payroll"]),
    employee(ids.employees.pm, "ABX-027", "Rohan Kapoor", "pm@antos.dev", "Product", ids.departments.product, "Project Manager", ids.employees.superadmin, "Full-time", 175000, "Remote", ["Delivery", "SaaS"]),
    employee(ids.employees.mentor, "ABX-032", "Neha Iyer", "mentor@antos.dev", "Academy", ids.departments.academy, "Sprint Mentor", ids.employees.superadmin, "Mentor", 110000, "Mumbai", ["Mentoring", "Readiness"]),
    employee(ids.employees.finance, "ABX-046", "Vikram Rao", "finance@antos.dev", "Finance", ids.departments.finance, "Finance Manager", ids.employees.superadmin, "Full-time", 140000, "Delhi", ["Invoicing", "Payroll"]),
    employee(ids.employees.employee, "ABX-061", "Karan Malhotra", "employee@antos.dev", "Engineering", ids.departments.engineering, "Frontend Engineer", ids.employees.pm, "Full-time", 125000, "Hyderabad", ["React", "TypeScript"]),
    employee(ids.employees.intern, "ABX-088", "Ananya Sen", "intern@antos.dev", "Engineering", ids.departments.engineering, "Software Intern", ids.employees.pm, "Intern", 35000, "Remote", ["React", "SQL"])
  ];
}

function employee(id, employee_code, name, email, department, department_id, designation, manager_id, employment_type, salary, work_location, skills) {
  return {
    id,
    employee_code,
    name,
    email,
    phone: "+91 90000 10000",
    department,
    department_id,
    designation,
    manager: manager_id ? employeesName(manager_id) : null,
    manager_id,
    joining_date: "2024-01-15",
    employment_type,
    salary,
    work_location,
    status: "Active",
    avatar: initials(name),
    skills,
    documents: ["Offer Letter", "NDA"]
  };
}

function students() {
  return [
    { id: ids.students.student, student_code: "STU-1001", name: "Riya Nair", email: "student@antos.dev", phone: "+91 90000 20001", college: "Christ University", degree: "BBA", graduation_year: 2026, skills: ["GTM", "Excel", "Research"], career_interest: "RevOps", sprint_history: ["Revenue Operations Sprint"], readiness_score: 88, portfolio_link: "https://portfolio.antbox.in/riya", mentor_feedback: "Strong client communication", ppo_status: "Recommended", status: "PPO Recommended" },
    { id: ids.students.intern, student_code: "STU-1002", name: "Ananya Sen", email: "intern@antos.dev", phone: "+91 90000 20002", college: "SRM University", degree: "B.Tech CSE", graduation_year: 2027, skills: ["React", "SQL", "AI Tools"], career_interest: "Software Development", sprint_history: ["AI Tools Sprint"], readiness_score: 76, portfolio_link: "https://portfolio.antbox.in/ananya", mentor_feedback: "Good execution pace", ppo_status: "Eligible", status: "Internship Deployed" },
    { id: ids.students.extra, student_code: "STU-1003", name: "Devika Menon", email: "devika@student.example", phone: "+91 90000 20003", college: "NMIMS", degree: "MBA", graduation_year: 2026, skills: ["Product", "Analytics"], career_interest: "Product Management", sprint_history: ["Revenue Operations Sprint"], readiness_score: 82, portfolio_link: "https://portfolio.antbox.in/devika", mentor_feedback: "High ownership", ppo_status: "Eligible", status: "In Training" }
  ];
}

function corporatePartners() {
  return [
    { id: ids.partners.scalegrid, company_name: "ScaleGrid SaaS", contact_person: "Arjun Bose", email: "partner@antos.dev", phone: "+91 90000 30001", industry: "SaaS", hiring_need: "RevOps interns", active_sprints: 2, interns_deployed: 18, ppos_issued: 7, revenue_generated: 2250000, account_owner: "Aarav Mehta", account_owner_id: ids.employees.superadmin, status: "Active Partner" },
    { id: ids.partners.insightloop, company_name: "InsightLoop Analytics", contact_person: "Meera Sinha", email: "meera@insightloop.example", phone: "+91 90000 30002", industry: "Analytics", hiring_need: "Data analysts", active_sprints: 1, interns_deployed: 12, ppos_issued: 4, revenue_generated: 1480000, account_owner: "Rohan Kapoor", account_owner_id: ids.employees.pm, status: "Active Partner" }
  ];
}

function projects() {
  return [
    { id: ids.projects.revops, project_code: "ANT-PM-101", name: "RevOps Sprint Delivery", client: "ScaleGrid SaaS", corporate_partner_id: ids.partners.scalegrid, manager: "Rohan Kapoor", manager_id: ids.employees.pm, start_date: "2026-04-01", deadline: "2026-06-10", assigned_members: [ids.employees.employee, ids.employees.intern, ids.employees.mentor], budget: 900000, revenue: 1450000, progress: 72, status: "In Progress", health: "Yellow", priority: "High" },
    { id: ids.projects.analytics, project_code: "ANT-DA-209", name: "Analytics Intern Pod", client: "InsightLoop Analytics", corporate_partner_id: ids.partners.insightloop, manager: "Rohan Kapoor", manager_id: ids.employees.pm, start_date: "2026-03-10", deadline: "2026-05-20", assigned_members: [ids.employees.employee, ids.employees.intern], budget: 620000, revenue: 980000, progress: 64, status: "Review", health: "Red", priority: "Critical" }
  ];
}

function tasks() {
  return [
    { id: ids.tasks.brief, project_id: ids.projects.revops, title: "Build partner research brief", description: "Map ICP, hiring need, and GTM workflow", assigned_to: ids.employees.intern, priority: "High", due_date: "2026-05-25", estimated_hours: 8, actual_hours: 5, status: "In Progress" },
    { id: ids.tasks.qa, project_id: ids.projects.analytics, title: "Client dashboard QA", description: "Validate intern output against acceptance checklist", assigned_to: ids.employees.employee, priority: "Critical", due_date: "2026-05-23", estimated_hours: 10, actual_hours: 9, status: "Review" },
    { id: ids.tasks.rubric, project_id: ids.projects.revops, title: "Readiness rubric", description: "Finalize readiness evaluation rubric", assigned_to: ids.employees.mentor, priority: "Medium", due_date: "2026-05-30", estimated_hours: 5, actual_hours: 3, status: "To Do" }
  ];
}

function attendance() {
  return [
    { employee_id: ids.employees.employee, date: "2026-05-22", check_in: "09:51", check_out: "18:36", work_mode: "Hybrid", status: "Present", working_hours: 8.8, regularization_status: "None" },
    { employee_id: ids.employees.intern, date: "2026-05-22", check_in: "10:28", check_out: "18:12", work_mode: "Remote", status: "Late", working_hours: 7.7, regularization_status: "Pending", regularization_reason: "Network issue during morning standup" },
    { employee_id: ids.employees.mentor, date: "2026-05-22", check_in: null, check_out: null, work_mode: "Remote", status: "Absent", working_hours: 0, regularization_status: "None" }
  ];
}

function leaveRequests() {
  return [
    { id: "90000000-0000-4000-8000-000000000001", employee_id: ids.employees.employee, leave_type: "Casual", from_date: "2026-05-27", to_date: "2026-05-28", days: 2, reason: "Family travel", status: "Pending", manager_remarks: "Awaiting coverage plan" },
    { id: "90000000-0000-4000-8000-000000000002", employee_id: ids.employees.finance, leave_type: "Sick", from_date: "2026-05-17", to_date: "2026-05-17", days: 1, reason: "Fever", status: "Approved", manager_remarks: "Approved", approved_by: "Priya Sharma" }
  ];
}

function payroll() {
  return [
    payrollRow("91000000-0000-4000-8000-000000000001", ids.employees.employee, 125000, 12500, 6250, 0, 0, "Processed"),
    payrollRow("91000000-0000-4000-8000-000000000002", ids.employees.intern, 35000, 3500, 1000, 0, 0, "Draft"),
    payrollRow("91000000-0000-4000-8000-000000000003", ids.employees.finance, 140000, 14000, 7000, 4667, 1, "Paid")
  ];
}

function payrollRow(id, employee_id, basic_salary, allowances, deductions, lop, lop_days, status) {
  return {
    id,
    employee_id,
    month: "May 2026",
    basic_salary,
    allowances,
    deductions,
    lop,
    lop_days,
    net_salary: basic_salary + allowances - deductions - lop,
    status,
    payment_date: status === "Paid" ? "2026-05-30" : null,
    generated_at: "2026-05-24T09:00:00.000Z",
    processed_at: status !== "Draft" ? "2026-05-24T10:00:00.000Z" : null,
    processed_by: status !== "Draft" ? "Vikram Rao" : null
  };
}

function timesheets() {
  return [
    { id: "92000000-0000-4000-8000-000000000001", employee_id: ids.employees.employee, project_id: ids.projects.analytics, task_id: ids.tasks.qa, date: "2026-05-22", hours_worked: 7, type: "Billable", description: "Dashboard QA and review", approval_status: "Approved", submitted_at: "2026-05-22T13:00:00.000Z", approved_by: "Rohan Kapoor" },
    { id: "92000000-0000-4000-8000-000000000002", employee_id: ids.employees.intern, project_id: ids.projects.revops, task_id: ids.tasks.brief, date: "2026-05-22", hours_worked: 5, type: "Billable", description: "Partner research", approval_status: "Pending", submitted_at: "2026-05-22T14:00:00.000Z" }
  ];
}

function careerSprints() {
  return [
    { id: ids.sprints.revops, sprint_code: "SPR-REV-26", name: "Revenue Operations Sprint", domain: "RevOps", corporate_partner: "ScaleGrid SaaS", corporate_partner_id: ids.partners.scalegrid, mentor: "Neha Iyer", mentor_id: ids.employees.mentor, start_date: "2026-05-01", end_date: "2026-06-15", students_enrolled: 64, completion_rate: 78, average_readiness_score: 82, ppos_issued: 9, status: "Live", description: "Students solve real RevOps briefs for SaaS clients." },
    { id: ids.sprints.ai, sprint_code: "SPR-AI-26", name: "AI Tools Sprint", domain: "AI Tools", corporate_partner: "ScaleGrid SaaS", corporate_partner_id: ids.partners.scalegrid, mentor: "Neha Iyer", mentor_id: ids.employees.mentor, start_date: "2026-06-05", end_date: "2026-07-20", students_enrolled: 48, completion_rate: 22, average_readiness_score: 74, ppos_issued: 2, status: "Upcoming", description: "Practical automation and AI workflow assignments." }
  ];
}

function sprintEnrollments() {
  return [
    { sprint_id: ids.sprints.revops, student_id: ids.students.student, status: "Enrolled" },
    { sprint_id: ids.sprints.ai, student_id: ids.students.intern, status: "Enrolled" },
    { sprint_id: ids.sprints.revops, student_id: ids.students.extra, status: "Enrolled" }
  ];
}

function internDeployments() {
  return [
    { id: "93000000-0000-4000-8000-000000000001", student_id: ids.students.intern, employee_id: ids.employees.intern, corporate_partner_id: ids.partners.scalegrid, project_id: ids.projects.revops, intern_name: "Ananya Sen", corporate_client: "ScaleGrid SaaS", project_assigned: "RevOps Sprint Delivery", mentor: "Neha Iyer", mentor_id: ids.employees.mentor, start_date: "2026-05-18", end_date: "2026-07-18", attendance_percentage: 88, timesheet_compliance: 76, task_completion: 78, client_feedback: 74, performance_score: 76, ppo_probability: 61, status: "Deployed" },
    { id: "93000000-0000-4000-8000-000000000002", student_id: ids.students.student, corporate_partner_id: ids.partners.scalegrid, project_id: ids.projects.revops, intern_name: "Riya Nair", corporate_client: "ScaleGrid SaaS", project_assigned: "RevOps Sprint Delivery", mentor: "Neha Iyer", mentor_id: ids.employees.mentor, start_date: "2026-05-12", end_date: "2026-07-12", attendance_percentage: 96, timesheet_compliance: 92, task_completion: 89, client_feedback: 86, performance_score: 88, ppo_probability: 84, status: "Active" }
  ];
}

function readinessScores() {
  return [
    { id: ids.readiness.student, student_id: ids.students.student, task_completion: 89, mentor_feedback: 91, client_feedback: 86, attendance: 96, communication: 88, timesheet_discipline: 92, final_score: 89, recommendation: "PPO Ready", strengths: ["Ownership", "Client communication"], improvement_areas: ["Scale documentation"] },
    { id: ids.readiness.intern, student_id: ids.students.intern, task_completion: 78, mentor_feedback: 82, client_feedback: 74, attendance: 88, communication: 80, timesheet_discipline: 76, final_score: 79, recommendation: "Internship Ready", strengths: ["Execution pace"], improvement_areas: ["Timesheet discipline", "Structured updates"] }
  ];
}

function ppoRecords() {
  return [
    { id: "94000000-0000-4000-8000-000000000001", student_id: ids.students.student, corporate_partner_id: ids.partners.scalegrid, project_id: ids.projects.revops, readiness_score_id: ids.readiness.student, status: "Recommended", recommendation: "PPO Ready", offered_role: "RevOps Associate", offered_ctc: 650000, remarks: "Ready for partner interview" },
    { id: "94000000-0000-4000-8000-000000000002", student_id: ids.students.intern, corporate_partner_id: ids.partners.scalegrid, project_id: ids.projects.revops, readiness_score_id: ids.readiness.intern, status: "Eligible", recommendation: "Internship Ready", remarks: "Continue training" }
  ];
}

function invoices() {
  return [
    { invoice_number: "INV-2026-041", client: "ScaleGrid SaaS", corporate_partner_id: ids.partners.scalegrid, project_id: ids.projects.revops, sprint_id: ids.sprints.revops, project_or_sprint: "Revenue Operations Sprint", amount: 825000, due_date: "2026-05-30", payment_status: "Sent", revenue_category: "Career Sprint", created_by: "Vikram Rao", notes: "May sprint billing" },
    { invoice_number: "INV-2026-038", client: "InsightLoop Analytics", corporate_partner_id: ids.partners.insightloop, project_id: ids.projects.analytics, project_or_sprint: "Analytics Intern Pod", amount: 640000, due_date: "2026-05-12", payment_status: "Overdue", revenue_category: "Intern Deployment", created_by: "Vikram Rao", notes: "Payment follow-up required" }
  ];
}

function expenses() {
  return [
    { id: "95000000-0000-4000-8000-000000000001", category: "Mentor Payout", description: "Sprint mentor honorarium", amount: 180000, date: "2026-05-08", status: "Approved", created_by: "Vikram Rao", approved_by: "Vikram Rao", approved_at: "2026-05-09T10:00:00.000Z" },
    { id: "95000000-0000-4000-8000-000000000002", category: "Software", description: "Analytics and assessment tools", amount: 76000, date: "2026-05-10", status: "Paid", created_by: "Vikram Rao", approved_by: "Vikram Rao", approved_at: "2026-05-10T10:00:00.000Z", paid_at: "2026-05-11T10:00:00.000Z" }
  ];
}

function assets() {
  return [
    { asset_code: "LAP-044", asset_type: "Laptop", assigned_to: "Karan Malhotra", assigned_employee_id: ids.employees.employee, issue_date: "2024-02-12", condition: "Good", return_status: "Not Due", status: "Assigned" },
    { asset_code: "ACC-118", asset_type: "Software Access", assigned_to: "Ananya Sen", assigned_employee_id: ids.employees.intern, issue_date: "2026-05-18", condition: "Active", return_status: "Due on internship end", status: "Assigned" }
  ];
}

function documents() {
  return [
    { id: "96000000-0000-4000-8000-000000000001", title: "Ananya Internship Letter", document_type: "Internship Letter", owner: "Ananya Sen", employee_id: ids.employees.intern, student_id: ids.students.intern, uploaded_date: "2026-05-12", status: "Verified" },
    { id: "96000000-0000-4000-8000-000000000002", title: "ScaleGrid Master Service Agreement", document_type: "Client Contract", owner: "ScaleGrid SaaS", corporate_partner_id: ids.partners.scalegrid, uploaded_date: "2026-04-21", status: "Uploaded" }
  ];
}

function tickets() {
  return [
    { ticket_number: "TKT-1001", title: "Timesheet approval stuck", category: "Project Blocker", raised_by: "Ananya Sen", assigned_to: "Rohan Kapoor", priority: "High", status: "In Progress" },
    { ticket_number: "TKT-1002", title: "Payroll deduction clarification", category: "Payroll Issue", raised_by: "Karan Malhotra", assigned_to: "Vikram Rao", priority: "Medium", status: "Assigned" }
  ];
}

function profiles(rolesByName, usersByEmail) {
  return seedUsers.map((user) => ({
    id: usersByEmail[user.email].id,
    full_name: user.name,
    email: user.email,
    role_id: rolesByName[user.role],
    employee_id: user.employeeId ?? null,
    student_id: user.studentId ?? null,
    corporate_partner_id: user.corporatePartnerId ?? null,
    status: "Active"
  }));
}

function notifications(usersByEmail) {
  return [
    { id: "97000000-0000-4000-8000-000000000001", role_target: "Project Manager", title: "Timesheet pending approval", message: "A timesheet is waiting for project manager review.", type: "Warning", related_module: "Timesheets", is_read: false },
    { id: "97000000-0000-4000-8000-000000000002", role_target: "HR Manager", title: "Leave request submitted", message: "A leave request is pending approval.", type: "Info", related_module: "Leave", is_read: false },
    { id: "97000000-0000-4000-8000-000000000003", user_id: usersByEmail["employee@antos.dev"].id, title: "Payroll processed", message: "Your May 2026 payroll has been processed.", type: "Success", related_module: "Payroll", is_read: false }
  ];
}

function employeesName(employeeId) {
  const row = Object.entries(ids.employees).find(([, id]) => id === employeeId);
  const names = {
    superadmin: "Aarav Mehta",
    hr: "Priya Sharma",
    pm: "Rohan Kapoor",
    mentor: "Neha Iyer",
    finance: "Vikram Rao",
    employee: "Karan Malhotra",
    intern: "Ananya Sen"
  };
  return names[row?.[0]] ?? null;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function loadSeedEnv() {
  if (!existsSync(".env.seed")) return;
  const content = readFileSync(".env.seed", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
