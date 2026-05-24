import { format, isSameMonth, parseISO, subMonths } from "date-fns";
import { supabase } from "../lib/supabase";
import { getFinanceSummary, getProjectProfitability, getSprintProfitability, type ProjectProfitabilityRow, type SprintProfitabilityRow } from "./financeService";

export type PendingApprovalsSummary = {
  leaves: number;
  regularizations: number;
  timesheets: number;
  expenses: number;
  invoices: number;
  roleChanges: number;
  invitations: number;
  atRiskProjects: number;
  total: number;
};

export type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  pendingRegularizations: number;
};

export type FinanceSnapshot = {
  monthlyRevenue: number;
  payrollCost: number;
  operationalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  projectRows: ProjectProfitabilityRow[];
  sprintRows: SprintProfitabilityRow[];
  revenueExpenseTrend: Array<{ m: string; rev: number; exp: number }>;
};

export type ProjectHealthSummary = {
  activeProjects: number;
  atRiskProjects: number;
  health: Array<{ name: string; value: number }>;
  atRisk: Array<{ id: string; name: string; health: string }>;
};

export type ReadinessSummary = {
  averageReadinessScore: number;
  distribution: Array<{ name: string; score: number }>;
};

export type PPOStats = {
  pposIssued: number;
  ppoReady: number;
  conversionTrend: Array<{ name: string; conversion: number }>;
};

export type ExecutiveDashboard = {
  kpis: {
    totalEmployees: number;
    activeInterns: number;
    activeStudents: number;
    liveCareerSprints: number;
    corporatePartners: number;
    activeProjects: number;
    averageReadinessScore: number;
    pposIssued: number;
    monthlyRevenue: number;
    payrollCost: number;
    pendingApprovals: number;
    atRiskProjects: number;
    netProfit: number;
  };
  pending: PendingApprovalsSummary;
  finance: FinanceSnapshot;
  attendance: AttendanceSummary;
  projects: ProjectHealthSummary;
  readiness: ReadinessSummary;
  ppo: PPOStats;
  sprintCompletion: Array<{ name: string; completion: number }>;
  studentPipeline: Array<{ name: string; value: number }>;
  deploymentStatus: Array<{ id: string; internName: string; corporateClient: string; ppoProbability: number; status: string }>;
};

type EmployeeRow = { id: string; employment_type: string | null; status: string | null };
type StudentRow = { id: string; name: string; status: string | null; ppo_status: string | null; readiness_score: number | string | null };
type SprintRow = { id: string; name: string; status: string | null; completion_rate: number | string | null; students_enrolled: number | null; ppos_issued: number | null };
type PartnerRow = { id: string; status: string | null };
type ProjectRow = { id: string; name: string; status: string | null; health: string | null };
type ReadinessRow = { final_score: number | string | null; recommendation: string | null; students?: { name: string | null } | Array<{ name: string | null }> | null };
type DeploymentRow = { id: string; intern_name: string | null; corporate_client: string | null; ppo_probability: number | string | null; status: string | null };
type InvoiceRow = { amount: number | string | null; payment_status: string | null; paid_at: string | null; created_at: string | null };
type ExpenseRow = { amount: number | string | null; status: string | null; paid_at: string | null; approved_at: string | null; date: string | null };
type PayrollRow = { net_salary: number | string | null; month: string | null };

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Dashboard requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const [
    employees,
    students,
    sprints,
    partners,
    projects,
    readiness,
    deployments,
    pending,
    finance,
    attendance,
    projectHealth,
    ppo
  ] = await Promise.all([
    getEmployees(),
    getStudents(),
    getSprints(),
    getPartners(),
    getProjects(),
    getReadinessRows(),
    getDeploymentRows(),
    getPendingApprovalsSummary(),
    getFinanceSnapshot(),
    getAttendanceSummary(),
    getProjectHealthSummary(),
    getPPOStats()
  ]);

  const readinessSummary = summarizeReadiness(readiness);
  const activeInterns = employees.filter((row) => row.status === "Active" && row.employment_type === "Intern").length + deployments.filter((row) => ["Deployed", "Active"].includes(row.status || "")).length;

  return {
    kpis: {
      totalEmployees: employees.length,
      activeInterns,
      activeStudents: students.filter((row) => row.status !== "Hired").length,
      liveCareerSprints: sprints.filter((row) => row.status === "Live").length,
      corporatePartners: partners.length,
      activeProjects: projects.filter((row) => row.status !== "Completed").length,
      averageReadinessScore: readinessSummary.averageReadinessScore,
      pposIssued: ppo.pposIssued,
      monthlyRevenue: finance.monthlyRevenue,
      payrollCost: finance.payrollCost,
      pendingApprovals: pending.total,
      atRiskProjects: projectHealth.atRiskProjects,
      netProfit: finance.netProfit
    },
    pending,
    finance,
    attendance,
    projects: projectHealth,
    readiness: readinessSummary,
    ppo,
    sprintCompletion: sprints.map((row) => ({ name: row.name, completion: Number(row.completion_rate || 0) })),
    studentPipeline: summarizeStudentPipeline(students),
    deploymentStatus: deployments.map((row) => ({
      id: row.id,
      internName: row.intern_name || "Intern",
      corporateClient: row.corporate_client || "Client",
      ppoProbability: Number(row.ppo_probability || 0),
      status: row.status || "Shortlisted"
    }))
  };
}

