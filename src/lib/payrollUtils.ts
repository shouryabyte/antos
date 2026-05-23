import { format, parse } from "date-fns";
import { getLOPDays } from "./leaveUtils";
import { netSalary } from "./calculations";
import { uid } from "./utils";
import type { Attendance, Employee, Leave, Payroll } from "../types";

export function monthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

export function parsePayrollMonth(month: string) {
  return parse(month, "MMMM yyyy", new Date());
}

export function calculatePayrollForEmployee(employee: Employee, month: string, leaves: Leave[], attendance: Attendance[], existing?: Payroll): Payroll {
  const basicSalary = existing?.basicSalary ?? employee.salary;
  const allowances = existing?.allowances ?? Math.round(employee.salary * 0.1);
  const deductions = existing?.deductions ?? Math.round(employee.salary * 0.05);
  const lopDays = getLOPDays(employee.id, parsePayrollMonth(month), leaves, attendance);
  const lop = Math.round((basicSalary / 30) * lopDays);
  return {
    id: existing?.id || uid("payroll"),
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

export function generatePayroll(existingPayroll: Payroll[], employees: Employee[], leaves: Leave[], attendance: Attendance[], month: string) {
  const activeEmployees = employees.filter((employee) => employee.status === "Active");
  const untouched = existingPayroll.filter((payroll) => payroll.month !== month);
  const monthPayroll = activeEmployees.map((employee) => {
    const existing = existingPayroll.find((payroll) => payroll.employeeId === employee.id && payroll.month === month);
    if (existing && existing.status !== "Draft") return existing;
    return calculatePayrollForEmployee(employee, month, leaves, attendance, existing);
  });
  return [...untouched, ...monthPayroll];
}

export function processPayroll(payroll: Payroll[], month: string, processedBy: string) {
  const now = new Date().toISOString();
  return payroll.map((record) => record.month === month && record.status === "Draft"
    ? { ...record, status: "Processed" as const, processedBy, processedAt: now, generatedAt: record.generatedAt || now }
    : record
  );
}

export function markPayrollPaid(payroll: Payroll[], month: string, paidBy: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  return payroll.map((record) => record.month === month && record.status === "Processed"
    ? { ...record, status: "Paid" as const, paymentDate: today, paidBy }
    : record
  );
}
