import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameMonth, parseISO } from "date-fns";
import { CalendarCheck, Clock, FileCheck2, Plus, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { FormDialog } from "../../components/common/FormDialog";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createAccountNotification, logAudit } from "../../lib/onboardingAutomation";
import {
  applyLeave,
  approveLeave,
  calculateLeaveDays,
  getAllLeaves,
  getLeaveBalance,
  getLOPDays,
  getMyLeaves,
  getProfileIdForEmployee,
  rejectLeave,
  type LeaveEmployee,
  type LeaveWithEmployee
} from "../../services/leaveService";
import type { Leave } from "../../types";

const schema = z.object({
  leaveType: z.enum(["Casual", "Sick", "Earned", "Unpaid"]),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().min(1, "Reason is required")
}).refine((value) => new Date(value.toDate) >= new Date(value.fromDate), {
  message: "To date cannot be before from date",
  path: ["toDate"]
}).refine((value) => calculateLeaveDays(value.fromDate, value.toDate) >= 1, {
  message: "Leave must be at least 1 day",
  path: ["toDate"]
});

type LeaveForm = z.infer<typeof schema>;
type ReviewState = { leave: Leave; decision: "Approved" | "Rejected" };

export function LeavePage() {
  const { employeeId, profile, hasPermission, hasRole } = useAuth();
  const canViewAll = hasPermission("leave.read_all") || hasRole("Super Admin");
  const canApply = hasPermission("leave.apply");
  const canApprove = hasPermission("leave.approve") || hasRole("Super Admin");
  const [records, setRecords] = useState<LeaveWithEmployee[]>([]);
  const [balances, setBalances] = useState<Awaited<ReturnType<typeof getLeaveBalance>>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const form = useForm<LeaveForm>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: "Casual", fromDate: format(new Date(), "yyyy-MM-dd"), toDate: format(new Date(), "yyyy-MM-dd"), reason: "" }
  });

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRecords = canViewAll
        ? await getAllLeaves({ employeeId: employeeFilter, department: departmentFilter, leaveType: typeFilter, status: statusFilter, fromDate: fromFilter, toDate: toFilter })
        : employeeId ? await getMyLeaves(employeeId) : [];
      setRecords(nextRecords);
      if (employeeId) setBalances(await getLeaveBalance(employeeId));
      else setBalances([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [canViewAll, employeeId, employeeFilter, departmentFilter, typeFilter, statusFilter, fromFilter, toFilter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const employees = useMemo(() => {
    const map = new Map<string, LeaveEmployee>();
    records.forEach(({ employee, record }) => {
      if (employee) map.set(employee.id, employee);
      else map.set(record.employeeId, { id: record.employeeId, name: record.employeeId });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const visibleLeaves = useMemo(() => records.map(({ record }) => record), [records]);
  const pendingLeaves = visibleLeaves.filter((leave) => leave.status === "Pending");
  const approvedThisMonth = visibleLeaves.filter((leave) => leave.status === "Approved" && isSameMonth(parseISO(leave.fromDate), new Date()));
  const rejectedThisMonth = visibleLeaves.filter((leave) => leave.status === "Rejected" && isSameMonth(parseISO(leave.fromDate), new Date()));
  const lopDays = canViewAll
    ? visibleLeaves.filter((leave) => leave.status === "Approved" && leave.leaveType === "Unpaid").reduce((sum, leave) => sum + leave.days, 0)
    : balances.find((balance) => balance.type === "Unpaid")?.lopDays || 0;
  const departments = ["All", ...Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean)))];

  useEffect(() => {
    if (!canViewAll && employeeId) {
      getLOPDays(employeeId, new Date()).catch(() => undefined);
    }
  }, [canViewAll, employeeId]);

  const submitLeave = form.handleSubmit(async (values) => {
    if (!employeeId) {
      setError("Your profile is not linked to an employee record. Contact HR.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await applyLeave({ employeeId, ...values });
      await safeAudit(profile, "leave submitted", "Leave", created.record.id, { leaveType: values.leaveType, fromDate: values.fromDate, toDate: values.toDate });
      await safeNotification({ roleTarget: "HR Manager", title: "Leave request submitted", message: "A leave request is pending approval.", type: "Info", module: "Leave" });
      await safeNotification({ roleTarget: "Super Admin", title: "Leave request submitted", message: "A leave request is pending approval.", type: "Info", module: "Leave" });
      setMessage("Leave request submitted.");
      setApplyOpen(false);
      form.reset({ leaveType: "Casual", fromDate: values.fromDate, toDate: values.fromDate, reason: "" });
      await loadLeaves();
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Could not submit leave request.";
      setError(nextError);
      if (nextError.toLowerCase().includes("overlap")) form.setError("fromDate", { message: nextError });
    } finally {
      setSubmitting(false);
    }
  });

  const decideLeave = async () => {
    if (!review || !canApprove) return;
    setSubmitting(true);
    setError("");
    try {
      const decided = review.decision === "Approved"
        ? await approveLeave(review.leave.id, { approvedBy: profile?.name || "HR Manager", remarks })
        : await rejectLeave(review.leave.id, { rejectedBy: profile?.name || "HR Manager", remarks });
      const userId = await getProfileIdForEmployee(review.leave.employeeId);
      await safeNotification({
        userId,
        title: `Leave ${review.decision.toLowerCase()}`,
        message: `Your leave request has been ${review.decision.toLowerCase()}.`,
        type: review.decision === "Approved" ? "Success" : "Danger",
        module: "Leave"
      });
      await safeAudit(profile, `leave ${review.decision.toLowerCase()}`, "Leave", review.leave.id, { remarks }, review.leave, decided.record);
      setMessage(`Leave ${review.decision.toLowerCase()}.`);
      setReview(null);
      setRemarks("");
      await loadLeaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pending Requests" value={pendingLeaves.length} icon={Clock} tone="amber" />
      <StatCard label="Approved This Month" value={approvedThisMonth.length} icon={FileCheck2} tone="emerald" />
      <StatCard label="Rejected This Month" value={rejectedThisMonth.length} icon={CalendarCheck} tone="red" />
      <StatCard label="Unpaid Leave / LOP Days" value={lopDays} icon={WalletCards} tone="purple" />
    </div>

    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <Card>
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Leave Balance</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">My Leave Wallet</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {balances.map((balance) => <div key={balance.type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black">{balance.type === "Unpaid" ? "Unpaid Leave / LOP" : `${balance.type} Leave`}</p>
            <p className="mt-2 text-2xl font-black">{balance.type === "Unpaid" ? `${balance.lopDays} LOP` : balance.available}</p>
            <p className="mt-1 text-xs text-slate-500">Total {balance.total || "Unlimited"} / Used {balance.used}</p>
          </div>)}
          {!balances.length && <p className="text-sm font-semibold text-slate-500">Leave balances appear after your profile is linked to an employee record.</p>}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canViewAll ? "HR Leave Operations" : "Employee Self Service"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{canViewAll ? "Leave Approval Center" : "My Leave Requests"}</h2>
            <p className="mt-2 text-sm text-slate-500">{canViewAll ? "Review pending leave requests and sync approved leave to attendance." : "Apply for leave and track approval status."}</p>
          </div>
          {canApply && <Button className="rounded-xl" onClick={() => setApplyOpen(true)}><Plus size={16} /> Apply Leave</Button>}
        </div>
        {canViewAll && <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">
            <option value="All">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{departments.map((department) => <option key={department}>{department}</option>)}</select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All", "Casual", "Sick", "Earned", "Unpaid"].map((type) => <option key={type}>{type}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All", "Pending", "Approved", "Rejected"].map((status) => <option key={status}>{status}</option>)}</select>
          <input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
          <input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
        </div>}
      </Card>
    </div>

    {canViewAll && <Card>
      <h3 className="mb-4 text-lg font-black">Pending Leave Requests</h3>
      <LeaveTable records={records.filter(({ record }) => record.status === "Pending")} canViewAll={canViewAll} canApprove={canApprove} onReview={(leave, decision) => setReview({ leave, decision })} loading={loading} />
    </Card>}

    <Card>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canViewAll ? "All Leave Requests" : "My Leave Requests"}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Leave Requests</h2>
      </div>
      <LeaveTable records={records} canViewAll={canViewAll} canApprove={canApprove} onReview={(leave, decision) => setReview({ leave, decision })} loading={loading} />
    </Card>

    <FormDialog open={applyOpen} title="Apply Leave" onClose={() => setApplyOpen(false)}>
      <form onSubmit={submitLeave} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Leave type
          <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-400" {...form.register("leaveType")}>
            <option>Casual</option><option>Sick</option><option>Earned</option><option>Unpaid</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">From date
          <input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" {...form.register("fromDate")} />
          {form.formState.errors.fromDate && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.fromDate.message}</span>}
        </label>
        <label className="text-sm font-bold text-slate-700">To date
          <input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" {...form.register("toDate")} />
          {form.formState.errors.toDate && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.toDate.message}</span>}
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">Days: {calculateLeaveDays(form.watch("fromDate"), form.watch("toDate"))}</div>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Reason
          <textarea rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" {...form.register("reason")} />
          {form.formState.errors.reason && <span className="mt-1 block text-xs text-red-600">{form.formState.errors.reason.message}</span>}
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" type="button" onClick={() => setApplyOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit leave request"}</Button></div>
      </form>
    </FormDialog>

    <FormDialog open={Boolean(review)} title={`${review?.decision || "Review"} Leave`} onClose={() => setReview(null)}>
      {review && <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-black">{records.find(({ record }) => record.id === review.leave.id)?.employee?.name || review.leave.employeeId}</p>
          <p className="mt-1 text-sm text-slate-600">{review.leave.leaveType} / {review.leave.fromDate} to {review.leave.toDate} / {review.leave.days} days</p>
          <p className="mt-3 text-sm text-slate-700">{review.leave.reason}</p>
        </div>
        <label className="block text-sm font-bold text-slate-700">Manager remarks
          <textarea rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" />
        </label>
        <div className="flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={() => setReview(null)}>Cancel</Button><Button disabled={submitting} className={review.decision === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={decideLeave}>{submitting ? "Saving..." : review.decision}</Button></div>
      </div>}
    </FormDialog>
  </div>;
}