export async function getPendingApprovalsSummary(): Promise<PendingApprovalsSummary> {
  const [leaves, regularizations, timesheets, expenses, invoices, roleChanges, invitations, projects] = await Promise.all([
    countRows("leave_requests", "status", "Pending"),
    countRows("attendance", "regularization_status", "Pending"),
    countRows("timesheets", "approval_status", "Pending"),
    countRows("expenses", "status", "Pending"),
    countRowsIn("invoices", "payment_status", ["Draft", "Sent", "Overdue"]),
    countRows("role_change_requests", "status", "Pending"),
    countRows("user_invitations", "status", "Pending"),
    countRows("projects", "health", "Red")
  ]);
  return {
    leaves,
    regularizations,
    timesheets,
    expenses,
    invoices,
    roleChanges,
    invitations,
    atRiskProjects: projects,
    total: leaves + regularizations + timesheets + expenses + invoices + roleChanges + invitations
  };
}

export async function getFinanceSnapshot(): Promise<FinanceSnapshot> {
  const [summary, projectRows, sprintRows, invoices, expenses, payroll] = await Promise.all([
    getFinanceSummary(new Date()),
    getProjectProfitability(),
    getSprintProfitability(),
    getInvoiceRows(),
    getExpenseRows(),
    getPayrollRows()
  ]);
  return {
    monthlyRevenue: summary.monthlyRevenue,
    payrollCost: summary.payrollCost,
    operationalExpenses: summary.operationalExpenses,
    netProfit: summary.netProfit,
    pendingInvoices: summary.pendingInvoices,
    paidInvoices: summary.paidInvoices,
    overdueInvoices: summary.overdueInvoices,
    projectRows,
    sprintRows,
    revenueExpenseTrend: buildFinanceTrend(invoices, expenses, payroll)
  };
}

export async function getAttendanceSummary(): Promise<AttendanceSummary> {
  const rows = await selectRows<{ status: string | null; regularization_status: string | null }>("attendance", "status,regularization_status");
  return {
    present: rows.filter((row) => row.status === "Present").length,
    absent: rows.filter((row) => row.status === "Absent").length,
    late: rows.filter((row) => row.status === "Late").length,
    halfDay: rows.filter((row) => row.status === "Half Day").length,
    leave: rows.filter((row) => row.status === "Leave").length,
    pendingRegularizations: rows.filter((row) => row.regularization_status === "Pending").length
  };
}

export async function getProjectHealthSummary(): Promise<ProjectHealthSummary> {
  const rows = await getProjects();
  const health = ["Green", "Yellow", "Red"].map((name) => ({ name, value: rows.filter((row) => row.health === name).length }));
  return {
    activeProjects: rows.filter((row) => row.status !== "Completed").length,
    atRiskProjects: rows.filter((row) => row.health === "Red").length,
    health,
    atRisk: rows.filter((row) => row.health !== "Green").map((row) => ({ id: row.id, name: row.name, health: row.health || "Yellow" }))
  };
}

export async function getReadinessSummary(): Promise<ReadinessSummary> {
  return summarizeReadiness(await getReadinessRows());
}

