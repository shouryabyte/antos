import { supabase } from "../lib/supabase";
import type { Project, Task, Timesheet } from "../types";

export type TimesheetEmployee = {
  id: string;
  name: string;
  department?: string;
  designation?: string;
};

export type TimesheetProject = Pick<Project, "id" | "name" | "projectCode" | "client" | "manager">;
export type TimesheetTask = Pick<Task, "id" | "projectId" | "title" | "assignedTo" | "status">;

export type TimesheetWithDetails = {
  record: Timesheet;
  employee?: TimesheetEmployee;
  project?: TimesheetProject;
  task?: TimesheetTask;
};

export type TimesheetFilters = {
  employeeId?: string;
  projectId?: string;
  taskId?: string;
  status?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
};

type TimesheetRow = {
  id: string;
  employee_id: string;
  project_id: string;
  task_id: string;
  date: string;
  hours_worked: number | string;
  type: Timesheet["type"] | null;
  description: string | null;
  approval_status: Timesheet["approvalStatus"] | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  manager_remarks: string | null;
  employees?: {
    id: string;
    name: string;
    department: string | null;
    designation: string | null;
  } | null;
  projects?: {
    id: string;
    project_code: string | null;
    name: string;
    client: string | null;
    manager: string | null;
  } | null;
  tasks?: {
    id: string;
    project_id: string;
    title: string;
    assigned_to: string | null;
    status: Task["status"] | null;
  } | null;
};

type ProjectRow = {
  id: string;
  project_code: string | null;
  name: string;
  client: string | null;
  manager: string | null;
};

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  assigned_to: string | null;
  status: Task["status"] | null;
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Timesheets require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export async function getMyTimesheets(employeeId: string) {
  const { data, error } = await baseTimesheetQuery()
    .eq("employee_id", employeeId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithDetails(row as TimesheetRow));
}

export async function getAllTimesheets(filters: TimesheetFilters = {}) {
  let query = baseTimesheetQuery().order("date", { ascending: false });

  if (filters.employeeId && filters.employeeId !== "All") query = query.eq("employee_id", filters.employeeId);
  if (filters.projectId && filters.projectId !== "All") query = query.eq("project_id", filters.projectId);
  if (filters.taskId && filters.taskId !== "All") query = query.eq("task_id", filters.taskId);
  if (filters.status && filters.status !== "All") query = query.eq("approval_status", filters.status);
  if (filters.type && filters.type !== "All") query = query.eq("type", filters.type);
  if (filters.fromDate) query = query.gte("date", filters.fromDate);
  if (filters.toDate) query = query.lte("date", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRowWithDetails(row as TimesheetRow));
}

export async function submitTimesheet(input: {
  employeeId: string;
  projectId: string;
  taskId: string;
  date: string;
  hoursWorked: number;
  type: Timesheet["type"];
  description: string;
}) {
  const duplicate = await hasDuplicateTimesheet(input.employeeId, input.taskId, input.date);
  if (duplicate) throw new Error("A pending or approved timesheet already exists for this task/date.");

  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("timesheets")
    .insert({
      employee_id: input.employeeId,
      project_id: input.projectId,
      task_id: input.taskId,
      date: input.date,
      hours_worked: input.hoursWorked,
      type: input.type,
      description: input.description,
      approval_status: "Pending",
      submitted_at: now,
      manager_remarks: ""
    })
    .select(timesheetSelect)
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithDetails(data as TimesheetRow);
}

export async function approveTimesheet(timesheetId: string, input: { approvedBy: string; remarks?: string }) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("timesheets")
    .update({
      approval_status: "Approved",
      approved_by: input.approvedBy,
      approved_at: now,
      rejected_by: null,
      rejected_at: null,
      manager_remarks: input.remarks || "Approved"
    })
    .eq("id", timesheetId)
    .eq("approval_status", "Pending")
    .select(timesheetSelect)
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithDetails(data as TimesheetRow);
}

