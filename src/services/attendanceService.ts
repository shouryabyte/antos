import { attendanceStatus, calculateWorkingHours } from "../lib/calculations";
import { supabase } from "../lib/supabase";
import type { Attendance } from "../types";

export type AttendanceWithEmployee = {
  record: Attendance;
  employee?: {
    id: string;
    name: string;
    department?: string;
    designation?: string;
  };
};

export type AttendanceFilters = {
  date?: string;
  department?: string;
  status?: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_mode: Attendance["workMode"] | null;
  status: Attendance["status"] | null;
  working_hours: number | null;
  regularization_status: Attendance["regularizationStatus"] | null;
  regularization_reason: string | null;
  corrected_check_in: string | null;
  corrected_check_out: string | null;
  leave_request_id: string | null;
  approved_by: string | null;
  remarks: string | null;
  employees?: {
    id: string;
    name: string;
    department: string | null;
    designation: string | null;
  } | null;
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Attendance requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export function calculateAttendanceStatus(checkIn: string, checkOut: string) {
  return attendanceStatus(checkIn, checkOut);
}

export async function getMyAttendance(employeeId: string) {
  const { data, error } = await client()
    .from("attendance")
    .select("*, employees(id,name,department,designation)")
    .eq("employee_id", employeeId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapRowWithEmployee);
}

export async function getTodayAttendance(employeeId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client()
    .from("attendance")
    .select("*, employees(id,name,department,designation)")
    .eq("employee_id", employeeId)
    .eq("date", today)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRowWithEmployee(data as AttendanceRow) : null;
}

export async function getAllAttendance(filters: AttendanceFilters = {}) {
  let query = client()
    .from("attendance")
    .select("*, employees(id,name,department,designation)")
    .order("date", { ascending: false });

  if (filters.date) query = query.eq("date", filters.date);
  if (filters.status && filters.status !== "All") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || [])
    .map(mapRowWithEmployee)
    .filter(({ employee }) => !filters.department || filters.department === "All" || employee?.department === filters.department);
}

export async function checkIn(input: { employeeId: string; date: string; checkIn: string; workMode: Attendance["workMode"] }) {
  const { data, error } = await client()
    .from("attendance")
    .insert({
      employee_id: input.employeeId,
      date: input.date,
      check_in: input.checkIn,
      check_out: null,
      work_mode: input.workMode,
      status: calculateAttendanceStatus(input.checkIn, ""),
      working_hours: 0,
      regularization_status: "None"
    })
    .select("*, employees(id,name,department,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
}

export async function checkOut(attendanceId: string, input: { checkOut: string }) {
  const existing = await getAttendanceById(attendanceId);
  const checkIn = existing.record.checkIn;
  const workingHours = calculateWorkingHours(checkIn, input.checkOut);
  const { data, error } = await client()
    .from("attendance")
    .update({
      check_out: input.checkOut,
      working_hours: workingHours,
      status: calculateAttendanceStatus(checkIn, input.checkOut)
    })
    .eq("id", attendanceId)
    .select("*, employees(id,name,department,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
}

export async function requestRegularization(attendanceId: string, input: { reason: string; correctedCheckIn?: string; correctedCheckOut?: string }) {
  const { data, error } = await client()
    .from("attendance")
    .update({
      regularization_status: "Pending",
      regularization_reason: input.reason,
      corrected_check_in: input.correctedCheckIn || null,
      corrected_check_out: input.correctedCheckOut || null,
      remarks: "Regularization requested"
    })
    .eq("id", attendanceId)
    .select("*, employees(id,name,department,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
}

export async function approveRegularization(attendanceId: string, input: { approvedBy: string; remarks?: string }) {
  const existing = await getAttendanceById(attendanceId);
  const hasCorrectedTimes = Boolean(existing.record.correctedCheckIn || existing.record.correctedCheckOut);
  const nextCheckIn = existing.record.correctedCheckIn || existing.record.checkIn;
  const nextCheckOut = existing.record.correctedCheckOut || existing.record.checkOut;
  const nextHours = hasCorrectedTimes ? calculateWorkingHours(nextCheckIn, nextCheckOut) : existing.record.workingHours;
  const nextStatus = hasCorrectedTimes ? calculateAttendanceStatus(nextCheckIn, nextCheckOut) : "Present";

  const { data, error } = await client()
    .from("attendance")
    .update({
      check_in: hasCorrectedTimes ? nextCheckIn : existing.record.checkIn || null,
      check_out: hasCorrectedTimes ? nextCheckOut : existing.record.checkOut || null,
      working_hours: nextHours,
      status: nextStatus,
      regularization_status: "Approved",
      approved_by: input.approvedBy,
      remarks: input.remarks || "Regularization approved"
    })
    .eq("id", attendanceId)
    .select("*, employees(id,name,department,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
}

export async function rejectRegularization(attendanceId: string, input: { approvedBy: string; remarks?: string }) {
  const { data, error } = await client()
    .from("attendance")
    .update({
      regularization_status: "Rejected",
      approved_by: input.approvedBy,
      remarks: input.remarks || "Regularization rejected"
    })
    .eq("id", attendanceId)
    .select("*, employees(id,name,department,designation)")
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
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

async function getAttendanceById(attendanceId: string) {
  const { data, error } = await client()
    .from("attendance")
    .select("*, employees(id,name,department,designation)")
    .eq("id", attendanceId)
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithEmployee(data as AttendanceRow);
}

function mapRowWithEmployee(row: AttendanceRow): AttendanceWithEmployee {
  return {
    record: mapRow(row),
    employee: row.employees ? {
      id: row.employees.id,
      name: row.employees.name,
      department: row.employees.department || undefined,
      designation: row.employees.designation || undefined
    } : undefined
  };
}

function mapRow(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    checkIn: row.check_in || "",
    checkOut: row.check_out || "",
    workMode: row.work_mode || "Hybrid",
    status: row.status || "Not Checked In",
    workingHours: Number(row.working_hours || 0),
    regularizationStatus: row.regularization_status || "None",
    regularizationReason: row.regularization_reason || undefined,
    correctedCheckIn: row.corrected_check_in || undefined,
    correctedCheckOut: row.corrected_check_out || undefined,
    leaveRequestId: row.leave_request_id || undefined,
    approvedBy: row.approved_by || undefined,
    remarks: row.remarks || undefined
  };
}
