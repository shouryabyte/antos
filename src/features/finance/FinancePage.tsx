import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Banknote, FilePlus2, IndianRupee, Plus, ReceiptText, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { ChartCard } from "../../components/common/ChartCard";
import { FormDialog } from "../../components/common/FormDialog";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createAccountNotification, logAudit } from "../../lib/onboardingAutomation";
import { inr } from "../../lib/utils";
import {
  approveExpense,
  autoMarkOverdueInvoices,
  createExpense,
  createInvoice,
  getExpenses,
  getFinanceSummary,
  getInvoices,
  getProjectProfitability,
  getSprintProfitability,
  markExpensePaid,
  markInvoiceOverdue,
  markInvoicePaid,
  markInvoiceSent,
  rejectExpense,
  updateInvoice,
  type FinanceSummary,
  type ProjectProfitabilityRow,
  type SprintProfitabilityRow
} from "../../services/financeService";
import { getPayrollSummary, monthLabel } from "../../services/payrollService";
import type { Expense, Invoice } from "../../types";

const invoiceSchema = z.object({
  client: z.string().min(1, "Client is required"),
  projectOrSprint: z.string().min(1, "Project or sprint is required"),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  revenueCategory: z.string().min(1, "Revenue category is required"),
  notes: z.string().optional()
});
const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required")
});
type InvoiceForm = z.infer<typeof invoiceSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

const emptySummary: FinanceSummary = {
  monthlyRevenue: 0,
  pendingInvoices: 0,
  paidInvoices: 0,
  overdueInvoices: 0,
  payrollCost: 0,
  operationalExpenses: 0,
  projectCost: 0,
  netProfit: 0,
  averageProjectMargin: 0
};

