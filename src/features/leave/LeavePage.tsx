import { zodResolver } from "@hookform/resolvers/zod";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { CalendarCheck, Clock, FileCheck2, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { netSalary } from "../../lib/calculations";
import { inr, uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Leave } from "../../types";

const leaveEntitlement: Record<Leave["leaveType"], number> = {
  Casual: 12,
  Sick: 8,
  Earned: 18,
  Unpaid: 0
};

const schema = z.object({
  leaveType: z.enum(["Casual", "Sick", "Earned", "Unpaid"]),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().min(6, "Add a clear reason")
}).refine((value) => new Date(value.toDate) >= new Date(value.fromDate), {
  message: "To date must be after from date",
  path: ["toDate"]
});
type LeaveForm = z.infer<typeof schema>;

export function LeavePage() {
  const { employeeId, profile, hasPermission } = useAuth();
  const employees = useAppStore((s) => s.employees);
  const leaves = useAppStore((s) => s.leaves);
  const payroll = useAppStore((s) => s.payroll);
  const attendance = useAppStore((s) => s.attendance);
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const currentEmployeeId = employeeId || employees[0]?.id;
  const canViewAll = hasPermission("leave.read_all");
  const canApply = hasPermission("leave.apply");
  const canApprove = hasPermission("leave.approve");
  const visibleLeaves = canViewAll ? leaves : leaves.filter((leave) => leave.employeeId === currentEmployeeId);
  const form = useForm<LeaveForm>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: "Casual", fromDate: format(new Date(), "yyyy-MM-dd"), toDate: format(new Date(), "yyyy-MM-dd"), reason: "" }
  });

  const balances = useMemo(() => {
    return (Object.keys(leaveEntitlement) as Leave["leaveType"][]).map((type) => {
      const used = leaves
        .filter((leave) => leave.employeeId === currentEmployeeId && leave.leaveType === type && leave.status === "Approved")
        .reduce((sum, leave) => sum + leave.days, 0);
      return { type, entitlement: leaveEntitlement[type], used, remaining: type === "Unpaid" ? "LOP" : Math.max(0, leaveEntitlement[type] - used) };
    });
  }, [leaves, currentEmployeeId]);

  const pendingCount = visibleLeaves.filter((leave) => leave.status === "Pending").length;
  const approvedCount = visibleLeaves.filter((leave) => leave.status === "Approved").length;
  const rejectedCount = visibleLeaves.filter((leave) => leave.status === "Rejected").length;
  const lopAmount = payroll.filter((item) => item.employeeId === currentEmployeeId).reduce((sum, item) => sum + item.lop, 0);

  const submitLeave = form.handleSubmit((values) => {
    if (!currentEmployeeId) return;
    const days = eachDayOfInterval({ start: parseISO(values.fromDate), end: parseISO(values.toDate) }).length;
    addItem("leaves", {
      id: uid("leave"),
      employeeId: currentEmployeeId,
      leaveType: values.leaveType,
      fromDate: values.fromDate,
      toDate: values.toDate,
      days,
      reason: values.reason,
      status: "Pending",
      managerRemarks: ""
    });
    form.reset({ leaveType: "Casual", fromDate: values.fromDate, toDate: values.fromDate, reason: "" });
  });

  const decideLeave = (leave: Leave, status: "Approved" | "Rejected") => {
    const wasApproved = leave.status === "Approved";
    updateItem("leaves", leave.id, {
      status,
      managerRemarks: `${status} by ${profile?.name || "HR Manager"}`
    });

    if (status === "Approved") {
      markAttendanceAsLeave(leave);
      if (leave.leaveType === "Unpaid" && !wasApproved) updatePayrollLop(leave, 1);
    }
    if (status === "Rejected" && wasApproved && leave.leaveType === "Unpaid") updatePayrollLop(leave, -1);
  };

  const markAttendanceAsLeave = (leave: Leave) => {
    eachDayOfInterval({ start: parseISO(leave.fromDate), end: parseISO(leave.toDate) }).forEach((day) => {
      const date = format(day, "yyyy-MM-dd");
      const existing = attendance.find((record) => record.employeeId === leave.employeeId && record.date === date);
      const patch = { checkIn: "", checkOut: "", workingHours: 0, status: "Leave" as const, regularizationStatus: "None" as const, remarks: `${leave.leaveType} leave approved` };
      if (existing) updateItem("attendance", existing.id, patch);
      else addItem("attendance", { id: uid("att"), employeeId: leave.employeeId, date, workMode: "Hybrid", ...patch });
    });
  };

  const updatePayrollLop = (leave: Leave, direction: 1 | -1) => {
    const month = format(parseISO(leave.fromDate), "MMMM yyyy");
    const payrollRun = payroll.find((item) => item.employeeId === leave.employeeId && item.month === month);
    const employee = employees.find((item) => item.id === leave.employeeId);
    if (!payrollRun || !employee) return;
    const lopDelta = Math.round((employee.salary / 30) * leave.days) * direction;
    const lop = Math.max(0, payrollRun.lop + lopDelta);
    updateItem("payroll", payrollRun.id, {
      lop,
      netSalary: netSalary(payrollRun.basicSalary, payrollRun.allowances, payrollRun.deductions, lop)
    });
  };

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pending Requests" value={pendingCount} icon={Clock} tone="amber" />
      <StatCard label="Approved Leaves" value={approvedCount} icon={FileCheck2} tone="emerald" />
      <StatCard label="Rejected Leaves" value={rejectedCount} icon={CalendarCheck} tone="red" />
      <StatCard label="Current LOP Impact" value={inr(lopAmount)} icon={WalletCards} tone="purple" />
    </div>

    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <Card>
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Leave Balance</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">My Leave Wallet</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {balances.map((balance)=><div key={balance.type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black">{balance.type}</p>
            <p className="mt-2 text-2xl font-black">{balance.remaining}</p>
            <p className="mt-1 text-xs text-slate-500">Used {balance.used} of {balance.entitlement || "LOP"} days</p>
          </div>)}
        </div>
      </Card>

      {canApply && <Card>
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Employee Self Service</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Apply Leave</h2>
        <form onSubmit={submitLeave} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Leave type
            <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-400" {...form.register("leaveType")}>
              <option>Casual</option><option>Sick</option><option>Earned</option><option>Unpaid</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">From date
            <input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" {...form.register("fromDate")} />
          </label>
          <label className="text-sm font-bold text-slate-700">To date
            <input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" {...form.register("toDate")} />
            {form.formState.errors.toDate && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.toDate.message}</span>}
          </label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">Reason
            <textarea rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" {...form.register("reason")} />
            {form.formState.errors.reason && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.reason.message}</span>}
          </label>
          <div className="sm:col-span-2"><Button type="submit" className="h-11 rounded-xl">Submit leave request</Button></div>
        </form>
      </Card>}
    </div>

    <Card>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canViewAll ? "HR Approval Queue" : "My Requests"}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Leave Requests</h2>
      </div>
      <div className="table-scroll rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleLeaves.map((leave)=><tr key={leave.id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employees.find((item)=>item.id===leave.employeeId)?.name || leave.employeeId}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.leaveType}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.fromDate} to {leave.toDate}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.days}</td>
              <td className="min-w-64 px-4 py-3 text-slate-600">{leave.reason}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={leave.status}/></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.managerRemarks || "--"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {canApprove && leave.status === "Pending" ? <div className="flex gap-2">
                  <button onClick={()=>decideLeave(leave, "Approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100">Approve</button>
                  <button onClick={()=>decideLeave(leave, "Rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100">Reject</button>
                </div> : <span className="text-xs font-semibold text-slate-400">No action</span>}
              </td>
            </tr>)}
            {!visibleLeaves.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No leave requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}