export async function getPPOStats(): Promise<PPOStats> {
  const [sprints, ppos, readiness] = await Promise.all([
    getSprints(),
    selectRows<{ status: string | null }>("ppo_records", "status"),
    getReadinessRows()
  ]);
  const pposIssued = sprints.reduce((sum, sprint) => sum + (sprint.ppos_issued || 0), 0) + ppos.filter((row) => ["Offered", "Accepted", "Hired"].includes(row.status || "")).length;
  const ppoReady = readiness.filter((row) => row.recommendation === "PPO Ready" || row.recommendation === "High Potential").length;
  return {
    pposIssued,
    ppoReady,
    conversionTrend: sprints.map((sprint) => ({
      name: sprint.name,
      conversion: sprint.students_enrolled ? Math.round(((sprint.ppos_issued || 0) / sprint.students_enrolled) * 100) : 0
    }))
  };
}

async function countRows(table: string, column: string, value: string) {
  const { count, error } = await client().from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error(error.message);
  return count || 0;
}

async function countRowsIn(table: string, column: string, values: string[]) {
  const { count, error } = await client().from(table).select("id", { count: "exact", head: true }).in(column, values);
  if (error) throw new Error(error.message);
  return count || 0;
}

async function selectRows<T>(table: string, columns = "*") {
  const { data, error } = await client().from(table).select(columns);
  if (error) throw new Error(error.message);
  return (data || []) as T[];
}

async function getEmployees() {
  return selectRows<EmployeeRow>("employees", "id,employment_type,status");
}

async function getStudents() {
  return selectRows<StudentRow>("students", "id,name,status,ppo_status,readiness_score");
}

async function getSprints() {
  return selectRows<SprintRow>("career_sprints", "id,name,status,completion_rate,students_enrolled,ppos_issued");
}

async function getPartners() {
  return selectRows<PartnerRow>("corporate_partners", "id,status");
}

async function getProjects() {
  return selectRows<ProjectRow>("projects", "id,name,status,health");
}

async function getReadinessRows() {
  return selectRows<ReadinessRow>("readiness_scores", "final_score,recommendation,students(name)");
}

async function getDeploymentRows() {
  return selectRows<DeploymentRow>("intern_deployments", "id,intern_name,corporate_client,ppo_probability,status");
}

async function getInvoiceRows() {
  return selectRows<InvoiceRow>("invoices", "amount,payment_status,paid_at,created_at");
}

async function getExpenseRows() {
  return selectRows<ExpenseRow>("expenses", "amount,status,paid_at,approved_at,date");
}

async function getPayrollRows() {
  return selectRows<PayrollRow>("payroll", "net_salary,month");
}

function summarizeReadiness(rows: ReadinessRow[]): ReadinessSummary {
  const scores = rows.map((row) => Number(row.final_score || 0));
  const averageReadinessScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  return {
    averageReadinessScore,
    distribution: rows.map((row, index) => {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      return { name: student?.name?.split(" ")[0] || `S${index + 1}`, score: Number(row.final_score || 0) };
    })
  };
}

function summarizeStudentPipeline(rows: StudentRow[]) {
  const labels = ["Registered", "In Training", "Internship Deployed", "PPO Recommended", "Hired"];
  return labels.map((name) => ({ name, value: rows.filter((row) => row.status === name).length }));
}

function buildFinanceTrend(invoices: InvoiceRow[], expenses: ExpenseRow[], payroll: PayrollRow[]) {
  return Array.from({ length: 5 }, (_, index) => {
    const month = subMonths(new Date(), 4 - index);
    const label = format(month, "MMM");
    const revenue = invoices
      .filter((invoice) => invoice.payment_status === "Paid" && invoice.paid_at && isSameMonth(parseISO(invoice.paid_at), month))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const opEx = expenses
      .filter((expense) => ["Approved", "Paid"].includes(expense.status || "") && expense.date && isSameMonth(parseISO(expense.paid_at || expense.approved_at || expense.date), month))
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const payrollCost = payroll
      .filter((row) => row.month === format(month, "MMMM yyyy"))
      .reduce((sum, row) => sum + Number(row.net_salary || 0), 0);
    return { m: label, rev: Math.round(revenue / 1000), exp: Math.round((opEx + payrollCost) / 1000) };
  });
}
