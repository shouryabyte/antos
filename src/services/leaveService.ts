import { eachDayOfInterval, endOfMonth, format, isSameMonth, parse, parseISO, startOfMonth } from "date-fns";
import { supabase } from "../lib/supabase";
import type { Leave } from "../types";

export const leaveEntitlements: Record<Leave["leaveType"], number> = {
  Casual: 12,
  Sick: 8,
  Earned: 15,
  Unpaid: 0
};

export type LeaveEmployee = {
  id: string;
  name: string;
  department?: string;
  employeeCode?: string;
  designation?: string;
};

export type LeaveWithEmployee = {
  record: Leave;
  employee?: LeaveEmployee;
};

export type LeaveFilters = {
  employeeId?: string;
  department?: string;
  leaveType?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

type LeaveRow = {
  id: string;
  employee_id: string;
  leave_type: Leave["leaveType"];
  from_date: string;
  to_date: string;
  days: number | string;
  reason: string;
  status: Leave["status"] | null;
  manager_remarks: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_at: string | null;
  employees?: {
    id: string;
    name: string;
    department: string | null;
    employee_code: string | null;
    designation: string | null;
  } | null;
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Leave management requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export function calculateLeaveDays(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || new Date(toDate) < new Date(fromDate)) return 0;
  return eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) }).length;
}