export function FinancePage() {
  const { profile, partnerId, hasPermission, hasRole } = useAuth();
  const canReadFinance = hasPermission("finance.read") || hasRole("Super Admin");
  const canReadPayrollCost = hasPermission("payroll.read_all") || canReadFinance;
  const canReadInvoices = hasPermission("invoice.read") || canReadFinance;
  const canManageInvoices = hasPermission("invoice.manage") || hasRole("Super Admin");
  const canManageFinance = hasPermission("finance.manage") || hasRole("Super Admin");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [projectRows, setProjectRows] = useState<ProjectProfitabilityRow[]>([]);
  const [sprintRows, setSprintRows] = useState<SprintProfitabilityRow[]>([]);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [expenseStatus, setExpenseStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invoiceForm = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { client: "", projectOrSprint: "", amount: 0, dueDate: format(new Date(), "yyyy-MM-dd"), revenueCategory: "Project", notes: "" }
  });
  const expenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "Software", description: "", amount: 0, date: format(new Date(), "yyyy-MM-dd") }
  });

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const invoiceRows = canReadInvoices ? await getInvoices({ partnerId: canReadFinance ? undefined : partnerId }) : [];
      setInvoices(invoiceRows);
      if (canReadFinance) {
        const [expenseRows, nextSummary, nextProjectRows, nextSprintRows] = await Promise.all([
          getExpenses(),
          getFinanceSummary(new Date()),
          getProjectProfitability(),
          getSprintProfitability()
        ]);
        setExpenses(expenseRows);
        setSummary(nextSummary);
        setProjectRows(nextProjectRows);
        setSprintRows(nextSprintRows);
      } else if (canReadPayrollCost) {
        const payrollSummary = await getPayrollSummary(monthLabel(new Date()));
        setExpenses([]);
        setSummary({
          ...emptySummary,
          payrollCost: payrollSummary.payrollCost,
          pendingInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Sent" || invoice.paymentStatus === "Overdue").length,
          paidInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Paid").length,
          overdueInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Overdue").length
        });
        setProjectRows([]);
        setSprintRows([]);
      } else {
        setExpenses([]);
        setSummary({ ...emptySummary, pendingInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Sent" || invoice.paymentStatus === "Overdue").length, paidInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Paid").length, overdueInvoices: invoiceRows.filter((invoice) => invoice.paymentStatus === "Overdue").length });
        setProjectRows([]);
        setSprintRows([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load finance data from Supabase.");
    } finally {
      setLoading(false);
    }
  }, [canReadFinance, canReadInvoices, canReadPayrollCost, partnerId]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const filteredInvoices = invoices.filter((invoice) => (invoiceStatus === "All" || invoice.paymentStatus === invoiceStatus) && (clientFilter === "All" || invoice.client === clientFilter));
  const filteredExpenses = expenses.filter((expense) => expenseStatus === "All" || expense.status === expenseStatus);
  const clients = ["All", ...Array.from(new Set(invoices.map((invoice) => invoice.client)))];
  const invoiceStatusData = ["Draft", "Sent", "Paid", "Overdue"].map((status) => ({ name: status, value: invoices.filter((invoice) => invoice.paymentStatus === status).length }));

  const openCreateInvoice = () => {
    setEditingInvoice(null);
    invoiceForm.reset({ client: "", projectOrSprint: "", amount: 0, dueDate: format(new Date(), "yyyy-MM-dd"), revenueCategory: "Project", notes: "" });
    setInvoiceOpen(true);
  };

  const openEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    invoiceForm.reset({
      client: invoice.client,
      projectOrSprint: invoice.projectOrSprint,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      revenueCategory: invoice.revenueCategory,
      notes: invoice.notes || ""
    });
    setInvoiceOpen(true);
  };

  const submitInvoice = invoiceForm.handleSubmit(async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const saved = editingInvoice
        ? await updateInvoice(editingInvoice.id, values)
        : await createInvoice({ ...values, createdBy: profile?.name || profile?.fullName || "Finance" });
      await safeAudit(profile, editingInvoice ? "invoice updated" : "invoice created", "Finance", saved.id, { invoiceNumber: saved.invoiceNumber });
      setMessage(editingInvoice ? "Invoice updated." : "Invoice created.");
      setInvoiceOpen(false);
      setEditingInvoice(null);
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save invoice.");
    } finally {
      setSubmitting(false);
    }
  });

  const submitExpense = expenseForm.handleSubmit(async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const saved = await createExpense({ ...values, createdBy: profile?.name || profile?.fullName || "Finance" });
      await safeAudit(profile, "expense created", "Finance", saved.id, { category: values.category });
      setMessage("Expense created.");
      setExpenseOpen(false);
      expenseForm.reset({ category: "Software", description: "", amount: 0, date: format(new Date(), "yyyy-MM-dd") });
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create expense.");
    } finally {
      setSubmitting(false);
    }
  });

  async function updateInvoiceStatus(invoice: Invoice, status: Invoice["paymentStatus"]) {
    setSubmitting(true);
    setError("");
    try {
      const next = status === "Sent"
        ? await markInvoiceSent(invoice.id)
        : status === "Paid"
          ? await markInvoicePaid(invoice.id)
          : await markInvoiceOverdue(invoice.id);
      await safeAudit(profile, `invoice ${status.toLowerCase()}`, "Finance", invoice.id, { invoiceNumber: invoice.invoiceNumber });
      if (status === "Sent" || status === "Paid" || status === "Overdue") {
        await safeNotification({ roleTarget: "Corporate Partner", title: `Invoice ${status.toLowerCase()}`, message: `Invoice ${invoice.invoiceNumber} has been marked ${status}.`, type: status === "Paid" ? "Success" : status === "Overdue" ? "Warning" : "Info", module: "Finance" });
      }
      setMessage(`Invoice ${next.invoiceNumber} marked ${status}.`);
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runOverdue() {
    setSubmitting(true);
    setError("");
    try {
      const marked = await autoMarkOverdueInvoices();
      await safeAudit(profile, "invoice overdue check", "Finance", undefined, { count: marked.length });
      if (marked.length) await safeNotification({ roleTarget: "Finance Manager", title: "Invoices marked overdue", message: `${marked.length} invoice(s) were marked overdue.`, type: "Warning", module: "Finance" });
      setMessage(marked.length ? `${marked.length} invoice(s) marked overdue.` : "No overdue invoices found.");
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark overdue invoices.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateExpenseStatus(expense: Expense, status: Expense["status"]) {
    setSubmitting(true);
    setError("");
    try {
      const actor = profile?.name || profile?.fullName || "Finance";
      const next = status === "Approved"
        ? await approveExpense(expense.id, { approvedBy: actor })
        : status === "Rejected"
          ? await rejectExpense(expense.id, { approvedBy: actor })
          : await markExpensePaid(expense.id);
      await safeAudit(profile, `expense ${status.toLowerCase()}`, "Finance", expense.id, { category: expense.category });
      await safeNotification({ roleTarget: "Finance Manager", title: `Expense ${status.toLowerCase()}`, message: `${expense.category} expense has been marked ${status}.`, type: status === "Rejected" ? "Danger" : "Success", module: "Finance" });
      setMessage(`Expense ${next.category} marked ${status}.`);
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update expense.");
    } finally {
      setSubmitting(false);
    }
  }

  const chartExpenses = summary.operationalExpenses + summary.payrollCost;

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Monthly Revenue" value={inr(summary.monthlyRevenue)} icon={IndianRupee} tone="emerald" />
      <StatCard label="Pending Invoices" value={summary.pendingInvoices} icon={ReceiptText} tone="amber" />
      <StatCard label="Paid Invoices" value={summary.paidInvoices} icon={ReceiptText} tone="emerald" />
      <StatCard label="Overdue Invoices" value={summary.overdueInvoices} icon={ReceiptText} tone="red" />
      <StatCard label="Payroll Cost" value={inr(summary.payrollCost)} icon={Banknote} tone="purple" />
      <StatCard label="Operational Expenses" value={inr(summary.operationalExpenses)} icon={FilePlus2} tone="amber" />
      <StatCard label="Net Profit" value={inr(summary.netProfit)} icon={TrendingUp} tone={summary.netProfit >= 0 ? "emerald" : "red"} />
      <StatCard label="Avg Project Margin" value={`${summary.averageProjectMargin}%`} icon={TrendingUp} tone="blue" />
    </div>

    {canReadFinance && <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Revenue vs Expenses"><ResponsiveContainer width="100%" height={260}><BarChart data={[{ name: "Current", revenue: summary.monthlyRevenue, expenses: chartExpenses }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#10B981" /><Bar dataKey="expenses" fill="#8B5CF6" /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Invoice Status Summary"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={invoiceStatusData} dataKey="value" nameKey="name" outerRadius={90}>{["#64748B", "#38BDF8", "#22C55E", "#EF4444"].map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
    </div>}

    <Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Invoice Management</p><h2 className="mt-2 text-2xl font-black">Invoices</h2></div><div className="flex flex-wrap gap-2"><select value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{["All", "Draft", "Sent", "Paid", "Overdue"].map((status) => <option key={status}>{status}</option>)}</select><select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{clients.map((client) => <option key={client}>{client}</option>)}</select>{canManageInvoices && <Button disabled={submitting} onClick={runOverdue}>Check Overdue</Button>}{canManageInvoices && <Button onClick={openCreateInvoice}><Plus size={16} /> Invoice</Button>}</div></div>
      <InvoiceTable invoices={filteredInvoices} canManage={canManageInvoices} loading={loading} onEdit={openEditInvoice} onStatus={updateInvoiceStatus} />
    </Card>

    {canReadFinance && <Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Expense Management</p><h2 className="mt-2 text-2xl font-black">Expenses</h2></div><div className="flex flex-wrap gap-2"><select value={expenseStatus} onChange={(event) => setExpenseStatus(event.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{["All", "Pending", "Approved", "Rejected", "Paid"].map((status) => <option key={status}>{status}</option>)}</select>{canManageFinance && <Button onClick={() => setExpenseOpen(true)}><Plus size={16} /> Expense</Button>}</div></div>
      <ExpenseTable expenses={filteredExpenses} canManage={canManageFinance} loading={loading} onStatus={updateExpenseStatus} />
    </Card>}

    {canReadFinance && <Card><h3 className="mb-4 text-lg font-black">Project Profitability</h3><ProjectProfitTable rows={projectRows} /></Card>}
    {canReadFinance && <Card><h3 className="mb-4 text-lg font-black">Sprint Profitability</h3><SprintProfitTable rows={sprintRows} /></Card>}

    <FormDialog open={invoiceOpen} title={editingInvoice ? "Edit Invoice" : "Create Invoice"} onClose={() => setInvoiceOpen(false)}><form onSubmit={submitInvoice} className="grid gap-3 sm:grid-cols-2"><input className="h-11 rounded-xl border px-3" placeholder="Client" {...invoiceForm.register("client")} /><input className="h-11 rounded-xl border px-3" placeholder="Project or sprint" {...invoiceForm.register("projectOrSprint")} /><input type="number" className="h-11 rounded-xl border px-3" placeholder="Amount" {...invoiceForm.register("amount")} /><input type="date" className="h-11 rounded-xl border px-3" {...invoiceForm.register("dueDate")} /><input className="h-11 rounded-xl border px-3" placeholder="Revenue category" {...invoiceForm.register("revenueCategory")} /><input className="h-11 rounded-xl border px-3" placeholder="Notes" {...invoiceForm.register("notes")} /><div className="sm:col-span-2 flex justify-end"><Button disabled={submitting} type="submit">{submitting ? "Saving..." : editingInvoice ? "Save" : "Create"}</Button></div></form></FormDialog>
    <FormDialog open={expenseOpen} title="Create Expense" onClose={() => setExpenseOpen(false)}><form onSubmit={submitExpense} className="grid gap-3 sm:grid-cols-2"><select className="h-11 rounded-xl border px-3" {...expenseForm.register("category")}>{["Software", "Cloud Infrastructure", "Mentor Payout", "Marketing", "Operations", "Office", "Travel", "Training", "Miscellaneous"].map((category) => <option key={category}>{category}</option>)}</select><input type="number" className="h-11 rounded-xl border px-3" placeholder="Amount" {...expenseForm.register("amount")} /><input type="date" className="h-11 rounded-xl border px-3" {...expenseForm.register("date")} /><input className="h-11 rounded-xl border px-3" placeholder="Description" {...expenseForm.register("description")} /><div className="sm:col-span-2 flex justify-end"><Button disabled={submitting} type="submit">{submitting ? "Saving..." : "Create"}</Button></div></form></FormDialog>
  </div>;
}

function InvoiceTable({ invoices, canManage, loading, onEdit, onStatus }: { invoices: Invoice[]; canManage: boolean; loading: boolean; onEdit: (invoice: Invoice) => void; onStatus: (invoice: Invoice, status: Invoice["paymentStatus"]) => void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Invoice Number</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project/Sprint</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Revenue Category</th><th className="px-4 py-3">Created At</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-semibold">{invoice.invoiceNumber}</td><td className="px-4 py-3">{invoice.client}</td><td className="px-4 py-3">{invoice.projectOrSprint}</td><td className="px-4 py-3">{inr(invoice.amount)}</td><td className="px-4 py-3">{invoice.dueDate}</td><td className="px-4 py-3"><StatusBadge value={invoice.paymentStatus} /></td><td className="px-4 py-3">{invoice.revenueCategory}</td><td className="px-4 py-3">{invoice.createdAt.slice(0, 10)}</td><td className="px-4 py-3">{canManage ? <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700" onClick={() => onEdit(invoice)}>Edit</button><button className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700" onClick={() => onStatus(invoice, "Sent")}>Sent</button><button className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" onClick={() => onStatus(invoice, "Paid")}>Paid</button><button className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700" onClick={() => onStatus(invoice, "Overdue")}>Overdue</button></div> : "No action"}</td></tr>)}{!invoices.length && <tr><td colSpan={9} className="px-4 py-10 text-center font-semibold text-slate-500">{loading ? "Loading invoices from Supabase..." : "No invoices found."}</td></tr>}</tbody></table></div>;
}

function ExpenseTable({ expenses, canManage, loading, onStatus }: { expenses: Expense[]; canManage: boolean; loading: boolean; onStatus: (expense: Expense, status: Expense["status"]) => void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{expenses.map((expense) => <tr key={expense.id}><td className="px-4 py-3 font-semibold">{expense.category}</td><td className="px-4 py-3">{expense.description}</td><td className="px-4 py-3">{inr(expense.amount)}</td><td className="px-4 py-3">{expense.date}</td><td className="px-4 py-3"><StatusBadge value={expense.status} /></td><td className="px-4 py-3">{canManage ? <div className="flex gap-2"><button className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" onClick={() => onStatus(expense, "Approved")}>Approve</button><button className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700" onClick={() => onStatus(expense, "Rejected")}>Reject</button><button className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700" onClick={() => onStatus(expense, "Paid")}>Paid</button></div> : "No action"}</td></tr>)}{!expenses.length && <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">{loading ? "Loading expenses from Supabase..." : "No expenses found."}</td></tr>}</tbody></table></div>;
}

function ProjectProfitTable({ rows }: { rows: ProjectProfitabilityRow[] }) {
  return <div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Billable Hours</th><th className="px-4 py-3">Labor Cost</th><th className="px-4 py-3">Expenses</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin %</th><th className="px-4 py-3">Health</th></tr></thead><tbody className="divide-y bg-white">{rows.map((row) => <tr key={row.project.id}><td className="px-4 py-3 font-semibold">{row.project.name}</td><td className="px-4 py-3">{row.project.client}</td><td className="px-4 py-3">{inr(row.revenue)}</td><td className="px-4 py-3">{row.billableHours}</td><td className="px-4 py-3">{inr(row.laborCost)}</td><td className="px-4 py-3">{inr(row.expenses)}</td><td className="px-4 py-3">{inr(row.profit)}</td><td className="px-4 py-3">{row.margin}%</td><td className="px-4 py-3"><StatusBadge value={row.project.health} /></td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-4 py-10 text-center font-semibold text-slate-500">No project profitability records found.</td></tr>}</tbody></table></div>;
}

function SprintProfitTable({ rows }: { rows: SprintProfitabilityRow[] }) {
  return <div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Sprint</th><th className="px-4 py-3">Corporate Partner</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">PPOs</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin %</th><th className="px-4 py-3">PPO Conversion %</th></tr></thead><tbody className="divide-y bg-white">{rows.map((row) => <tr key={row.sprint.id}><td className="px-4 py-3 font-semibold">{row.sprint.name}</td><td className="px-4 py-3">{row.sprint.corporatePartner}</td><td className="px-4 py-3">{inr(row.revenue)}</td><td className="px-4 py-3">{inr(row.cost)}</td><td className="px-4 py-3">{row.students}</td><td className="px-4 py-3">{row.ppos}</td><td className="px-4 py-3">{inr(row.profit)}</td><td className="px-4 py-3">{row.margin}%</td><td className="px-4 py-3">{row.ppoConversion}%</td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-4 py-10 text-center font-semibold text-slate-500">No sprint profitability records found.</td></tr>}</tbody></table></div>;
}

async function safeAudit(...args: Parameters<typeof logAudit>) {
  try {
    await logAudit(...args);
  } catch {
    // Audit logging must not block finance actions.
  }
}

async function safeNotification(input: Parameters<typeof createAccountNotification>[0]) {
  try {
    await createAccountNotification(input);
  } catch {
    // Notification RLS or delivery issues should not block finance actions.
  }
}
