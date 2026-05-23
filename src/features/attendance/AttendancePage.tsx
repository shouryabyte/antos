import { format, isSameMonth, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, Clock, FilePenLine, LogIn, LogOut, Timer, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FormDialog } from "../../components/common/FormDialog";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { attendanceStatus, calculateWorkingHours } from "../../lib/calculations";
import { runAntosAutomation } from "../../lib/automation";
import { createNotification } from "../../lib/notifications";
import { uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Attendance } from "../../types";

const today = () => format(new Date(), "yyyy-MM-dd");
const nowTime = () => format(new Date(), "HH:mm");

export function AttendancePage() {
  useEffect(() => {
    runAntosAutomation();
  }, []);
  const { employeeId, profile, hasPermission } = useAuth();
  const employees = useAppStore((s) => s.employees);
  const fallbackEmployeeId = employees[0]?.id;
  const currentEmployeeId = employeeId || fallbackEmployeeId;
  const employee = employees.find((item) => item.id === currentEmployeeId);
  const attendance = useAppStore((s) => s.attendance);
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const [workMode, setWorkMode] = useState<Attendance["workMode"]>("Hybrid");
  const [dateFilter, setDateFilter] = useState(today());
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [regularizing, setRegularizing] = useState<Attendance | null>(null);
  const [regularizationReason, setRegularizationReason] = useState("");
  const [correctedCheckIn, setCorrectedCheckIn] = useState("");
  const [correctedCheckOut, setCorrectedCheckOut] = useState("");
  const [reviewing, setReviewing] = useState<Attendance | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const canViewAll = hasPermission("attendance.read_all");
  const canRegularize = hasPermission("attendance.regularize");
  const canApprove = hasPermission("attendance.approve");

  const todayDate = today();
  const todayRecord = attendance.find((record) => record.employeeId === currentEmployeeId && record.date === todayDate);
  const todayStatus = todayRecord?.status || "Not Checked In";
  const monthlyRecords = useMemo(
    () => attendance
      .filter((record) => record.employeeId === currentEmployeeId && isSameMonth(parseISO(record.date), new Date()))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, currentEmployeeId]
  );
  const allAttendanceRows = useMemo(() => attendance
    .map((record) => ({ record, employee: employees.find((item) => item.id === record.employeeId) }))
    .filter(({ record, employee: rowEmployee }) => {
      const matchesDate = !dateFilter || record.date === dateFilter;
      const matchesDepartment = departmentFilter === "All" || rowEmployee?.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      return matchesDate && matchesDepartment && matchesStatus;
    })
    .sort((a, b) => `${b.record.date}${b.record.checkIn}`.localeCompare(`${a.record.date}${a.record.checkIn}`)),
    [attendance, employees, dateFilter, departmentFilter, statusFilter]
  );

  const presentDays = monthlyRecords.filter((record) => record.status === "Present" || record.status === "Late").length;
  const halfDays = monthlyRecords.filter((record) => record.status === "Half Day").length;
  const totalHours = monthlyRecords.reduce((sum, record) => sum + record.workingHours, 0);
  const shortHoursWarning = todayRecord?.checkOut && todayRecord.workingHours >= 4 && todayRecord.workingHours < 8;
  const filteredRows = attendance.filter((record) => record.date === dateFilter);
  const pendingRegularizations = useMemo(
    () => attendance
      .filter((record) => record.regularizationStatus === "Pending")
      .map((record) => ({ record, employee: employees.find((item) => item.id === record.employeeId) }))
      .sort((a, b) => b.record.date.localeCompare(a.record.date)),
    [attendance, employees]
  );
  const regularizableRecords = monthlyRecords.filter((record) => ["Late", "Half Day", "Absent"].includes(record.status));
  const departments = ["All", ...Array.from(new Set(employees.map((item) => item.department)))];
  const statuses: Array<"All" | Attendance["status"]> = ["All", "Not Checked In", "Present", "Late", "Half Day", "Absent", "Leave"];

  const handleCheckIn = () => {
    if (!currentEmployeeId || todayRecord?.checkIn) return;
    const checkIn = nowTime();
    addItem("attendance", {
      id: uid("att"),
      employeeId: currentEmployeeId,
      date: todayDate,
      checkIn,
      checkOut: "",
      workMode,
      status: attendanceStatus(checkIn, ""),
      workingHours: 0,
      regularizationStatus: "None",
      regularizationReason: ""
    });
  };

  const handleCheckOut = () => {
    if (!todayRecord || todayRecord.checkOut) return;
    const checkOut = nowTime();
    const workingHours = calculateWorkingHours(todayRecord.checkIn, checkOut);
    updateItem("attendance", todayRecord.id, {
      checkOut,
      workingHours,
      status: attendanceStatus(todayRecord.checkIn, checkOut)
    });
  };

  const openRegularization = (record: Attendance) => {
    setRegularizing(record);
    setRegularizationReason(record.regularizationReason || "");
    setCorrectedCheckIn(record.correctedCheckIn || "");
    setCorrectedCheckOut(record.correctedCheckOut || "");
  };

  const submitRegularization = () => {
    if (!regularizing || !regularizationReason.trim()) return;
    updateItem("attendance", regularizing.id, {
      regularizationStatus: "Pending",
      regularizationReason: regularizationReason.trim(),
      correctedCheckIn,
      correctedCheckOut,
      remarks: "Regularization requested"
    });
    createNotification({ roleTarget:"HR Manager", title:"Regularization request submitted", message:"An attendance regularization request is pending approval.", type:"Warning", relatedModule:"Attendance" });
    createNotification({ roleTarget:"Super Admin", title:"Regularization request submitted", message:"An attendance regularization request is pending approval.", type:"Warning", relatedModule:"Attendance" });
    setRegularizing(null);
    setRegularizationReason("");
    setCorrectedCheckIn("");
    setCorrectedCheckOut("");
  };

  const decideRegularization = (record: Attendance, decision: "Approved" | "Rejected") => {
    if (!canApprove) return;
    const hasCorrectedTimes = Boolean(record.correctedCheckIn || record.correctedCheckOut);
    const nextCheckIn = record.correctedCheckIn || record.checkIn;
    const nextCheckOut = record.correctedCheckOut || record.checkOut;
    const nextHours = hasCorrectedTimes ? calculateWorkingHours(nextCheckIn, nextCheckOut) : record.workingHours;
    updateItem("attendance", record.id, {
      checkIn: decision === "Approved" && hasCorrectedTimes ? nextCheckIn : record.checkIn,
      checkOut: decision === "Approved" && hasCorrectedTimes ? nextCheckOut : record.checkOut,
      workingHours: decision === "Approved" && hasCorrectedTimes ? nextHours : record.workingHours,
      status: decision === "Approved" ? (hasCorrectedTimes ? attendanceStatus(nextCheckIn, nextCheckOut) : "Present") : record.status,
      regularizationStatus: decision,
      approvedBy: profile?.name || "HR Manager",
      remarks: reviewRemarks.trim() || (decision === "Approved" ? "Regularization approved" : "Regularization rejected")
    });
    createNotification({ userId: userIdForEmployee(record.employeeId), title:`Regularization ${decision.toLowerCase()}`, message:`Your attendance regularization has been ${decision.toLowerCase()}.`, type: decision === "Approved" ? "Success" : "Danger", relatedModule:"Attendance" });
    setReviewing(null);
    setReviewRemarks("");
  };

  return <div className="space-y-6">
    {canViewAll && <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Present" value={filteredRows.filter((record) => record.status === "Present").length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Absent" value={filteredRows.filter((record) => record.status === "Absent").length} icon={XCircle} tone="red" />
        <StatCard label="Late" value={filteredRows.filter((record) => record.status === "Late").length} icon={Clock} tone="amber" />
        <StatCard label="Half Day" value={filteredRows.filter((record) => record.status === "Half Day").length} icon={Clock} tone="amber" />
        <StatCard label="Remote" value={filteredRows.filter((record) => record.workMode === "Remote").length} icon={CalendarDays} tone="blue" />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Attendance Overview</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">All Employee Attendance</h2>
            <p className="mt-1 text-sm text-slate-500">Filter attendance by date, department, and status.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input type="date" value={dateFilter} onChange={(event)=>setDateFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400" />
            <select value={departmentFilter} onChange={(event)=>setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">
              {departments.map((department)=><option key={department}>{department}</option>)}
            </select>
            <select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">
              {statuses.map((status)=><option key={status}>{status}</option>)}
            </select>
          </div>
        </div>
        <div className="table-scroll rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Check In</th><th className="px-4 py-3">Check Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allAttendanceRows.map(({ record, employee: rowEmployee })=><tr key={record.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{rowEmployee?.name || record.employeeId}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{rowEmployee?.department || "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.date}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workMode}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkIn || "--:--"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkOut || "--:--"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workingHours.toFixed(1)}h</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status}/></td>
              </tr>)}
              {!allAttendanceRows.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No attendance records match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">HR Approval Workflow</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Pending Regularizations</h2>
          <p className="mt-1 text-sm text-slate-500">Review attendance correction requests from employees and interns.</p>
        </div>
        <div className="table-scroll rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Original Status</th><th className="px-4 py-3">Original In</th><th className="px-4 py-3">Original Out</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Corrected In</th><th className="px-4 py-3">Corrected Out</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingRegularizations.map(({ record, employee: rowEmployee })=><tr key={record.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{rowEmployee?.name || record.employeeId}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{rowEmployee?.department || "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.date}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status}/></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkIn || "--:--"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkOut || "--:--"}</td>
                <td className="min-w-64 px-4 py-3 text-slate-600">{record.regularizationReason || "--"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.correctedCheckIn || "--:--"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.correctedCheckOut || "--:--"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {canApprove ? <Button className="h-9 px-3" onClick={()=>setReviewing(record)}>Review</Button> : <span className="text-xs font-semibold text-slate-400">No access</span>}
                </td>
              </tr>)}
              {!pendingRegularizations.length && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No pending regularization requests.</td></tr>}
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
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Today Attendance</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{profile?.name || employee?.name || "Employee"}</h2>
          <p className="mt-2 text-sm text-slate-600">{todayDate} - {employee?.department || "AntBox"} - {employee?.designation || "Team Member"}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge value={todayStatus} />
            {shortHoursWarning && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Present with short hours warning</span>}
            {todayRecord?.workMode && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{todayRecord.workMode}</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-3 block text-sm font-bold text-slate-700">Work mode</label>
          <select value={workMode} onChange={(event)=>setWorkMode(event.target.value as Attendance["workMode"])} disabled={Boolean(todayRecord?.checkIn)} className="mb-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400">
            <option>Office</option>
            <option>Remote</option>
            <option>Hybrid</option>
          </select>
          {!todayRecord?.checkIn && <Button className="h-12 w-full rounded-2xl" onClick={handleCheckIn}><LogIn size={18}/> Check In</Button>}
          {todayRecord?.checkIn && !todayRecord.checkOut && <Button className="h-12 w-full rounded-2xl" onClick={handleCheckOut}><LogOut size={18}/> Check Out</Button>}
          {todayRecord?.checkIn && todayRecord.checkOut && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Attendance completed for today. Working hours: {todayRecord.workingHours.toFixed(1)}h</div>}
        </div>
      </div>
    </Card>

    {canRegularize && regularizableRecords.length > 0 && <Card>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Attendance Correction</p>
        <h3 className="text-lg font-black">Regularization Requests</h3>
        <p className="text-sm text-slate-500">Late, half-day, and absent records can be submitted for review.</p>
      </div>
      <div className="grid gap-3">
        {regularizableRecords.map((record)=><div key={record.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-black">{record.date}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge value={record.status}/><StatusBadge value={record.regularizationStatus}/></div>
          </div>
          {record.regularizationStatus === "Pending" ? <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">Pending Regularization</span> : <Button className="h-10 rounded-xl" onClick={()=>openRegularization(record)}><FilePenLine size={16}/> Request Regularization</Button>}
        </div>)}
      </div>
    </Card>}

    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Present / Late Days" value={presentDays} icon={CalendarDays} tone="emerald" />
      <StatCard label="Half Days" value={halfDays} icon={Clock} tone="amber" />
      <StatCard label="Records This Month" value={monthlyRecords.length} icon={CalendarDays} tone="blue" />
    </div>

    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-black">Monthly Attendance</h3>
        <p className="text-sm text-slate-500">Your attendance records for the current month.</p>
      </div>
      <div className="table-scroll rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Check In</th><th className="px-4 py-3">Check Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {monthlyRecords.map((record)=><tr key={record.id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{record.date}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workMode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkIn || "--:--"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.checkOut || "--:--"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.workingHours.toFixed(1)}h</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={record.status}/></td>
            </tr>)}
            {!monthlyRecords.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No attendance records for this month yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>

    <FormDialog open={Boolean(regularizing)} title="Request Regularization" onClose={()=>setRegularizing(null)}>
      {regularizing && <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div><p className="text-xs font-bold text-slate-500">Attendance date</p><p className="font-black">{regularizing.date}</p></div>
          <div><p className="text-xs font-bold text-slate-500">Current status</p><div className="mt-1"><StatusBadge value={regularizing.status}/></div></div>
        </div>
        <label className="block text-sm font-bold text-slate-700">Reason
          <textarea rows={4} value={regularizationReason} onChange={(event)=>setRegularizationReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" placeholder="Explain why this attendance record needs correction." />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Corrected check-in
            <input type="time" value={correctedCheckIn} onChange={(event)=>setCorrectedCheckIn(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" />
          </label>
          <label className="text-sm font-bold text-slate-700">Corrected check-out
            <input type="time" value={correctedCheckOut} onChange={(event)=>setCorrectedCheckOut(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" />
          </label>
        </div>
        <div className="flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setRegularizing(null)}>Cancel</Button><Button disabled={!regularizationReason.trim()} onClick={submitRegularization}>Submit request</Button></div>
      </div>}
    </FormDialog>

    <FormDialog open={Boolean(reviewing)} title="Review Regularization" onClose={()=>setReviewing(null)}>
      {reviewing && <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div><p className="text-xs font-bold text-slate-500">Date</p><p className="font-black">{reviewing.date}</p></div>
          <div><p className="text-xs font-bold text-slate-500">Original status</p><div className="mt-1"><StatusBadge value={reviewing.status}/></div></div>
          <div><p className="text-xs font-bold text-slate-500">Original time</p><p className="font-black">{reviewing.checkIn || "--:--"} to {reviewing.checkOut || "--:--"}</p></div>
          <div><p className="text-xs font-bold text-slate-500">Corrected time</p><p className="font-black">{reviewing.correctedCheckIn || "--:--"} to {reviewing.correctedCheckOut || "--:--"}</p></div>
        </div>
        <div><p className="text-sm font-bold text-slate-700">Reason</p><p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">{reviewing.regularizationReason || "--"}</p></div>
        <label className="block text-sm font-bold text-slate-700">Remarks
          <textarea rows={3} value={reviewRemarks} onChange={(event)=>setReviewRemarks(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-400" placeholder="Optional HR remarks" />
        </label>
        <div className="flex justify-end gap-2"><Button className="bg-red-600 hover:bg-red-700" onClick={()=>decideRegularization(reviewing, "Rejected")}>Reject</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={()=>decideRegularization(reviewing, "Approved")}>Approve</Button></div>
      </div>}
    </FormDialog>
  </div>;
}

function userIdForEmployee(employeeId:string) {
  const map: Record<string,string> = { e1:"u-employee", e2:"u-pm", e3:"u-mentor", e5:"u-finance" };
  return map[employeeId] || "u-employee";
}
