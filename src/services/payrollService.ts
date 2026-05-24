import { format, parse } from "date-fns";
import { netSalary } from "../lib/calculations";
import { supabase } from "../lib/supabase";
import { getLOPDays } from "./leaveService";
import type { Employee, Payroll } from "../types";

export type PayrollEmployee = {
  id: string;
  name: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  salary: number;
};

export type PayrollWithEmployee = {
  record: Payroll;
  employee?: PayrollEmployee;
};

export type PayrollFilters = {
  month?: string;
  department?: string;
  status?: string;
};

type PayrollRow = {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number | string | null;
  allowances: number | string | null;
  deductions: number | string | null;
  lop: number | string | null;
  lop_days: number | string | null;
  net_salary: number | string | null;
  status: Payroll["status"] | null;
  payment_date: string | null;
  generated_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  paid_by: string | null;
  employees?: {
    id: string;
    name: string;
    employee_code: string | null;
    department: string | null;
    designation: string | null;
    salary: number | string | null;
  } | null;
};

type EmployeeRow = {
  id: string;
  employee_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  manager: string | null;
  joining_date: string | null;
  employment_type: Employee["employmentType"] | null;
  salary: number | string | null;
  work_location: string | null;
  status: Employee["status"] | null;
  avatar: string | null;
  skills: string[] | null;
  documents: string[] | null;
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Payroll requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export function monthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

export function parsePayrollMonth(month: string) {
  return parse(month, "MMMM yyyy", new Date());
}

export async function getMyPayroll(employeeId: string) {
  const { data, error } = await client()
    .from("payroll")
    .select("*, employees(id,name,employee_code,department,designation,salary)")
    .eq("employee_id", employeeId)
    .order("generated_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithEmployee(row as PayrollRow));
}

export async function getAllPayroll(filters: PayrollFilters = {}) {
  let query = client()
    .from("payroll")
    .select("*, employees(id,name,employee_code,department,designation,salary)")
    .order("month", { ascending: false });

  if (filters.month) query = query.eq("month", filters.month);
  if (filters.status && filters.status !== "All") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || [])
    .map((row) => mapRowWithEmployee(row as PayrollRow))
    .filter(({ employee }) => !filters.department || filters.department === "All" || employee?.department === filters.department)
    .sort((a, b) => (a.employee?.name || a.record.employeeId).localeCompare(b.employee?.name || b.record.employeeId));
}

export async function calculateEmployeePayroll(employeeId: string, month: string) {
  const employee = await getEmployee(employeeId);
  const existing = await getExistingPayroll(employeeId, month);
  return calculatePayrollForEmployee(employee, month, existing?.record);
}

export async function generatePayroll(month: string) {
  const employees = await getActiveEmployees();
  const results: PayrollWithEmployee[] = [];

  for (const employee of employees) {
    const existing = await getExistingPayroll(employee.id, month);
    if (existing && existing.record.status !== "Draft") {
      results.push(existing);
      continue;
    }

    const calculated = await calculatePayrollForEmployee(employee, month, existing?.record);
    const payload = toPayrollPayload(calculated);
    const { data, error } = await client()
      .from("payroll")
      .upsert(payload, { onConflict: "employee_id,month" })
      .select("*, employees(id,name,employee_code,department,designation,salary)")
      .single();
    if (error) throw new Error(error.message);
    results.push(mapRowWithEmployee(data as PayrollRow));
  }

  return results;
}

export async function processPayroll(month: string, processedBy: string) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("payroll")
    .update({ status: "Processed", processed_by: processedBy, processed_at: now, generated_at: now })
    .eq("month", month)
    .eq("status", "Draft")
    .select("*, employees(id,name,employee_code,department,designation,salary)");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithEmployee(row as PayrollRow));
}

export async function markPayrollPaid(month: string, paidBy: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await client()
    .from("payroll")
    .update({ status: "Paid", payment_date: today, paid_by: paidBy })
    .eq("month", month)
    .eq("status", "Processed")
    .select("*, employees(id,name,employee_code,department,designation,salary)");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithEmployee(row as PayrollRow));
}

