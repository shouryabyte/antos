import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameMonth, parseISO } from "date-fns";
import { CalendarCheck, Clock, FileCheck2, Plus, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { FormDialog } from "../../components/common/FormDialog";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { calculateLeaveDays, getLOPDays, getLeaveBalances, hasOverlappingLeave, syncApprovedLeaveToAttendance } from "../../lib/leaveUtils";
import { runAntosAutomation } from "../../lib/automation";
import { createNotification } from "../../lib/notifications";
import { uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { AppData } from "../../lib/storage";
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
  const { employeeId, profile, hasPermission } = useAuth();
  const store = useAppStore();
  const { employees, leaves, attendance, addItem, updateItem, replaceData } = store;
  const currentEmployeeId = employeeId || employees[0]?.id;
  const canViewAll = hasPermission("leave.read_all");
  const canApply = hasPermission("leave.apply");
  const canApprove = hasPermission("leave.approve");
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

  useEffect(() => {
    runAntosAutomation();
    replaceData(syncApprovedLeaveToAttendance(toAppData(useAppStore.getState())));
  }, [replaceData]);

  const visibleLeaves = useMemo(() => {
    const source = canViewAll ? leaves : leaves.filter((leave) => leave.employeeId === currentEmployeeId);
    return source
      .filter((leave) => {
        const employee = employees.find((item) => item.id === leave.employeeId);
        const matchesEmployee = employeeFilter === "All" || leave.employeeId === employeeFilter;
        const matchesDepartment = departmentFilter === "All" || employee?.department === departmentFilter;
        const matchesType = typeFilter === "All" || leave.leaveType === typeFilter;
        const matchesStatus = statusFilter === "All" || leave.status === statusFilter;
        const matchesFrom = !fromFilter || leave.toDate >= fromFilter;
        const matchesTo = !toFilter || leave.fromDate <= toFilter;
        return matchesEmployee && matchesDepartment && matchesType && matchesStatus && matchesFrom && matchesTo;
      })
      .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
  }, [canViewAll, leaves, currentEmployeeId, employees, employeeFilter, departmentFilter, typeFilter, statusFilter, fromFilter, toFilter]);

  const balances = useMemo(() => getLeaveBalances(leaves, currentEmployeeId || ""), [leaves, currentEmployeeId]);
  const pendingLeaves = visibleLeaves.filter((leave) => leave.status === "Pending");
  const approvedThisMonth = visibleLeaves.filter((leave) => leave.status === "Approved" && isSameMonth(parseISO(leave.fromDate), new Date()));
  const rejectedThisMonth = visibleLeaves.filter((leave) => leave.status === "Rejected" && isSameMonth(parseISO(leave.fromDate), new Date()));
  const lopDays = canViewAll
    ? leaves.filter((leave) => leave.status === "Approved" && leave.leaveType === "Unpaid").reduce((sum, leave) => sum + leave.days, 0)
    : getLOPDays(currentEmployeeId || "", new Date(), leaves, attendance);
  const departments = ["All", ...Array.from(new Set(employees.map((employee) => employee.department)))];

  const submitLeave = form.handleSubmit((values) => {
    if (!currentEmployeeId) return;
    if (hasOverlappingLeave(leaves, currentEmployeeId, values.fromDate, values.toDate)) {
      form.setError("fromDate", { message: "A pending or approved leave already overlaps this date range" });
      return;
    }
    const days = calculateLeaveDays(values.fromDate, values.toDate);
    addItem("leaves", {
      id: uid("leave"),
      employeeId: currentEmployeeId,
      leaveType: values.leaveType,
      fromDate: values.fromDate,
      toDate: values.toDate,
      days,
      reason: values.reason,
      status: "Pending",
      managerRemarks: "",
      createdAt: new Date().toISOString()
    });
    createNotification({ roleTarget:"HR Manager", title:"Leave request submitted", message:"A leave request is pending approval.", type:"Info", relatedModule:"Leave" });
    createNotification({ roleTarget:"Super Admin", title:"Leave request submitted", message:"A leave request is pending approval.", type:"Info", relatedModule:"Leave" });
    setMessage("Leave request submitted.");
    setApplyOpen(false);
    form.reset({ leaveType: "Casual", fromDate: values.fromDate, toDate: values.fromDate, reason: "" });
  });

  const decideLeave = () => {
    if (!review || !canApprove) return;
    const now = new Date().toISOString();
    const patch: Partial<Leave> = review.decision === "Approved"
      ? { status: "Approved", managerRemarks: remarks || "Approved", approvedBy: profile?.name || "HR Manager", approvedAt: now }
      : { status: "Rejected", managerRemarks: remarks || "Rejected", rejectedBy: profile?.name || "HR Manager", rejectedAt: now };
    const nextLeaves = leaves.map((leave) => leave.id === review.leave.id ? { ...leave, ...patch } : leave);
    const nextData = syncApprovedLeaveToAttendance({ ...toAppData(useAppStore.getState()), leaves: nextLeaves });
    replaceData(nextData);
    createNotification({ userId: userIdForEmployee(review.leave.employeeId), title:`Leave ${review.decision.toLowerCase()}`, message:`Your leave request has been ${review.decision.toLowerCase()}.`, type: review.decision === "Approved" ? "Success" : "Danger", relatedModule:"Leave" });
    setMessage(`Leave ${review.decision.toLowerCase()}.`);
    setReview(null);
    setRemarks("");
  };

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}

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
          {balances.map((balance)=><div key={balance.type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black">{balance.type === "Unpaid" ? "Unpaid Leave / LOP" : `${balance.type} Leave`}</p>
            <p className="mt-2 text-2xl font-black">{balance.type === "Unpaid" ? `${balance.lopDays} LOP` : balance.available}</p>
            <p className="mt-1 text-xs text-slate-500">Total {balance.total || "Unlimited"} · Used {balance.used}</p>
          </div>)}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canViewAll ? "HR Leave Operations" : "Employee Self Service"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{canViewAll ? "Leave Approval Center" : "My Leave Requests"}</h2>
            <p className="mt-2 text-sm text-slate-500">{canViewAll ? "Review pending leave requests and sync approved leave to attendance." : "Apply for leave and track approval status."}</p>
          </div>
          {canApply && <Button className="rounded-xl" onClick={()=>setApplyOpen(true)}><Plus size={16}/> Apply Leave</Button>}
        </div>
        {canViewAll && <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <select value={employeeFilter} onChange={(event)=>setEmployeeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">
            <option value="All">All employees</option>{employees.map((employee)=><option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <select value={departmentFilter} onChange={(event)=>setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{departments.map((department)=><option key={department}>{department}</option>)}</select>
          <select value={typeFilter} onChange={(event)=>setTypeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All","Casual","Sick","Earned","Unpaid"].map((type)=><option key={type}>{type}</option>)}</select>
          <select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{["All","Pending","Approved","Rejected"].map((status)=><option key={status}>{status}</option>)}</select>
          <input type="date" value={fromFilter} onChange={(event)=>setFromFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
          <input type="date" value={toFilter} onChange={(event)=>setToFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
        </div>}
      </Card>
    </div>

    {canViewAll && <Card>
      <h3 className="mb-4 text-lg font-black">Pending Leave Requests</h3>
      <LeaveTable leaves={pendingLeaves} employees={employees} canViewAll={canViewAll} canApprove={canApprove} onReview={(leave, decision)=>setReview({ leave, decision })} />
    </Card>}

    <Card>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canViewAll ? "All Leave Requests" : "My Leave Requests"}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Leave Requests</h2>
      </div>
      <LeaveTable leaves={visibleLeaves} employees={employees} canViewAll={canViewAll} canApprove={canApprove} onReview={(leave, decision)=>setReview({ leave, decision })} />
    </Card>

    <FormDialog open={applyOpen} title="Apply Leave" onClose={()=>setApplyOpen(false)}>
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
        <div className="flex justify-end gap-2 sm:col-span-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" type="button" onClick={()=>setApplyOpen(false)}>Cancel</Button><Button type="submit">Submit leave request</Button></div>
      </form>
    </FormDialog>

    <FormDialog open={Boolean(review)} title={`${review?.decision || "Review"} Leave`} onClose={()=>setReview(null)}>
      {review && <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-black">{employees.find((employee)=>employee.id===review.leave.employeeId)?.name || review.leave.employeeId}</p>
          <p className="mt-1 text-sm text-slate-600">{review.leave.leaveType} · {review.leave.fromDate} to {review.leave.toDate} · {review.leave.days} days</p>
          <p className="mt-3 text-sm text-slate-700">{review.leave.reason}</p>
        </div>
        <label className="block text-sm font-bold text-slate-700">Manager remarks
          <textarea rows={3} value={remarks} onChange={(event)=>setRemarks(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" />
        </label>
        <div className="flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setReview(null)}>Cancel</Button><Button className={review.decision === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={decideLeave}>{review.decision}</Button></div>
      </div>}
    </FormDialog>
  </div>;
}

function LeaveTable({ leaves, employees, canViewAll, canApprove, onReview }: { leaves: Leave[]; employees: { id:string; name:string; department:string }[]; canViewAll:boolean; canApprove:boolean; onReview:(leave:Leave, decision:"Approved"|"Rejected")=>void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>{canViewAll && <><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th></>}<th className="px-4 py-3">Leave Type</th><th className="px-4 py-3">From Date</th><th className="px-4 py-3">To Date</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Manager Remarks</th>{canViewAll && <th className="px-4 py-3">Actions</th>}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {leaves.map((leave) => {
          const employee = employees.find((item) => item.id === leave.employeeId);
          return <tr key={leave.id} className="hover:bg-slate-50/70">
            {canViewAll && <><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employee?.name || leave.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee?.department || "Unassigned"}</td></>}
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.leaveType}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.fromDate}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.toDate}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.days}</td>
            <td className="min-w-64 px-4 py-3 text-slate-600">{leave.reason}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={leave.status}/></td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{leave.managerRemarks || "--"}</td>
            {canViewAll && <td className="whitespace-nowrap px-4 py-3">{canApprove && leave.status === "Pending" ? <div className="flex gap-2"><button onClick={()=>onReview(leave, "Approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100">Approve</button><button onClick={()=>onReview(leave, "Rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100">Reject</button></div> : <span className="text-xs font-semibold text-slate-400">No action</span>}</td>}
          </tr>;
        })}
        {!leaves.length && <tr><td colSpan={canViewAll ? 10 : 7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No leave requests found.</td></tr>}
      </tbody>
    </table>
  </div>;
}

function toAppData(state: ReturnType<typeof useAppStore.getState>): AppData {
  const { role, setRole, addItem, updateItem, deleteItem, replaceData, reset, ...data } = state;
  void role; void setRole; void addItem; void updateItem; void deleteItem; void replaceData; void reset;
  return data;
}

function userIdForEmployee(employeeId:string) {
  const map: Record<string,string> = { e1:"u-employee", e2:"u-pm", e3:"u-mentor", e5:"u-finance" };
  return map[employeeId] || "u-employee";
}
