import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Banknote, FilePlus2, IndianRupee, Plus, ReceiptText, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
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
import { currentMonthPaidRevenue, markOverdueInvoices, netProfit, operationalExpenses, payrollCost, projectProfitability, sprintProfitability } from "../../lib/financeUtils";
import { createNotification } from "../../lib/notifications";
import { inr, uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Expense, Invoice } from "../../types";

const invoiceSchema = z.object({ client:z.string().min(1), projectOrSprint:z.string().min(1), amount:z.coerce.number().gt(0), dueDate:z.string().min(1), revenueCategory:z.string().min(1), notes:z.string().optional() });
const expenseSchema = z.object({ category:z.string().min(1), description:z.string().min(1), amount:z.coerce.number().gt(0), date:z.string().min(1) });
type InvoiceForm = z.infer<typeof invoiceSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

export function FinancePage() {
  const { profile, hasPermission } = useAuth();
  const store = useAppStore();
  const { invoices, expenses, payroll, employees, projects, tasks, timesheets, sprints, replaceData, addItem, updateItem } = store;
  const canManageInvoices = hasPermission("invoice.manage");
  const canManageFinance = hasPermission("finance.manage");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [expenseStatus, setExpenseStatus] = useState("All");
  const invoiceForm = useForm<InvoiceForm>({ resolver:zodResolver(invoiceSchema), defaultValues:{ client:"", projectOrSprint:"", amount:0, dueDate:format(new Date(),"yyyy-MM-dd"), revenueCategory:"Project", notes:"" } });
  const expenseForm = useForm<ExpenseForm>({ resolver:zodResolver(expenseSchema), defaultValues:{ category:"Software", description:"", amount:0, date:format(new Date(),"yyyy-MM-dd") } });
  const monthPayroll = payrollCost(payroll, employees);
  const revenue = currentMonthPaidRevenue(invoices);
  const opEx = operationalExpenses(expenses);
  const projectRows = projectProfitability(projects, invoices, timesheets, tasks, employees, expenses);
  const sprintRows = sprintProfitability(sprints, invoices, expenses);
  const projectCost = projectRows.reduce((sum, row) => sum + row.expenses, 0);
  const profit = netProfit(revenue, monthPayroll, projectCost, opEx);
  const avgMargin = projectRows.length ? Math.round(projectRows.reduce((sum, row) => sum + row.margin, 0) / projectRows.length) : 0;
  const filteredInvoices = invoices.filter((invoice) => (invoiceStatus === "All" || invoice.paymentStatus === invoiceStatus) && (clientFilter === "All" || invoice.client === clientFilter));
  const filteredExpenses = expenses.filter((expense) => expenseStatus === "All" || expense.status === expenseStatus);
  const clients = ["All", ...Array.from(new Set(invoices.map((invoice) => invoice.client)))];

  const syncInvoices = (next: Invoice[]) => replaceData({ ...toData(useAppStore.getState()), invoices: next });
  const submitInvoice = invoiceForm.handleSubmit((values) => {
    addItem("invoices", { id:uid("inv"), invoiceNumber:`INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3,"0")}`, paymentStatus:"Draft", createdAt:new Date().toISOString(), createdBy:profile?.name || "Finance", ...values });
    setInvoiceOpen(false); invoiceForm.reset();
  });
  const submitExpense = expenseForm.handleSubmit((values) => {
    addItem("expenses", { id:uid("exp"), status:"Pending", createdBy:profile?.name || "Finance", ...values });
    setExpenseOpen(false); expenseForm.reset();
  });
  const updateInvoice = (invoice: Invoice, status: Invoice["paymentStatus"]) => {
    updateItem("invoices", invoice.id, { paymentStatus:status, paidAt:status==="Paid" ? new Date().toISOString() : invoice.paidAt });
    if (status === "Sent" || status === "Paid") createNotification({ roleTarget:"Corporate Partner", title:`Invoice ${status.toLowerCase()}`, message:`Invoice ${invoice.invoiceNumber} has been marked ${status}.`, type:status==="Paid"?"Success":"Info", relatedModule:"Finance" });
  };
  const updateExpense = (expense: Expense, status: Expense["status"]) => updateItem("expenses", expense.id, { status, approvedBy:status==="Approved" ? profile?.name : expense.approvedBy, approvedAt:status==="Approved" ? new Date().toISOString() : expense.approvedAt, paidAt:status==="Paid" ? new Date().toISOString() : expense.paidAt });
  const runOverdue = () => syncInvoices(markOverdueInvoices(invoices));

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Monthly Revenue" value={inr(revenue)} icon={IndianRupee} tone="emerald" />
      <StatCard label="Pending Invoices" value={invoices.filter((i)=>i.paymentStatus==="Sent" || i.paymentStatus==="Overdue").length} icon={ReceiptText} tone="amber" />
      <StatCard label="Payroll Cost" value={inr(monthPayroll)} icon={Banknote} tone="purple" />
      <StatCard label="Net Profit" value={inr(profit)} icon={TrendingUp} tone={profit >= 0 ? "emerald" : "red"} />
      <StatCard label="Paid Invoices" value={invoices.filter((i)=>i.paymentStatus==="Paid").length} icon={ReceiptText} tone="emerald" />
      <StatCard label="Overdue Invoices" value={invoices.filter((i)=>i.paymentStatus==="Overdue").length} icon={ReceiptText} tone="red" />
      <StatCard label="Operational Expenses" value={inr(opEx)} icon={FilePlus2} tone="amber" />
      <StatCard label="Avg Project Margin" value={`${avgMargin}%`} icon={TrendingUp} tone="blue" />
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Revenue vs Expenses"><ResponsiveContainer width="100%" height={260}><BarChart data={[{name:"Current", revenue, expenses:opEx + monthPayroll}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="revenue" fill="#10B981"/><Bar dataKey="expenses" fill="#8B5CF6"/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Invoice Status Summary"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={["Draft","Sent","Paid","Overdue"].map((s)=>({name:s,value:invoices.filter((i)=>i.paymentStatus===s).length}))} dataKey="value" nameKey="name" outerRadius={90}>{["#64748B","#38BDF8","#22C55E","#EF4444"].map((c)=><Cell key={c} fill={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
    </div>

    <Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Invoice Management</p><h2 className="mt-2 text-2xl font-black">Invoices</h2></div><div className="flex flex-wrap gap-2"><select value={invoiceStatus} onChange={(e)=>setInvoiceStatus(e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{["All","Draft","Sent","Paid","Overdue"].map((s)=><option key={s}>{s}</option>)}</select><select value={clientFilter} onChange={(e)=>setClientFilter(e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{clients.map((c)=><option key={c}>{c}</option>)}</select>{canManageInvoices && <Button onClick={runOverdue}>Check Overdue</Button>}{canManageInvoices && <Button onClick={()=>setInvoiceOpen(true)}><Plus size={16}/> Invoice</Button>}</div></div>
      <InvoiceTable invoices={filteredInvoices} canManage={canManageInvoices} onStatus={updateInvoice}/>
    </Card>

    <Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Expense Management</p><h2 className="mt-2 text-2xl font-black">Expenses</h2></div><div className="flex flex-wrap gap-2"><select value={expenseStatus} onChange={(e)=>setExpenseStatus(e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{["All","Pending","Approved","Rejected","Paid"].map((s)=><option key={s}>{s}</option>)}</select>{canManageFinance && <Button onClick={()=>setExpenseOpen(true)}><Plus size={16}/> Expense</Button>}</div></div>
      <ExpenseTable expenses={filteredExpenses} canManage={canManageFinance} onStatus={updateExpense}/>
    </Card>

    <Card><h3 className="mb-4 text-lg font-black">Project Profitability</h3><ProjectProfitTable rows={projectRows}/></Card>
    <Card><h3 className="mb-4 text-lg font-black">Sprint Profitability</h3><SprintProfitTable rows={sprintRows}/></Card>

    <FormDialog open={invoiceOpen} title="Create Invoice" onClose={()=>setInvoiceOpen(false)}><form onSubmit={submitInvoice} className="grid gap-3 sm:grid-cols-2"><input className="h-11 rounded-xl border px-3" placeholder="Client" {...invoiceForm.register("client")}/><input className="h-11 rounded-xl border px-3" placeholder="Project or sprint" {...invoiceForm.register("projectOrSprint")}/><input type="number" className="h-11 rounded-xl border px-3" placeholder="Amount" {...invoiceForm.register("amount")}/><input type="date" className="h-11 rounded-xl border px-3" {...invoiceForm.register("dueDate")}/><input className="h-11 rounded-xl border px-3" placeholder="Revenue category" {...invoiceForm.register("revenueCategory")}/><input className="h-11 rounded-xl border px-3" placeholder="Notes" {...invoiceForm.register("notes")}/><div className="sm:col-span-2 flex justify-end"><Button type="submit">Create</Button></div></form></FormDialog>
    <FormDialog open={expenseOpen} title="Create Expense" onClose={()=>setExpenseOpen(false)}><form onSubmit={submitExpense} className="grid gap-3 sm:grid-cols-2"><select className="h-11 rounded-xl border px-3" {...expenseForm.register("category")}>{["Software","Cloud Infrastructure","Mentor Payout","Marketing","Operations","Office","Travel","Training","Miscellaneous"].map((c)=><option key={c}>{c}</option>)}</select><input type="number" className="h-11 rounded-xl border px-3" placeholder="Amount" {...expenseForm.register("amount")}/><input type="date" className="h-11 rounded-xl border px-3" {...expenseForm.register("date")}/><input className="h-11 rounded-xl border px-3" placeholder="Description" {...expenseForm.register("description")}/><div className="sm:col-span-2 flex justify-end"><Button type="submit">Create</Button></div></form></FormDialog>
  </div>;
}

function InvoiceTable({ invoices, canManage, onStatus }:{ invoices:Invoice[]; canManage:boolean; onStatus:(i:Invoice,s:Invoice["paymentStatus"])=>void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Invoice Number</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project/Sprint</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Revenue Category</th><th className="px-4 py-3">Created At</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{invoices.map((i)=><tr key={i.id}><td className="px-4 py-3 font-semibold">{i.invoiceNumber}</td><td className="px-4 py-3">{i.client}</td><td className="px-4 py-3">{i.projectOrSprint}</td><td className="px-4 py-3">{inr(i.amount)}</td><td className="px-4 py-3">{i.dueDate}</td><td className="px-4 py-3"><StatusBadge value={i.paymentStatus}/></td><td className="px-4 py-3">{i.revenueCategory}</td><td className="px-4 py-3">{i.createdAt.slice(0,10)}</td><td className="px-4 py-3">{canManage ? <div className="flex gap-2"><button className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700" onClick={()=>onStatus(i,"Sent")}>Sent</button><button className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" onClick={()=>onStatus(i,"Paid")}>Paid</button></div> : "No action"}</td></tr>)}{!invoices.length && <tr><td colSpan={9} className="px-4 py-10 text-center font-semibold text-slate-500">No invoices found.</td></tr>}</tbody></table></div>;
}
function ExpenseTable({ expenses, canManage, onStatus }:{ expenses:Expense[]; canManage:boolean; onStatus:(e:Expense,s:Expense["status"])=>void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{expenses.map((e)=><tr key={e.id}><td className="px-4 py-3 font-semibold">{e.category}</td><td className="px-4 py-3">{e.description}</td><td className="px-4 py-3">{inr(e.amount)}</td><td className="px-4 py-3">{e.date}</td><td className="px-4 py-3"><StatusBadge value={e.status}/></td><td className="px-4 py-3">{canManage ? <div className="flex gap-2"><button className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" onClick={()=>onStatus(e,"Approved")}>Approve</button><button className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700" onClick={()=>onStatus(e,"Rejected")}>Reject</button><button className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700" onClick={()=>onStatus(e,"Paid")}>Paid</button></div> : "No action"}</td></tr>)}{!expenses.length && <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">No expenses found.</td></tr>}</tbody></table></div>;
}
function ProjectProfitTable({ rows }:{ rows:ReturnType<typeof projectProfitability> }) {
  return <div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Billable Hours</th><th className="px-4 py-3">Labor Cost</th><th className="px-4 py-3">Expenses</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin %</th><th className="px-4 py-3">Health</th></tr></thead><tbody className="divide-y bg-white">{rows.map((r)=><tr key={r.project.id}><td className="px-4 py-3 font-semibold">{r.project.name}</td><td className="px-4 py-3">{r.project.client}</td><td className="px-4 py-3">{inr(r.revenue)}</td><td className="px-4 py-3">{r.billableHours}</td><td className="px-4 py-3">{inr(r.laborCost)}</td><td className="px-4 py-3">{inr(r.expenses)}</td><td className="px-4 py-3">{inr(r.profit)}</td><td className="px-4 py-3">{r.margin}%</td><td className="px-4 py-3"><StatusBadge value={r.project.health}/></td></tr>)}</tbody></table></div>;
}
function SprintProfitTable({ rows }:{ rows:ReturnType<typeof sprintProfitability> }) {
  return <div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Sprint</th><th className="px-4 py-3">Corporate Partner</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">PPOs</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin %</th><th className="px-4 py-3">PPO Conversion %</th></tr></thead><tbody className="divide-y bg-white">{rows.map((r)=><tr key={r.sprint.id}><td className="px-4 py-3 font-semibold">{r.sprint.name}</td><td className="px-4 py-3">{r.sprint.corporatePartner}</td><td className="px-4 py-3">{inr(r.revenue)}</td><td className="px-4 py-3">{inr(r.cost)}</td><td className="px-4 py-3">{r.sprint.studentsEnrolled}</td><td className="px-4 py-3">{r.sprint.pposIssued}</td><td className="px-4 py-3">{inr(r.profit)}</td><td className="px-4 py-3">{r.margin}%</td><td className="px-4 py-3">{r.ppoConversion}%</td></tr>)}</tbody></table></div>;
}
function toData(state: ReturnType<typeof useAppStore.getState>) { const { role,setRole,addItem,updateItem,deleteItem,replaceData,reset,...data } = state; void role; void setRole; void addItem; void updateItem; void deleteItem; void replaceData; void reset; return data; }
