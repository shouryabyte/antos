import { format, isSameMonth, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, Clock, LogIn, LogOut, Timer, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { attendanceStatus, calculateWorkingHours } from "../../lib/calculations";
import { uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Attendance } from "../../types";

const today = () => format(new Date(), "yyyy-MM-dd");
const nowTime = () => format(new Date(), "HH:mm");

export function AttendancePage() {
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
  const canViewAll = hasPermission("attendance.read_all");

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
  </div>;
}
