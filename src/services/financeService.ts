import { format, isSameMonth, parse, parseISO } from "date-fns";
import { supabase } from "../lib/supabase";
import type { CareerSprint, Expense, Invoice, Project } from "../types";

export type FinanceFilters = {
  status?: string;
  client?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  partnerId?: string;
};

export type FinanceSummary = {
  monthlyRevenue: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  payrollCost: number;
  operationalExpenses: number;
  projectCost: number;
  netProfit: number;
  averageProjectMargin: number;
};

export type ProjectProfitabilityRow = {
  project: Project;
  revenue: number;
  billableHours: number;
  laborCost: number;
  expenses: number;
  payrollCost: number;
  profit: number;
  margin: number;
};

export type SprintProfitabilityRow = {
  sprint: CareerSprint;
  revenue: number;
  cost: number;
  students: number;
  ppos: number;
  profit: number;
  margin: number;
  ppoConversion: number;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client: string;
  project_or_sprint: string | null;
  amount: number | string;
  due_date: string | null;
  payment_status: Invoice["paymentStatus"] | null;
  revenue_category: string | null;
  created_at: string | null;
  paid_at: string | null;
  created_by: string | null;
  notes: string | null;
  project_id?: string | null;
  sprint_id?: string | null;
  corporate_partner_id?: string | null;
};

type ExpenseRow = {
  id: string;
  category: string | null;
  description: string | null;
  amount: number | string;
  date: string | null;
  status: Expense["status"] | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at?: string | null;
};

type ProjectRow = {
  id: string;
  project_code: string | null;
  name: string;
  client: string | null;
  manager: string | null;
  start_date: string | null;
  deadline: string | null;
  assigned_members: string[] | null;
  budget: number | string | null;
  revenue: number | string | null;
  progress: number | string | null;
  status: Project["status"] | null;
  health: Project["health"] | null;
  priority: Project["priority"] | null;
};

type SprintRow = {
  id: string;
  sprint_code: string | null;
  name: string;
  domain: string | null;
  corporate_partner: string | null;
  mentor: string | null;
  start_date: string | null;
  end_date: string | null;
  students_enrolled: number | null;
  completion_rate: number | string | null;
  average_readiness_score: number | string | null;
  ppos_issued: number | null;
  status: CareerSprint["status"] | null;
  description: string | null;
};

type TimesheetCostRow = {
  project_id: string | null;
  hours_worked: number | string;
  type: string | null;
  approval_status: string | null;
  employees?: { salary: number | string | null } | Array<{ salary: number | string | null }> | null;
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Finance requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export async function getInvoices(filters: FinanceFilters = {}) {
  let query = client()
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "All") query = query.eq("payment_status", filters.status);
  if (filters.client && filters.client !== "All") query = query.eq("client", filters.client);
  if (filters.partnerId) query = query.eq("corporate_partner_id", filters.partnerId);
  if (filters.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters.toDate) query = query.lte("created_at", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapInvoice(row as InvoiceRow));
}

export async function createInvoice(input: {
  client: string;
  projectOrSprint: string;
  amount: number;
  dueDate: string;
  revenueCategory: string;
  createdBy?: string;
  notes?: string;
}) {
  const { data, error } = await client()
    .from("invoices")
    .insert({
      invoice_number: await nextInvoiceNumber(),
      client: input.client,
      project_or_sprint: input.projectOrSprint,
      amount: input.amount,
      due_date: input.dueDate,
      payment_status: "Draft",
      revenue_category: input.revenueCategory,
      created_by: input.createdBy,
      notes: input.notes || null
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapInvoice(data as InvoiceRow);
}

export async function updateInvoice(id: string, input: Partial<Pick<Invoice, "client" | "projectOrSprint" | "amount" | "dueDate" | "paymentStatus" | "revenueCategory" | "notes">>) {
  const payload: Record<string, unknown> = {};
  if (input.client !== undefined) payload.client = input.client;
  if (input.projectOrSprint !== undefined) payload.project_or_sprint = input.projectOrSprint;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate;
  if (input.paymentStatus !== undefined) payload.payment_status = input.paymentStatus;
  if (input.revenueCategory !== undefined) payload.revenue_category = input.revenueCategory;
  if (input.notes !== undefined) payload.notes = input.notes || null;

  const { data, error } = await client().from("invoices").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return mapInvoice(data as InvoiceRow);
}

export async function markInvoiceSent(id: string) {
  return updateInvoiceStatus(id, "Sent");
}

export async function markInvoicePaid(id: string) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("invoices")
    .update({ payment_status: "Paid", paid_at: now })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapInvoice(data as InvoiceRow);
}

export async function markInvoiceOverdue(id: string) {
  return updateInvoiceStatus(id, "Overdue");
}

export async function autoMarkOverdueInvoices() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await client()
    .from("invoices")
    .update({ payment_status: "Overdue" })
    .neq("payment_status", "Paid")
    .lt("due_date", today)
    .select("*");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapInvoice(row as InvoiceRow));
}

