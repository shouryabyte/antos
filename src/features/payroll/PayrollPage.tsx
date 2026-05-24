import { Banknote, CheckCircle2, Clock, FileText, IndianRupee, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createAccountNotification, logAudit } from "../../lib/onboardingAutomation";
import { inr } from "../../lib/utils";
import {
  generatePayroll,
  getAllPayroll,
  getMyPayroll,
  markPayrollPaid,
  monthLabel,
  processPayroll,
  type PayrollEmployee,
  type PayrollWithEmployee
} from "../../services/payrollService";
import type { Payroll } from "../../types";

export function PayrollPage() {
  const { employeeId, profile, hasPermission, hasRole } = useAuth();
  const [records, setRecords] = useState<PayrollWithEmployee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthLabel(new Date()));
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canReadAll = hasPermission("payroll.read_all") || hasRole("Super Admin");
  const canReadSelf = hasPermission("payroll.read_self");
  const canProcess = hasPermission("payroll.process") || hasRole("Super Admin");

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRecords = canReadAll
        ? await getAllPayroll({ month: selectedMonth, department: departmentFilter, status: statusFilter })
        : employeeId ? await getMyPayroll(employeeId) : [];
      setRecords(nextRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [canReadAll, employeeId, selectedMonth, departmentFilter, statusFilter]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const visibleRecords = useMemo(() => records
    .filter(({ record }) => record.month === selectedMonth)
    .filter(({ record }) => canReadAll || (canReadSelf && record.employeeId === employeeId))
    .filter(({ record, employee }) => {
      const matchesDepartment = departmentFilter === "All" || employee?.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      return matchesDepartment && matchesStatus;
    }), [records, selectedMonth, canReadAll, canReadSelf, employeeId, departmentFilter, statusFilter]);

  const employees = useMemo(() => {
    const map = new Map<string, PayrollEmployee>();
    records.forEach(({ employee, record }) => {
      if (employee) map.set(employee.id, employee);
      else map.set(record.employeeId, { id: record.employeeId, name: record.employeeId, salary: record.basicSalary });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const payrollCost = visibleRecords.reduce((sum, item) => sum + item.record.netSalary, 0);
  const totalLopDays = visibleRecords.reduce((sum, item) => sum + (item.record.lopDays || 0), 0);
  const draftCount = visibleRecords.filter((item) => item.record.status === "Draft").length;
  const processedCount = visibleRecords.filter((item) => item.record.status === "Processed").length;
  const paidCount = visibleRecords.filter((item) => item.record.status === "Paid").length;
  const departments = ["All", ...Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean)))];

  const handleGenerate = async () => {
    setSubmitting(true);
    setError("");
    try {
      await generatePayroll(selectedMonth);
      await safeAudit(profile, "payroll generated", "Payroll", selectedMonth, { month: selectedMonth });
      await safeNotification({ roleTarget: "HR Manager", title: "Payroll generated", message: `Payroll generated for ${selectedMonth}.`, type: "Info", module: "Payroll" });
      await safeNotification({ roleTarget: "Finance Manager", title: "Payroll generated", message: `Payroll generated for ${selectedMonth}.`, type: "Info", module: "Payroll" });
      setMessage(`Payroll generated for ${selectedMonth}. Draft records were updated; processed/paid records were preserved.`);
      await loadPayroll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate payroll.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcess = async () => {
    setSubmitting(true);
    setError("");
    try {
      await processPayroll(selectedMonth, profile?.name || "Payroll Admin");
      await safeAudit(profile, "payroll processed", "Payroll", selectedMonth, { month: selectedMonth });
      await safeNotification({ roleTarget: "Finance Manager", title: "Payroll processed", message: `Payroll processed for ${selectedMonth}.`, type: "Success", module: "Payroll" });
      setMessage(`Draft payroll processed for ${selectedMonth}.`);
      await loadPayroll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process payroll.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaid = async () => {
    setSubmitting(true);
    setError("");
    try {
      await markPayrollPaid(selectedMonth, profile?.name || "Payroll Admin");
      await safeAudit(profile, "payroll paid", "Payroll", selectedMonth, { month: selectedMonth });
      await safeNotification({ roleTarget: "HR Manager", title: "Payroll marked paid", message: `Payroll marked as paid for ${selectedMonth}.`, type: "Success", module: "Payroll" });
      setMessage(`Processed payroll marked as paid for ${selectedMonth}.`);
      await loadPayroll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark payroll as paid.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Selected Month Cost" value={inr(payrollCost)} icon={IndianRupee} tone="emerald" />
      <StatCard label="Total Employees" value={visibleRecords.length} icon={Users} tone="blue" />
      <StatCard label="Total LOP Days" value={totalLopDays} icon={Clock} tone="amber" />
      <StatCard label="Draft" value={draftCount} icon={FileText} tone="purple" />
      <StatCard label="Processed" value={processedCount} icon={CheckCircle2} tone="blue" />
      <StatCard label="Paid" value={paidCount} icon={Banknote} tone="emerald" />
    </div>

    <Card>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canReadAll ? "Payroll Operations" : "Employee Payslip"}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{canReadAll ? "Monthly Payroll Run" : "My Payroll Summary"}</h2>
          <p className="mt-1 text-sm text-slate-500">Payroll uses salary, allowances, deductions, approved unpaid leave, and unregularized absences.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" placeholder="May 2026" />
          {canReadAll && <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{departments.map((department) => <option key={department}>{department}</option>)}</select>}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All", "Draft", "Processed", "Paid"].map((status) => <option key={status}>{status}</option>)}</select>
          {canProcess && <Button className="h-10 rounded-xl" onClick={handleGenerate} disabled={submitting}>Generate</Button>}
          {canProcess && <Button className="h-10 rounded-xl bg-sky-600 hover:bg-sky-700" onClick={handleProcess} disabled={submitting}>Process</Button>}
          {canProcess && <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handlePaid} disabled={submitting}>Mark Paid</Button>}
        </div>
      </div>
    </Card>

    {!canReadAll && <PayslipCard item={visibleRecords[0]} />}

    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-black">{canReadAll ? "Payroll Records" : "My Payslip History"}</h3>
        <p className="text-sm text-slate-500">{canReadAll ? "Review payroll amounts by employee and month." : "Only your own payroll records are visible."}</p>
      </div>
      <PayrollTable records={visibleRecords} showEmployee={canReadAll} loading={loading} />
      {!visibleRecords.length && canProcess && !loading && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="font-black">No payroll records for {selectedMonth}.</p><p className="mt-1 text-sm text-slate-500">Generate payroll to create draft records for active employees.</p><Button className="mt-4" onClick={handleGenerate} disabled={submitting}>Generate Payroll</Button></div>}
    </Card>
  </div>;
}

function PayslipCard({ item }: { item?: PayrollWithEmployee }) {
  if (!item) return <Card><p className="font-black">No payslip available for the selected month.</p><p className="mt-1 text-sm text-slate-500">Payroll will appear here after HR or Finance generates it.</p></Card>;
  const { record: payroll, employee } = item;
  return <Card>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div><p className="text-xs font-bold text-slate-500">Employee</p><p className="font-black">{employee?.name}</p><p className="text-sm text-slate-500">{employee?.employeeCode} / {employee?.department}</p></div>
      <div><p className="text-xs font-bold text-slate-500">Month</p><p className="font-black">{payroll.month}</p><StatusBadge value={payroll.status} /></div>
      <div><p className="text-xs font-bold text-slate-500">Net Salary</p><p className="text-2xl font-black">{inr(payroll.netSalary)}</p></div>
      <div><p className="text-xs font-bold text-slate-500">Payment Date</p><p className="font-black">{payroll.paymentDate || "--"}</p></div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-5">
      <Mini label="Basic" value={inr(payroll.basicSalary)} />
      <Mini label="Allowances" value={inr(payroll.allowances)} />
      <Mini label="Deductions" value={inr(payroll.deductions)} />
      <Mini label="LOP Days" value={String(payroll.lopDays || 0)} />
      <Mini label="LOP Amount" value={inr(payroll.lop)} />
    </div>
  </Card>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function PayrollTable({ records, showEmployee, loading }: { records: PayrollWithEmployee[]; showEmployee: boolean; loading: boolean }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>{showEmployee && <><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th></>}<th className="px-4 py-3">Basic Salary</th><th className="px-4 py-3">Allowances</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">LOP Days</th><th className="px-4 py-3">LOP Amount</th><th className="px-4 py-3">Net Salary</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment Date</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {records.map(({ record, employee }) => <tr key={record.id} className="hover:bg-slate-50/70">
          {showEmployee && <><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employee?.name || record.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee?.department || "Unassigned"}</td></>}
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.basicSalary)}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.allowances)}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.deductions)}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.lopDays || 0}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.lop)}</td>
          <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{inr(record.netSalary)}</td>
          <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status} /></td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.paymentDate || "--"}</td>
        </tr>)}
        {!records.length && <tr><td colSpan={showEmployee ? 10 : 8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">{loading ? "Loading payroll records..." : "No payroll records found."}</td></tr>}
      </tbody>
    </table>
  </div>;
}

async function safeAudit(...args: Parameters<typeof logAudit>) {
  try {
    await logAudit(...args);
  } catch {
    // Audit logging must not block payroll actions.
  }
}

async function safeNotification(input: Parameters<typeof createAccountNotification>[0]) {
  try {
    await createAccountNotification(input);
  } catch {
    // Notification RLS or delivery issues should not block payroll actions.
  }
}
