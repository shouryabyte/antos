import { Banknote, CheckCircle2, Clock, FileText, IndianRupee, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { generatePayroll, markPayrollPaid, monthLabel, processPayroll } from "../../lib/payrollUtils";
import { createNotification } from "../../lib/notifications";
import { inr } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Payroll } from "../../types";

export function PayrollPage() {
  const { employeeId, profile, hasPermission } = useAuth();
  const { employees, leaves, attendance, payroll, replaceData } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(monthLabel(new Date()));
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");
  const canReadAll = hasPermission("payroll.read_all");
  const canReadSelf = hasPermission("payroll.read_self");
  const canProcess = hasPermission("payroll.process");
  const departments = ["All", ...Array.from(new Set(employees.map((employee) => employee.department)))];

  const visiblePayroll = useMemo(() => {
    return payroll
      .filter((record) => record.month === selectedMonth)
      .filter((record) => canReadAll || (canReadSelf && record.employeeId === employeeId))
      .filter((record) => {
        const employee = employees.find((item) => item.id === record.employeeId);
        const matchesDepartment = departmentFilter === "All" || employee?.department === departmentFilter;
        const matchesStatus = statusFilter === "All" || record.status === statusFilter;
        return matchesDepartment && matchesStatus;
      })
      .sort((a, b) => employeeName(a.employeeId, employees).localeCompare(employeeName(b.employeeId, employees)));
  }, [payroll, selectedMonth, canReadAll, canReadSelf, employeeId, departmentFilter, statusFilter, employees]);

  const payrollCost = visiblePayroll.reduce((sum, record) => sum + record.netSalary, 0);
  const totalLopDays = visiblePayroll.reduce((sum, record) => sum + (record.lopDays || 0), 0);
  const draftCount = visiblePayroll.filter((record) => record.status === "Draft").length;
  const processedCount = visiblePayroll.filter((record) => record.status === "Processed").length;
  const paidCount = visiblePayroll.filter((record) => record.status === "Paid").length;

  const updatePayroll = (nextPayroll: Payroll[], nextMessage: string) => {
    replaceData({ ...toAppData(useAppStore.getState()), payroll: nextPayroll });
    setMessage(nextMessage);
  };

  const handleGenerate = () => {
    const nextPayroll = generatePayroll(payroll, employees, leaves, attendance, selectedMonth);
    updatePayroll(nextPayroll, `Payroll generated for ${selectedMonth}. Draft records were updated; processed/paid records were preserved.`);
  };

  const handleProcess = () => {
    updatePayroll(processPayroll(payroll, selectedMonth, profile?.name || "Payroll Admin"), `Draft payroll processed for ${selectedMonth}.`);
    createNotification({ roleTarget:"Finance Manager", title:"Payroll processed", message:`Payroll processed for ${selectedMonth}.`, type:"Success", relatedModule:"Payroll" });
  };
  const handlePaid = () => updatePayroll(markPayrollPaid(payroll, selectedMonth, profile?.name || "Payroll Admin"), `Processed payroll marked as paid for ${selectedMonth}.`);

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Selected Month Cost" value={inr(payrollCost)} icon={IndianRupee} tone="emerald" />
      <StatCard label="Total Employees" value={visiblePayroll.length} icon={Users} tone="blue" />
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
          <input value={selectedMonth} onChange={(event)=>setSelectedMonth(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" placeholder="May 2026" />
          {canReadAll && <select value={departmentFilter} onChange={(event)=>setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{departments.map((department)=><option key={department}>{department}</option>)}</select>}
          <select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All","Draft","Processed","Paid"].map((status)=><option key={status}>{status}</option>)}</select>
          {canProcess && <Button className="h-10 rounded-xl" onClick={handleGenerate}>Generate</Button>}
          {canProcess && <Button className="h-10 rounded-xl bg-sky-600 hover:bg-sky-700" onClick={handleProcess}>Process</Button>}
          {canProcess && <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handlePaid}>Mark Paid</Button>}
        </div>
      </div>
    </Card>

    {!canReadAll && <PayslipCard payroll={visiblePayroll[0]} employee={employees.find((item)=>item.id === employeeId)} />}

    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-black">{canReadAll ? "Payroll Records" : "My Payslip History"}</h3>
        <p className="text-sm text-slate-500">{canReadAll ? "Review payroll amounts by employee and month." : "Only your own payroll records are visible."}</p>
      </div>
      <PayrollTable payroll={visiblePayroll} employees={employees} showEmployee={canReadAll} />
      {!visiblePayroll.length && canProcess && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="font-black">No payroll records for {selectedMonth}.</p><p className="mt-1 text-sm text-slate-500">Generate payroll to create draft records for active employees.</p><Button className="mt-4" onClick={handleGenerate}>Generate Payroll</Button></div>}
    </Card>
  </div>;
}

function PayslipCard({ payroll, employee }: { payroll?: Payroll; employee?: { name:string; employeeCode:string; department:string } }) {
  if (!payroll) return <Card><p className="font-black">No payslip available for the selected month.</p><p className="mt-1 text-sm text-slate-500">Payroll will appear here after HR or Finance generates it.</p></Card>;
  return <Card>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div><p className="text-xs font-bold text-slate-500">Employee</p><p className="font-black">{employee?.name}</p><p className="text-sm text-slate-500">{employee?.employeeCode} · {employee?.department}</p></div>
      <div><p className="text-xs font-bold text-slate-500">Month</p><p className="font-black">{payroll.month}</p><StatusBadge value={payroll.status}/></div>
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

function Mini({ label, value }: { label:string; value:string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function PayrollTable({ payroll, employees, showEmployee }: { payroll: Payroll[]; employees: { id:string; name:string; department:string }[]; showEmployee:boolean }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>{showEmployee && <><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th></>}<th className="px-4 py-3">Basic Salary</th><th className="px-4 py-3">Allowances</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">LOP Days</th><th className="px-4 py-3">LOP Amount</th><th className="px-4 py-3">Net Salary</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment Date</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {payroll.map((record) => {
          const employee = employees.find((item) => item.id === record.employeeId);
          return <tr key={record.id} className="hover:bg-slate-50/70">
            {showEmployee && <><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employee?.name || record.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee?.department || "Unassigned"}</td></>}
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.basicSalary)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.allowances)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.deductions)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.lopDays || 0}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inr(record.lop)}</td>
            <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{inr(record.netSalary)}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status}/></td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.paymentDate || "--"}</td>
          </tr>;
        })}
        {!payroll.length && <tr><td colSpan={showEmployee ? 10 : 8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No payroll records found.</td></tr>}
      </tbody>
    </table>
  </div>;
}

function employeeName(id: string, employees: { id:string; name:string }[]) {
  return employees.find((employee) => employee.id === id)?.name || id;
}

function toAppData(state: ReturnType<typeof useAppStore.getState>) {
  const { role, setRole, addItem, updateItem, deleteItem, replaceData, reset, ...data } = state;
  void role; void setRole; void addItem; void updateItem; void deleteItem; void replaceData; void reset;
  return data;
}