export async function getMyLeaves(employeeId: string) {
  const { data, error } = await client()
    .from("leave_requests")
    .select("*, employees(id,name,department,employee_code,designation)")
    .eq("employee_id", employeeId)
    .order("from_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithEmployee(row as LeaveRow));
}

export async function getAllLeaves(filters: LeaveFilters = {}) {
  let query = client()
    .from("leave_requests")
    .select("*, employees(id,name,department,employee_code,designation)")
    .order("from_date", { ascending: false });

  if (filters.employeeId && filters.employeeId !== "All") query = query.eq("employee_id", filters.employeeId);
  if (filters.leaveType && filters.leaveType !== "All") query = query.eq("leave_type", filters.leaveType);
  if (filters.status && filters.status !== "All") query = query.eq("status", filters.status);
  if (filters.fromDate) query = query.gte("to_date", filters.fromDate);
  if (filters.toDate) query = query.lte("from_date", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || [])
    .map((row) => mapRowWithEmployee(row as LeaveRow))
    .filter(({ employee }) => !filters.department || filters.department === "All" || employee?.department === filters.department);
}

export async function applyLeave(input: {
  employeeId: string;
  leaveType: Leave["leaveType"];
  fromDate: string;
  toDate: string;
  reason: string;
}) {
  const overlap = await hasOverlappingLeave(input.employeeId, input.fromDate, input.toDate);
  if (overlap) throw new Error("A pending or approved leave already overlaps this date range.");

  const { data, error } = await client()
    .from("leave_requests")
    .insert({
      employee_id: input.employeeId,
      leave_type: input.leaveType,
      from_date: input.fromDate,
      to_date: input.toDate,
      days: calculateLeaveDays(input.fromDate, input.toDate),
      reason: input.reason,
      status: "Pending",
      manager_remarks: ""
    })
    .select("*, employees(id,name,department,employee_code,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as LeaveRow);
}

export async function approveLeave(leaveId: string, input: { approvedBy: string; remarks?: string }) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("leave_requests")
    .update({
      status: "Approved",
      manager_remarks: input.remarks || "Approved",
      approved_by: input.approvedBy,
      approved_at: now,
      rejected_by: null,
      rejected_at: null
    })
    .eq("id", leaveId)
    .select("*, employees(id,name,department,employee_code,designation)")
    .single();
  if (error) throw new Error(error.message);

  const leave = mapRowWithEmployee(data as LeaveRow);
  await syncApprovedLeaveToAttendance(leave.record);
  return leave;
}

export async function rejectLeave(leaveId: string, input: { rejectedBy: string; remarks?: string }) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("leave_requests")
    .update({
      status: "Rejected",
      manager_remarks: input.remarks || "Rejected",
      rejected_by: input.rejectedBy,
      rejected_at: now
    })
    .eq("id", leaveId)
    .select("*, employees(id,name,department,employee_code,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as LeaveRow);
}

export async function getLeaveBalance(employeeId: string) {
  const leaves = (await getMyLeaves(employeeId)).map(({ record }) => record);
  return (Object.keys(leaveEntitlements) as Leave["leaveType"][]).map((type) => {
    const used = leaves
      .filter((leave) => leave.leaveType === type && leave.status === "Approved")
      .reduce((sum, leave) => sum + leave.days, 0);
    const total = leaveEntitlements[type];
    return {
      type,
      total,
      used,
      available: type === "Unpaid" ? "Unlimited" : Math.max(0, total - used),
      lopDays: type === "Unpaid" ? used : 0
    };
  });
}

export async function getLOPDays(employeeId: string, month: string | Date) {
  const monthDate = typeof month === "string" ? parse(month, "MMMM yyyy", new Date()) : month;

  const { data: leaveRows, error: leaveError } = await client()
    .from("leave_requests")
    .select("from_date,to_date,days")
    .eq("employee_id", employeeId)
    .eq("status", "Approved")
    .eq("leave_type", "Unpaid");
  if (leaveError) throw new Error(leaveError.message);

  const unpaidLeaveDays = (leaveRows || [])
    .flatMap((leave) => eachDayOfInterval({ start: parseISO(leave.from_date), end: parseISO(leave.to_date) }))
    .filter((day) => isSameMonth(day, monthDate)).length;

  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const { data: attendanceRows, error: attendanceError } = await client()
    .from("attendance")
    .select("date,status,regularization_status")
    .eq("employee_id", employeeId)
    .eq("status", "Absent")
    .gte("date", monthStart)
    .lte("date", monthEnd);
  if (attendanceError) throw new Error(attendanceError.message);

  const unregularizedAbsences = (attendanceRows || [])
    .filter((record) => record.regularization_status !== "Approved")
    .length;

  return unpaidLeaveDays + unregularizedAbsences;
}

export async function syncApprovedLeaveToAttendance(leaveRequest: Leave) {
  if (leaveRequest.status !== "Approved") return;

  const rows = eachDayOfInterval({ start: parseISO(leaveRequest.fromDate), end: parseISO(leaveRequest.toDate) }).map((day) => ({
    employee_id: leaveRequest.employeeId,
    date: format(day, "yyyy-MM-dd"),
    check_in: null,
    check_out: null,
    work_mode: "Leave",
    status: "Leave",
    working_hours: 0,
    leave_request_id: leaveRequest.id,
    regularization_status: "None",
    remarks: `${leaveRequest.leaveType} leave approved`
  }));

  const { error } = await client()
    .from("attendance")
    .upsert(rows, { onConflict: "employee_id,date" });
  if (error) throw new Error(error.message);
}

export async function hasOverlappingLeave(employeeId: string, fromDate: string, toDate: string) {
  const { data, error } = await client()
    .from("leave_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .in("status", ["Pending", "Approved"])
    .lte("from_date", toDate)
    .gte("to_date", fromDate)
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function getProfileIdForEmployee(employeeId: string) {
  const { data, error } = await client()
    .from("profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) return undefined;
  return data?.id as string | undefined;
}

function mapRowWithEmployee(row: LeaveRow): LeaveWithEmployee {
  return {
    record: mapRow(row),
    employee: row.employees ? {
      id: row.employees.id,
      name: row.employees.name,
      department: row.employees.department || undefined,
      employeeCode: row.employees.employee_code || undefined,
      designation: row.employees.designation || undefined
    } : undefined
  };
}

function mapRow(row: LeaveRow): Leave {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    fromDate: row.from_date,
    toDate: row.to_date,
    days: Number(row.days || 0),
    reason: row.reason,
    status: row.status || "Pending",
    managerRemarks: row.manager_remarks || "",
    createdAt: row.created_at || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    rejectedBy: row.rejected_by || undefined,
    rejectedAt: row.rejected_at || undefined
  };
}