export async function getPayrollSummary(month: string) {
  const rows = await getAllPayroll({ month });
  return {
    payrollCost: rows.reduce((sum, item) => sum + item.record.netSalary, 0),
    totalEmployees: rows.length,
    totalLopDays: rows.reduce((sum, item) => sum + (item.record.lopDays || 0), 0),
    draftCount: rows.filter((item) => item.record.status === "Draft").length,
    processedCount: rows.filter((item) => item.record.status === "Processed").length,
    paidCount: rows.filter((item) => item.record.status === "Paid").length
  };
}

async function calculatePayrollForEmployee(employee: Employee, month: string, existing?: Payroll): Promise<Payroll> {
  const basicSalary = existing?.basicSalary ?? employee.salary;
  const allowances = existing?.allowances ?? Math.round(employee.salary * 0.1);
  const deductions = existing?.deductions ?? Math.round(employee.salary * 0.05);
  const lopDays = await getLOPDays(employee.id, month);
  const lop = Math.round((basicSalary / 30) * lopDays);
  return {
    id: existing?.id || "",
    employeeId: employee.id,
    month,
    basicSalary,
    allowances,
    deductions,
    lop,
    lopDays,
    netSalary: netSalary(basicSalary, allowances, deductions, lop),
    status: existing?.status ?? "Draft",
    paymentDate: existing?.paymentDate ?? "",
    generatedAt: existing?.generatedAt ?? new Date().toISOString(),
    processedAt: existing?.processedAt,
    processedBy: existing?.processedBy,
    paidBy: existing?.paidBy
  };
}

async function getActiveEmployees() {
  const { data, error } = await client()
    .from("employees")
    .select("*")
    .eq("status", "Active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapEmployee(row as EmployeeRow));
}

async function getEmployee(employeeId: string) {
  const { data, error } = await client()
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();
  if (error) throw new Error(error.message);
  return mapEmployee(data as EmployeeRow);
}

async function getExistingPayroll(employeeId: string, month: string) {
  const { data, error } = await client()
    .from("payroll")
    .select("*, employees(id,name,employee_code,department,designation,salary)")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRowWithEmployee(data as PayrollRow) : null;
}

function toPayrollPayload(record: Payroll) {
  return {
    employee_id: record.employeeId,
    month: record.month,
    basic_salary: record.basicSalary,
    allowances: record.allowances,
    deductions: record.deductions,
    lop: record.lop,
    lop_days: record.lopDays || 0,
    net_salary: record.netSalary,
    status: record.status,
    payment_date: record.paymentDate || null,
    generated_at: record.generatedAt || new Date().toISOString(),
    processed_at: record.processedAt || null,
    processed_by: record.processedBy || null,
    paid_by: record.paidBy || null
  };
}

function mapRowWithEmployee(row: PayrollRow): PayrollWithEmployee {
  return {
    record: mapRow(row),
    employee: row.employees ? {
      id: row.employees.id,
      name: row.employees.name,
      employeeCode: row.employees.employee_code || undefined,
      department: row.employees.department || undefined,
      designation: row.employees.designation || undefined,
      salary: Number(row.employees.salary || 0)
    } : undefined
  };
}

function mapRow(row: PayrollRow): Payroll {
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    basicSalary: Number(row.basic_salary || 0),
    allowances: Number(row.allowances || 0),
    deductions: Number(row.deductions || 0),
    lop: Number(row.lop || 0),
    lopDays: Number(row.lop_days || 0),
    netSalary: Number(row.net_salary || 0),
    status: row.status || "Draft",
    paymentDate: row.payment_date || "",
    generatedAt: row.generated_at || undefined,
    processedAt: row.processed_at || undefined,
    processedBy: row.processed_by || undefined,
    paidBy: row.paid_by || undefined
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code || "",
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    department: row.department || "Unassigned",
    designation: row.designation || "",
    manager: row.manager || "",
    joiningDate: row.joining_date || "",
    employmentType: row.employment_type || "Full-time",
    salary: Number(row.salary || 0),
    workLocation: row.work_location || "",
    status: row.status || "Active",
    avatar: row.avatar || "",
    skills: row.skills || [],
    documents: row.documents || []
  };
}