function LeaveTable({ records, canViewAll, canApprove, onReview, loading }: { records: LeaveWithEmployee[]; canViewAll: boolean; canApprove: boolean; onReview: (leave: Leave, decision: "Approved" | "Rejected") => void; loading: boolean }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>{canViewAll && <><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th></>}<th className="px-4 py-3">Leave Type</th><th className="px-4 py-3">From Date</th><th className="px-4 py-3">To Date</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Manager Remarks</th>{canViewAll && <th className="px-4 py-3">Actions</th>}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {records.map(({ record: leave, employee }) => <tr key={leave.id} className="hover:bg-slate-50/70">
          {canViewAll && <><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employee?.name || leave.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee?.department || "Unassigned"}</td></>}
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.leaveType}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.fromDate}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.toDate}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.days}</td>
          <td className="min-w-64 px-4 py-3 text-slate-600">{leave.reason}</td>
          <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={leave.status} /></td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.managerRemarks || "--"}</td>
          {canViewAll && <td className="whitespace-nowrap px-4 py-3">{canApprove && leave.status === "Pending" ? <div className="flex gap-2"><button onClick={() => onReview(leave, "Approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100">Approve</button><button onClick={() => onReview(leave, "Rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100">Reject</button></div> : <span className="text-xs font-semibold text-slate-400">No action</span>}</td>}
        </tr>)}
        {!records.length && <tr><td colSpan={canViewAll ? 10 : 7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">{loading ? "Loading leave requests..." : "No leave requests found."}</td></tr>}
      </tbody>
    </table>
  </div>;
}

async function safeAudit(...args: Parameters<typeof logAudit>) {
  try {
    await logAudit(...args);
  } catch {
    // Audit logging must not block the leave workflow.
  }
}

async function safeNotification(input: Parameters<typeof createAccountNotification>[0]) {
  try {
    await createAccountNotification(input);
  } catch {
    // Notification RLS or delivery issues should not block the leave workflow.
  }
}