export async function getExpenses(filters: FinanceFilters = {}) {
  let query = client()
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (filters.status && filters.status !== "All") query = query.eq("status", filters.status);
  if (filters.category && filters.category !== "All") query = query.eq("category", filters.category);
  if (filters.fromDate) query = query.gte("date", filters.fromDate);
  if (filters.toDate) query = query.lte("date", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapExpense(row as ExpenseRow));
}

export async function createExpense(input: { category: string; description: string; amount: number; date: string; createdBy?: string }) {
  const { data, error } = await client()
    .from("expenses")
    .insert({
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: input.date,
      status: "Pending",
      created_by: input.createdBy
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapExpense(data as ExpenseRow);
}

export async function approveExpense(id: string, input: { approvedBy: string }) {
  return updateExpenseStatus(id, "Approved", { approved_by: input.approvedBy, approved_at: new Date().toISOString() });
}

export async function rejectExpense(id: string, input: { approvedBy: string }) {
  return updateExpenseStatus(id, "Rejected", { approved_by: input.approvedBy, approved_at: new Date().toISOString() });
}

export async function markExpensePaid(id: string) {
  return updateExpenseStatus(id, "Paid", { paid_at: new Date().toISOString() });
}

export async function getFinanceSummary(month: string | Date) {
  const monthDate = typeof month === "string" ? parse(month, "MMMM yyyy", new Date()) : month;
  const [invoices, expenses, payrollRows, projectRows] = await Promise.all([
    getInvoices(),
    getExpenses(),
    getPayrollCostRows(monthDate),
    getProjectProfitability()
  ]);
  const monthlyRevenue = invoices
    .filter((invoice) => invoice.paymentStatus === "Paid" && isSameMonth(parseISO(invoice.paidAt || invoice.createdAt), monthDate))
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const operationalExpenses = expenses
    .filter((expense) => ["Approved", "Paid"].includes(expense.status) && isSameMonth(parseISO(expense.paidAt || expense.approvedAt || expense.date), monthDate))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const payrollCost = payrollRows.reduce((sum, row) => sum + Number(row.net_salary || 0), 0);
  const projectCost = projectRows.reduce((sum, row) => sum + row.expenses, 0);
  const averageProjectMargin = projectRows.length ? Math.round(projectRows.reduce((sum, row) => sum + row.margin, 0) / projectRows.length) : 0;

  return {
    monthlyRevenue,
    pendingInvoices: invoices.filter((invoice) => invoice.paymentStatus === "Sent" || invoice.paymentStatus === "Overdue").length,
    paidInvoices: invoices.filter((invoice) => invoice.paymentStatus === "Paid").length,
    overdueInvoices: invoices.filter((invoice) => invoice.paymentStatus === "Overdue").length,
    payrollCost,
    operationalExpenses,
    projectCost,
    netProfit: monthlyRevenue - payrollCost - projectCost - operationalExpenses,
    averageProjectMargin
  };
}

export async function getProjectProfitability() {
  const [projects, invoices, expenses, timesheets] = await Promise.all([
    getProjects(),
    getInvoiceRows(),
    getExpenses(),
    getTimesheetCostRows()
  ]);
  const approvedExpenseTotal = expenses.filter((expense) => ["Approved", "Paid"].includes(expense.status)).reduce((sum, expense) => sum + expense.amount, 0);

  return projects.map((project) => {
    const revenue = invoices
      .filter((invoice) => invoice.payment_status === "Paid" && (invoice.project_id === project.id || invoice.project_or_sprint === project.name))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const approvedSheets = timesheets.filter((sheet) => sheet.project_id === project.id && sheet.approval_status === "Approved");
    const billableHours = approvedSheets
      .filter((sheet) => sheet.type === "Billable")
      .reduce((sum, sheet) => sum + Number(sheet.hours_worked || 0), 0);
    const laborCost = approvedSheets.reduce((sum, sheet) => {
      const employee = Array.isArray(sheet.employees) ? sheet.employees[0] : sheet.employees;
      const hourlySalary = Number(employee?.salary || 60000) / 160;
      return sum + hourlySalary * Number(sheet.hours_worked || 0);
    }, 0);
    const allocatedExpenses = approvedExpenseTotal / Math.max(projects.length, 1);
    const profit = revenue - laborCost - allocatedExpenses;
    return { project, revenue, billableHours, laborCost: Math.round(laborCost), expenses: Math.round(allocatedExpenses), payrollCost: Math.round(laborCost), profit: Math.round(profit), margin: revenue ? Math.round((profit / revenue) * 100) : 0 };
  });
}

export async function getSprintProfitability() {
  const [sprints, invoices, expenses] = await Promise.all([getSprints(), getInvoiceRows(), getExpenses()]);
  const mentorCost = expenses.filter((expense) => ["Approved", "Paid"].includes(expense.status) && expense.category === "Mentor Payout").reduce((sum, expense) => sum + expense.amount, 0);

  return sprints.map((sprint) => {
    const revenue = invoices
      .filter((invoice) => invoice.payment_status === "Paid" && (invoice.sprint_id === sprint.id || invoice.project_or_sprint === sprint.name))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const cost = Math.round((sprint.studentsEnrolled * 1200) + (mentorCost / Math.max(sprints.length, 1)));
    const profit = revenue - cost;
    return {
      sprint,
      revenue,
      cost,
      students: sprint.studentsEnrolled,
      ppos: sprint.pposIssued,
      profit,
      margin: revenue ? Math.round((profit / revenue) * 100) : 0,
      ppoConversion: sprint.studentsEnrolled ? Math.round((sprint.pposIssued / sprint.studentsEnrolled) * 100) : 0
    };
  });
}

async function updateInvoiceStatus(id: string, status: Invoice["paymentStatus"]) {
  const { data, error } = await client()
    .from("invoices")
    .update({ payment_status: status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapInvoice(data as InvoiceRow);
}

async function updateExpenseStatus(id: string, status: Expense["status"], extra: Record<string, unknown>) {
  const { data, error } = await client()
    .from("expenses")
    .update({ status, ...extra })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapExpense(data as ExpenseRow);
}

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const { count, error } = await client()
    .from("invoices")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return `INV-${year}-${String((count || 0) + 1).padStart(3, "0")}`;
}

async function getInvoiceRows() {
  const { data, error } = await client().from("invoices").select("*");
  if (error) throw new Error(error.message);
  return (data || []) as InvoiceRow[];
}

async function getProjects() {
  const { data, error } = await client().from("projects").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapProject(row as ProjectRow));
}

async function getSprints() {
  const { data, error } = await client().from("career_sprints").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapSprint(row as SprintRow));
}

async function getTimesheetCostRows() {
  const { data, error } = await client()
    .from("timesheets")
    .select("project_id,hours_worked,type,approval_status,employees(salary)");
  if (error) throw new Error(error.message);
  return (data || []) as TimesheetCostRow[];
}

async function getPayrollCostRows(monthDate: Date) {
  const month = format(monthDate, "MMMM yyyy");
  const { data, error } = await client().from("payroll").select("net_salary").eq("month", month);
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ net_salary: number | string | null }>;
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    client: row.client,
    projectOrSprint: row.project_or_sprint || "",
    amount: Number(row.amount || 0),
    dueDate: row.due_date || "",
    paymentStatus: row.payment_status || "Draft",
    revenueCategory: row.revenue_category || "",
    createdAt: row.created_at || new Date().toISOString(),
    paidAt: row.paid_at || undefined,
    createdBy: row.created_by || undefined,
    notes: row.notes || undefined
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    category: row.category || "",
    description: row.description || "",
    amount: Number(row.amount || 0),
    date: row.date || "",
    status: row.status || "Pending",
    createdBy: row.created_by || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    paidAt: row.paid_at || undefined
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    projectCode: row.project_code || "",
    name: row.name,
    client: row.client || "",
    manager: row.manager || "",
    startDate: row.start_date || "",
    deadline: row.deadline || "",
    assignedMembers: row.assigned_members || [],
    budget: Number(row.budget || 0),
    revenue: Number(row.revenue || 0),
    progress: Number(row.progress || 0),
    status: row.status || "Not Started",
    health: row.health || "Green",
    priority: row.priority || "Medium"
  };
}

function mapSprint(row: SprintRow): CareerSprint {
  return {
    id: row.id,
    sprintCode: row.sprint_code || "",
    name: row.name,
    domain: row.domain || "",
    corporatePartner: row.corporate_partner || "",
    mentor: row.mentor || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    studentsEnrolled: row.students_enrolled || 0,
    completionRate: Number(row.completion_rate || 0),
    averageReadinessScore: Number(row.average_readiness_score || 0),
    pposIssued: row.ppos_issued || 0,
    status: row.status || "Upcoming",
    description: row.description || ""
  };
}