export async function rejectTimesheet(timesheetId: string, input: { rejectedBy: string; remarks?: string }) {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("timesheets")
    .update({
      approval_status: "Rejected",
      rejected_by: input.rejectedBy,
      rejected_at: now,
      approved_by: null,
      approved_at: null,
      manager_remarks: input.remarks || "Rejected"
    })
    .eq("id", timesheetId)
    .eq("approval_status", "Pending")
    .select(timesheetSelect)
    .single();
  if (error) throw new Error(error.message);
  return mapRowWithDetails(data as TimesheetRow);
}

export async function getTimesheetSummary(filters: TimesheetFilters = {}) {
  const rows = await getAllTimesheets(filters);
  return summarizeTimesheets(rows.map(({ record }) => record));
}

export async function getUtilization(input: { employeeId?: string; projectId?: string }) {
  const rows = input.employeeId
    ? await getMyTimesheets(input.employeeId)
    : await getAllTimesheets({ projectId: input.projectId });
  return summarizeTimesheets(rows.map(({ record }) => record)).utilization;
}

export async function getTimesheetProjects() {
  const { data, error } = await client()
    .from("projects")
    .select("id,project_code,name,client,manager")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapProject(row as ProjectRow));
}

export async function getTimesheetTasks(projectId?: string) {
  let query = client()
    .from("tasks")
    .select("id,project_id,title,assigned_to,status")
    .order("title", { ascending: true });
  if (projectId && projectId !== "All") query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapTask(row as TaskRow));
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

export function summarizeTimesheets(timesheets: Timesheet[]) {
  const pendingApprovals = timesheets.filter((item) => item.approvalStatus === "Pending").length;
  const approved = timesheets.filter((item) => item.approvalStatus === "Approved");
  const rejected = timesheets.filter((item) => item.approvalStatus === "Rejected");
  const approvedHours = approved.reduce((sum, item) => sum + item.hoursWorked, 0);
  const rejectedHours = rejected.reduce((sum, item) => sum + item.hoursWorked, 0);
  const billableHours = approved.filter((item) => item.type === "Billable").reduce((sum, item) => sum + item.hoursWorked, 0);
  const nonBillableHours = approved.filter((item) => item.type === "Non-billable").reduce((sum, item) => sum + item.hoursWorked, 0);

  return {
    pendingApprovals,
    approvedHours,
    rejectedHours,
    billableHours,
    nonBillableHours,
    utilization: approvedHours ? Math.round((billableHours / approvedHours) * 100) : 0
  };
}

async function hasDuplicateTimesheet(employeeId: string, taskId: string, date: string) {
  const { data, error } = await client()
    .from("timesheets")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("task_id", taskId)
    .eq("date", date)
    .in("approval_status", ["Pending", "Approved"])
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

const timesheetSelect = "*, employees(id,name,department,designation), projects(id,project_code,name,client,manager), tasks(id,project_id,title,assigned_to,status)";

function baseTimesheetQuery() {
  return client().from("timesheets").select(timesheetSelect);
}

function mapRowWithDetails(row: TimesheetRow): TimesheetWithDetails {
  return {
    record: mapRow(row),
    employee: row.employees ? {
      id: row.employees.id,
      name: row.employees.name,
      department: row.employees.department || undefined,
      designation: row.employees.designation || undefined
    } : undefined,
    project: row.projects ? mapProject(row.projects) : undefined,
    task: row.tasks ? mapTask(row.tasks) : undefined
  };
}

function mapRow(row: TimesheetRow): Timesheet {
  return {
    id: row.id,
    employeeId: row.employee_id,
    projectId: row.project_id,
    taskId: row.task_id,
    date: row.date,
    hoursWorked: Number(row.hours_worked || 0),
    type: row.type || "Billable",
    description: row.description || "",
    approvalStatus: row.approval_status || "Pending",
    submittedAt: row.submitted_at || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    rejectedBy: row.rejected_by || undefined,
    rejectedAt: row.rejected_at || undefined,
    managerRemarks: row.manager_remarks || undefined
  };
}

function mapProject(row: ProjectRow): TimesheetProject {
  return {
    id: row.id,
    projectCode: row.project_code || "",
    name: row.name,
    client: row.client || "",
    manager: row.manager || ""
  };
}

function mapTask(row: TaskRow): TimesheetTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    assignedTo: row.assigned_to || "",
    status: row.status || "To Do"
  };
}
