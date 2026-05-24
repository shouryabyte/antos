import { format, isSameMonth, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, Clock, FilePenLine, LogIn, LogOut, Timer, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { FormDialog } from "../../components/common/FormDialog";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createAccountNotification, logAudit } from "../../lib/onboardingAutomation";
import {
  approveRegularization,
  checkIn,
  checkOut,
  getAllAttendance,
  getMyAttendance,
  getProfileIdForEmployee,
  rejectRegularization,
  requestRegularization,
  type AttendanceWithEmployee
} from "../../services/attendanceService";
import type { Attendance } from "../../types";

const today = () => format(new Date(), "yyyy-MM-dd");
const nowTime = () => format(new Date(), "HH:mm");

export function AttendancePage() {
  const { employeeId, profile, hasPermission, hasRole } = useAuth();
  const [rows, setRows] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [workMode, setWorkMode] = useState<Attendance["workMode"]>("Hybrid");
  const [dateFilter, setDateFilter] = useState(today());
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [regularizing, setRegularizing] = useState<Attendance | null>(null);
  const [regularizationReason, setRegularizationReason] = useState("");
  const [correctedCheckIn, setCorrectedCheckIn] = useState("");
  const [correctedCheckOut, setCorrectedCheckOut] = useState("");
  const [reviewing, setReviewing] = useState<AttendanceWithEmployee | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const canViewAll = hasPermission("attendance.read_all") || hasRole("Super Admin");
  const canRegularize = hasPermission("attendance.regularize");
  const canApprove = hasPermission("attendance.approve") || hasRole("Super Admin");
  const todayDate = today();

  useEffect(() => {
    loadAttendance();
  }, [employeeId, canViewAll, dateFilter, departmentFilter, statusFilter]);

  async function loadAttendance() {
    setLoading(true);
    setError("");
    try {
      if (canViewAll) {
        setRows(await getAllAttendance({ date: dateFilter, department: departmentFilter, status: statusFilter }));
      } else if (employeeId) {
        setRows(await getMyAttendance(employeeId));
      } else {
        setRows([]);
        setError("Your profile is not linked to an employee record. Attendance cannot be loaded.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load attendance from Supabase.");
    } finally {
      setLoading(false);
    }
  }

  const records = rows.map((row) => row.record);
  const myRows = employeeId ? rows.filter((row) => row.record.employeeId === employeeId) : [];
  const employee = myRows[0]?.employee;
  const todayRecord = myRows.find((row) => row.record.date === todayDate)?.record;
  const todayStatus = todayRecord?.status || "Not Checked In";
  const monthlyRecords = useMemo(
    () => myRows.map((row) => row.record).filter((record) => isSameMonth(parseISO(record.date), new Date())).sort((a, b) => b.date.localeCompare(a.date)),
    [myRows]
  );
  const presentDays = monthlyRecords.filter((record) => record.status === "Present" || record.status === "Late").length;
  const halfDays = monthlyRecords.filter((record) => record.status === "Half Day").length;
  const totalHours = monthlyRecords.reduce((sum, record) => sum + record.workingHours, 0);
  const shortHoursWarning = todayRecord?.checkOut && todayRecord.workingHours >= 4 && todayRecord.workingHours < 8;
  const pendingRegularizations = rows.filter((row) => row.record.regularizationStatus === "Pending").sort((a, b) => b.record.date.localeCompare(a.record.date));
  const regularizableRecords = monthlyRecords.filter((record) => ["Late", "Half Day", "Absent"].includes(record.status));
  const departments = ["All", ...Array.from(new Set(rows.map((row) => row.employee?.department).filter(Boolean)))];
  const statuses: Array<"All" | Attendance["status"]> = ["All", "Not Checked In", "Present", "Late", "Half Day", "Absent", "Leave"];

  async function handleCheckIn() {
    if (!employeeId || todayRecord?.checkIn) return;
    try {
      const result = await checkIn({ employeeId, date: todayDate, checkIn: nowTime(), workMode });
      await logAudit(profile, "check-in", "Attendance", result.record.id, { employeeId, date: todayDate });
      setMessage("Checked in successfully.");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check in.");
    }
  }

  async function handleCheckOut() {
    if (!todayRecord || todayRecord.checkOut) return;
    try {
      const result = await checkOut(todayRecord.id, { checkOut: nowTime() });
      await logAudit(profile, "check-out", "Attendance", result.record.id, { employeeId, date: todayDate });
      setMessage("Checked out successfully.");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check out.");
    }
  }

  function openRegularization(record: Attendance) {
    setRegularizing(record);
    setRegularizationReason(record.regularizationReason || "");
    setCorrectedCheckIn(record.correctedCheckIn || "");
    setCorrectedCheckOut(record.correctedCheckOut || "");
  }

  async function submitRegularization() {
    if (!regularizing || !regularizationReason.trim()) return;
    try {
      const result = await requestRegularization(regularizing.id, {
        reason: regularizationReason.trim(),
        correctedCheckIn,
        correctedCheckOut
      });
      await logAudit(profile, "regularization request", "Attendance", regularizing.id, { date: regularizing.date });
      await createAccountNotification({ roleTarget: "HR Manager", title: "Regularization request submitted", message: "An attendance regularization request is pending approval.", type: "Warning", module: "Attendance" });
      await createAccountNotification({ roleTarget: "Super Admin", title: "Regularization request submitted", message: "An attendance regularization request is pending approval.", type: "Warning", module: "Attendance" });
      setMessage(`Regularization requested for ${result.record.date}.`);
      setRegularizing(null);
      setRegularizationReason("");
      setCorrectedCheckIn("");
      setCorrectedCheckOut("");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit regularization.");
    }
  }

  async function decideRegularization(row: AttendanceWithEmployee, decision: "Approved" | "Rejected") {
    if (!canApprove) return;
    try {
      const approvedBy = profile?.fullName || profile?.name || "Attendance Approver";
      const result = decision === "Approved"
        ? await approveRegularization(row.record.id, { approvedBy, remarks: reviewRemarks.trim() })
        : await rejectRegularization(row.record.id, { approvedBy, remarks: reviewRemarks.trim() });
      await logAudit(profile, decision === "Approved" ? "regularization approved" : "regularization rejected", "Attendance", row.record.id, { employeeId: row.record.employeeId });
      const targetUserId = await getProfileIdForEmployee(row.record.employeeId);
      await createAccountNotification({ userId: targetUserId, title: `Regularization ${decision.toLowerCase()}`, message: `Your attendance regularization has been ${decision.toLowerCase()}.`, type: decision === "Approved" ? "Success" : "Danger", module: "Attendance" });
      setMessage(`Regularization ${decision.toLowerCase()} for ${result.employee?.name || row.record.employeeId}.`);
      setReviewing(null);
      setReviewRemarks("");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update regularization.");
    }
  }

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading attendance from Supabase...</div>;

  return <div className="space-y-6">
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}

    {canViewAll && <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Present" value={records.filter((record) => record.status === "Present").length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Absent" value={records.filter((record) => record.status === "Absent").length} icon={XCircle} tone="red" />
        <StatCard label="Late" value={records.filter((record) => record.status === "Late").length} icon={Clock} tone="amber" />
        <StatCard label="Half Day" value={records.filter((record) => record.status === "Half Day").length} icon={Clock} tone="amber" />
        <StatCard label="Leave" value={records.filter((record) => record.status === "Leave").length} icon={CalendarDays} tone="blue" />
        <StatCard label="Pending Regularizations" value={pendingRegularizations.length} icon={FilePenLine} tone="purple" />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Attendance Overview</p><h2 className="mt-2 text-2xl font-black tracking-tight">All Employee Attendance</h2><p className="mt-1 text-sm text-slate-500">Supabase attendance records filtered by date, department, and status.</p></div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input type="date" value={dateFilter} onChange={(event)=>setDateFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
            <select value={departmentFilter} onChange={(event)=>setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{departments.map((department)=><option key={department}>{department}</option>)}</select>
            <select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">{statuses.map((status)=><option key={status}>{status}</option>)}</select>
          </div>
        </div>
        <AttendanceTable rows={rows} />
      </Card>

      <Card>
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">HR Approval Workflow</p><h2 className="mt-2 text-2xl font-black tracking-tight">Pending Regularizations</h2></div>
        <div className="table-scroll rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Original Status</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Corrected In</th><th className="px-4 py-3">Corrected Out</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingRegularizations.map((row)=><tr key={row.record.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{row.employee?.name || row.record.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.employee?.department || "Unassigned"}</td><td className="px-4 py-3">{row.record.date}</td><td className="px-4 py-3"><StatusBadge value={row.record.status}/></td><td className="min-w-64 px-4 py-3 text-slate-600">{row.record.regularizationReason || "--"}</td><td className="px-4 py-3">{row.record.correctedCheckIn || "--:--"}</td><td className="px-4 py-3">{row.record.correctedCheckOut || "--:--"}</td><td className="px-4 py-3">{canApprove ? <Button className="h-9 px-3" onClick={()=>setReviewing(row)}>Review</Button> : "No access"}</td></tr>)}
              {!pendingRegularizations.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No pending regularization requests.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </section>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Today Status" value={todayStatus} icon={Clock} tone={todayStatus === "Late" ? "amber" : todayStatus === "Half Day" ? "red" : "emerald"} />
      <StatCard label="Check In" value={todayRecord?.checkIn || "--:--"} icon={LogIn} tone="blue" />
      <StatCard label="Check Out" value={todayRecord?.checkOut || "--:--"} icon={LogOut} tone="purple" />
      <StatCard label="Month Hours" value={`${totalHours.toFixed(1)}h`} icon={Timer} tone="emerald" />
    </div>

    <Card>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Today Attendance</p><h2 className="mt-2 text-2xl font-black tracking-tight">{profile?.fullName || profile?.name || employee?.name || "Employee"}</h2><p className="mt-2 text-sm text-slate-600">{todayDate} - {employee?.department || "AntBox"} - {employee?.designation || "Team Member"}</p><div className="mt-4 flex flex-wrap items-center gap-3"><StatusBadge value={todayStatus} />{shortHoursWarning && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Present with short hours warning</span>}{todayRecord?.workMode && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{todayRecord.workMode}</span>}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-3 block text-sm font-bold text-slate-700">Work mode</label>
          <select value={workMode} onChange={(event)=>setWorkMode(event.target.value as Attendance["workMode"])} disabled={Boolean(todayRecord?.checkIn)} className="mb-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400"><option>Office</option><option>Remote</option><option>Hybrid</option></select>
          {!todayRecord?.checkIn && employeeId && <Button className="h-12 w-full rounded-2xl" onClick={handleCheckIn}><LogIn size={18}/> Check In</Button>}
          {todayRecord?.checkIn && !todayRecord.checkOut && <Button className="h-12 w-full rounded-2xl" onClick={handleCheckOut}><LogOut size={18}/> Check Out</Button>}
          {todayRecord?.checkIn && todayRecord.checkOut && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Attendance completed for today. Working hours: {todayRecord.workingHours.toFixed(1)}h</div>}
          {!employeeId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">No employee record is linked to this profile.</div>}
        </div>
      </div>
    </Card>

    {canRegularize && regularizableRecords.length > 0 && <Card>
      <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Attendance Correction</p><h3 className="text-lg font-black">Regularization Requests</h3><p className="text-sm text-slate-500">Late, half-day, and absent records can be submitted for review.</p></div>
      <div className="grid gap-3">{regularizableRecords.map((record)=><div key={record.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-black">{record.date}</p><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge value={record.status}/><StatusBadge value={record.regularizationStatus}/></div></div>{record.regularizationStatus === "Pending" ? <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">Pending Regularization</span> : <Button className="h-10 rounded-xl" onClick={()=>openRegularization(record)}><FilePenLine size={16}/> Request Regularization</Button>}</div>)}</div>
    </Card>}

    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Present / Late Days" value={presentDays} icon={CalendarDays} tone="emerald" /><StatCard label="Half Days" value={halfDays} icon={Clock} tone="amber" /><StatCard label="Records This Month" value={monthlyRecords.length} icon={CalendarDays} tone="blue" /></div>

    <Card><div className="mb-4"><h3 className="text-lg font-black">Monthly Attendance</h3><p className="text-sm text-slate-500">Your attendance records for the current month from Supabase.</p></div><AttendanceTable rows={monthlyRecords.map((record)=>({ record, employee }))} /></Card>

    <FormDialog open={Boolean(regularizing)} title="Request Regularization" onClose={()=>setRegularizing(null)}>
      {regularizing && <div className="space-y-4"><div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-slate-500">Attendance date</p><p className="font-black">{regularizing.date}</p></div><div><p className="text-xs font-bold text-slate-500">Current status</p><div className="mt-1"><StatusBadge value={regularizing.status}/></div></div></div><label className="block text-sm font-bold text-slate-700">Reason<textarea rows={4} value={regularizationReason} onChange={(event)=>setRegularizationReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" placeholder="Explain why this attendance record needs correction." /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Corrected check-in<input type="time" value={correctedCheckIn} onChange={(event)=>setCorrectedCheckIn(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" /></label><label className="text-sm font-bold text-slate-700">Corrected check-out<input type="time" value={correctedCheckOut} onChange={(event)=>setCorrectedCheckOut(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" /></label></div><div className="flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setRegularizing(null)}>Cancel</Button><Button disabled={!regularizationReason.trim()} onClick={submitRegularization}>Submit request</Button></div></div>}
    </FormDialog>

    <FormDialog open={Boolean(reviewing)} title="Review Regularization" onClose={()=>setReviewing(null)}>
      {reviewing && <div className="space-y-4"><div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-slate-500">Employee</p><p className="font-black">{reviewing.employee?.name || reviewing.record.employeeId}</p></div><div><p className="text-xs font-bold text-slate-500">Date</p><p className="font-black">{reviewing.record.date}</p></div><div><p className="text-xs font-bold text-slate-500">Original status</p><div className="mt-1"><StatusBadge value={reviewing.record.status}/></div></div><div><p className="text-xs font-bold text-slate-500">Corrected time</p><p className="font-black">{reviewing.record.correctedCheckIn || "--:--"} to {reviewing.record.correctedCheckOut || "--:--"}</p></div></div><div><p className="text-sm font-bold text-slate-700">Reason</p><p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">{reviewing.record.regularizationReason || "--"}</p></div><label className="block text-sm font-bold text-slate-700">Remarks<textarea rows={3} value={reviewRemarks} onChange={(event)=>setReviewRemarks(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" placeholder="Optional HR remarks" /></label><div className="flex justify-end gap-2"><Button className="bg-red-600 hover:bg-red-700" onClick={()=>decideRegularization(reviewing, "Rejected")}>Reject</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={()=>decideRegularization(reviewing, "Approved")}>Approve</Button></div></div>}
    </FormDialog>
  </div>;
}

function AttendanceTable({ rows }: { rows: AttendanceWithEmployee[] }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Check In</th><th className="px-4 py-3">Check Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Regularization</th></tr></thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map(({ record, employee })=><tr key={record.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{employee?.name || record.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee?.department || "Unassigned"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.date}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workMode}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkIn || "--:--"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkOut || "--:--"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workingHours.toFixed(1)}h</td><td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status}/></td><td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.regularizationStatus}/></td></tr>)}
        {!rows.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No attendance records found in Supabase.</td></tr>}
      </tbody>
    </table>
  </div>;
}
