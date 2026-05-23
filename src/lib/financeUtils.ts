import { format, isSameMonth, parseISO } from "date-fns";
import type { Expense, Invoice, Payroll, Project, Task, Timesheet, Employee, CareerSprint } from "../types";

export function currentMonthPaidRevenue(invoices: Invoice[], month = new Date()) {
  return invoices.filter((invoice) => invoice.paymentStatus === "Paid" && isSameMonth(parseISO(invoice.paidAt || invoice.createdAt), month)).reduce((sum, invoice) => sum + invoice.amount, 0);
}

export function payrollCost(payroll: Payroll[], employees: Employee[], monthLabel = format(new Date(), "MMMM yyyy")) {
  const records = payroll.filter((record) => record.month === monthLabel);
  return records.length ? records.reduce((sum, record) => sum + record.netSalary, 0) : employees.filter((employee) => employee.status === "Active").reduce((sum, employee) => sum + employee.salary, 0);
}

export function operationalExpenses(expenses: Expense[]) {
  return expenses.filter((expense) => expense.status === "Approved" || expense.status === "Paid").reduce((sum, expense) => sum + expense.amount, 0);
}

export function netProfit(revenue: number, payroll: number, projectCost: number, expenses: number) {
  return revenue - payroll - projectCost - expenses;
}

export function markOverdueInvoices(invoices: Invoice[], today = format(new Date(), "yyyy-MM-dd")) {
  return invoices.map((invoice) => invoice.paymentStatus !== "Paid" && invoice.dueDate < today ? { ...invoice, paymentStatus: "Overdue" as const } : invoice);
}

export function projectProfitability(projects: Project[], invoices: Invoice[], timesheets: Timesheet[], tasks: Task[], employees: Employee[], expenses: Expense[]) {
  return projects.map((project) => {
    const revenue = invoices.filter((invoice) => invoice.projectOrSprint === project.name && invoice.paymentStatus === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
    const taskIds = tasks.filter((task) => task.projectId === project.id).map((task) => task.id);
    const approvedSheets = timesheets.filter((sheet) => sheet.approvalStatus === "Approved" && sheet.type === "Billable" && taskIds.includes(sheet.taskId));
    const billableHours = approvedSheets.reduce((sum, sheet) => sum + sheet.hoursWorked, 0);
    const laborCost = approvedSheets.reduce((sum, sheet) => {
      const employee = employees.find((item) => item.id === sheet.employeeId);
      return sum + ((employee?.salary || 60000) / 160) * sheet.hoursWorked;
    }, 0);
    const allocatedExpenses = expenses.filter((expense) => expense.status === "Approved" || expense.status === "Paid").reduce((sum, expense) => sum + expense.amount, 0) / Math.max(projects.length, 1);
    const profit = revenue - laborCost - allocatedExpenses;
    return { project, revenue, billableHours, laborCost, expenses: allocatedExpenses, profit, margin: revenue ? Math.round((profit / revenue) * 100) : 0 };
  });
}

export function sprintProfitability(sprints: CareerSprint[], invoices: Invoice[], expenses: Expense[]) {
  return sprints.map((sprint) => {
    const revenue = invoices.filter((invoice) => invoice.projectOrSprint === sprint.name && invoice.paymentStatus === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
    const cost = Math.round((sprint.studentsEnrolled * 1200) + (expenses.filter((expense) => expense.category === "Mentor Payout").reduce((sum, expense) => sum + expense.amount, 0) / Math.max(sprints.length, 1)));
    const profit = revenue - cost;
    return { sprint, revenue, cost, profit, margin: revenue ? Math.round((profit / revenue) * 100) : 0, ppoConversion: sprint.studentsEnrolled ? Math.round((sprint.pposIssued / sprint.studentsEnrolled) * 100) : 0 };
  });
}
