import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameWeek, parseISO } from "date-fns";
import { CheckCircle2, Clock, FileText, Plus, Timer, XCircle } from "lucide-react";
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
  approveTimesheet,
  getAllTimesheets,
  getMyTimesheets,
  getProfileIdForEmployee,
  getTimesheetProjects,
  getTimesheetTasks,
  rejectTimesheet,
  submitTimesheet,
  summarizeTimesheets,
  type TimesheetProject,
  type TimesheetTask,
  type TimesheetWithDetails
} from "../../services/timesheetService";
import type { Timesheet } from "../../types";

const schema = z.object({
  projectId: z.string().min(1, "Project is required"),
  taskId: z.string().min(1, "Task is required"),
  date: z.string().min(1, "Date is required"),
  hoursWorked: z.coerce.number().gt(0, "Hours must be greater than 0").lte(12, "Hours cannot exceed 12"),
  type: z.enum(["Billable", "Non-billable"]),
  description: z.string().min(1, "Description is required")
});

type TimesheetForm = z.infer<typeof schema>;
type ReviewState = { timesheet: TimesheetWithDetails; decision: "Approved" | "Rejected" };

export function TimesheetsPage() {
  const { employeeId, profile, hasPermission, hasRole } = useAuth();
  const canReadAll = hasPermission("timesheet.read_all") || hasRole("Super Admin");
  const canSubmit = hasPermission("timesheet.submit");
  const canApprove = hasPermission("timesheet.approve") || hasRole("Super Admin");

  const [records, setRecords] = useState<TimesheetWithDetails[]>([]);
  const [projects, setProjects] = useState<TimesheetProject[]>([]);
  const [tasks, setTasks] = useState<TimesheetTask[]>([]);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TimesheetForm>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: "", taskId: "", date: format(new Date(), "yyyy-MM-dd"), hoursWorked: 1, type: "Billable", description: "" }
  });

  const selectedProject = form.watch("projectId");
  const projectTasks = useMemo(() => tasks.filter((task) => task.projectId === selectedProject), [tasks, selectedProject]);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextRecords, nextProjects, nextTasks] = await Promise.all([
        canReadAll ? getAllTimesheets() : employeeId ? getMyTimesheets(employeeId) : Promise.resolve([]),
        getTimesheetProjects(),
        getTimesheetTasks()
      ]);
      setRecords(nextRecords);
      setProjects(nextProjects);
      setTasks(nextTasks);
      if (!canReadAll && !employeeId) setError("Your profile is not linked to an employee record. Timesheets cannot be loaded.");
      if (!form.getValues("projectId") && nextProjects[0]) form.setValue("projectId", nextProjects[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load timesheets from Supabase.");
    } finally {
      setLoading(false);
    }
  }, [canReadAll, employeeId, form]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  useEffect(() => {
    const currentTask = form.getValues("taskId");
    if (currentTask && !projectTasks.some((task) => task.id === currentTask)) {
      form.setValue("taskId", "");
    }
  }, [form, projectTasks]);

  const visibleTimesheets = useMemo(() => records.map(({ record }) => record), [records]);
  const pending = records.filter(({ record }) => record.approvalStatus === "Pending");
  const summary = summarizeTimesheets(visibleTimesheets);
  const hoursThisWeek = visibleTimesheets
    .filter((item) => isSameWeek(parseISO(item.date), new Date()))
    .reduce((sum, item) => sum + item.hoursWorked, 0);

  const submit = form.handleSubmit(async (values) => {
    if (!employeeId) {
      setError("Your profile is not linked to an employee record. Contact HR.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await submitTimesheet({ employeeId, ...values });
      await safeAudit(profile, "timesheet submitted", "Timesheets", created.record.id, { projectId: values.projectId, taskId: values.taskId, date: values.date });
      await safeNotification({ roleTarget: "Project Manager", title: "New timesheet pending approval", message: "A timesheet is pending approval.", type: "Warning", module: "Timesheets" });
      await safeNotification({ roleTarget: "Super Admin", title: "New timesheet pending approval", message: "A timesheet is pending approval.", type: "Warning", module: "Timesheets" });
      setMessage("Timesheet submitted for approval.");
      setOpen(false);
      form.reset({ projectId: values.projectId, taskId: "", date: values.date, hoursWorked: 1, type: "Billable", description: "" });
      await loadTimesheets();
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Could not submit timesheet.";
      setError(nextError);
      if (nextError.toLowerCase().includes("already exists")) form.setError("taskId", { message: nextError });
    } finally {
      setSubmitting(false);
    }
  });

  async function decide() {
    if (!review || !canApprove) return;
    setSubmitting(true);
    setError("");
    try {
      const reviewer = profile?.fullName || profile?.name || "Project Manager";
      const decided = review.decision === "Approved"
        ? await approveTimesheet(review.timesheet.record.id, { approvedBy: reviewer, remarks: remarks.trim() })
        : await rejectTimesheet(review.timesheet.record.id, { rejectedBy: reviewer, remarks: remarks.trim() });
      const userId = await getProfileIdForEmployee(review.timesheet.record.employeeId);
      await safeNotification({
        userId,
        title: `Timesheet ${review.decision.toLowerCase()}`,
        message: `Your timesheet has been ${review.decision.toLowerCase()}.`,
        type: review.decision === "Approved" ? "Success" : "Danger",
        module: "Timesheets"
      });
      await safeAudit(profile, `timesheet ${review.decision.toLowerCase()}`, "Timesheets", review.timesheet.record.id, { remarks }, review.timesheet.record, decided.record);
      setMessage(`Timesheet ${review.decision.toLowerCase()}.`);
      setReview(null);
      setRemarks("");
      await loadTimesheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update timesheet.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Pending Approvals" value={summary.pendingApprovals} icon={Clock} tone="amber" />
      <StatCard label="Approved Hours" value={summary.approvedHours} icon={CheckCircle2} tone="emerald" />
      <StatCard label="Rejected Hours" value={summary.rejectedHours} icon={XCircle} tone="red" />
      <StatCard label="Billable Hours" value={summary.billableHours} icon={Timer} tone="blue" />
      <StatCard label="Non-billable Hours" value={summary.nonBillableHours} icon={FileText} tone="purple" />
      <StatCard label="Utilization" value={`${summary.utilization}%`} icon={Clock} tone="emerald" />
    </div>

    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canReadAll ? "Project Manager Review" : "Employee Self Service"}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{canReadAll ? "Timesheet Approval Center" : "My Timesheets"}</h2>
          <p className="mt-1 text-sm text-slate-500">Track work effort against projects and tasks. This week: {hoursThisWeek}h.</p>
        </div>
        {canSubmit && <Button onClick={() => setOpen(true)}><Plus size={16} /> Submit Timesheet</Button>}
      </div>
    </Card>

    {canReadAll && <Card>
      <h3 className="mb-4 text-lg font-black">Pending Timesheets</h3>
      <TimesheetTable rows={pending} canApprove={canApprove} onReview={(timesheet, decision) => setReview({ timesheet, decision })} loading={loading} />
    </Card>}

    <Card>
      <h3 className="mb-4 text-lg font-black">{canReadAll ? "All Timesheets" : "My Timesheets"}</h3>
      <TimesheetTable rows={records} canApprove={canReadAll && canApprove} onReview={(timesheet, decision) => setReview({ timesheet, decision })} loading={loading} />
    </Card>

    <FormDialog open={open} title="Submit Timesheet" onClose={() => setOpen(false)}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Project
          <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("projectId")}>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          {form.formState.errors.projectId && <span className="text-xs text-red-600">{form.formState.errors.projectId.message}</span>}
        </label>
        <label className="text-sm font-bold text-slate-700">Task
          <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("taskId")}>
            <option value="">Select task</option>
            {projectTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          {form.formState.errors.taskId && <span className="text-xs text-red-600">{form.formState.errors.taskId.message}</span>}
        </label>
        <label className="text-sm font-bold text-slate-700">Date
          <input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("date")} />
          {form.formState.errors.date && <span className="text-xs text-red-600">{form.formState.errors.date.message}</span>}
        </label>
        <label className="text-sm font-bold text-slate-700">Hours
          <input type="number" step="0.5" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("hoursWorked")} />
          {form.formState.errors.hoursWorked && <span className="text-xs text-red-600">{form.formState.errors.hoursWorked.message}</span>}
        </label>
        <label className="text-sm font-bold text-slate-700">Type
          <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("type")}><option>Billable</option><option>Non-billable</option></select>
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Work description
          <textarea rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" {...form.register("description")} />
          {form.formState.errors.description && <span className="text-xs text-red-600">{form.formState.errors.description.message}</span>}
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" className="bg-slate-100 text-black hover:bg-slate-200" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
        </div>
      </form>
    </FormDialog>

    <FormDialog open={Boolean(review)} title={`${review?.decision || "Review"} Timesheet`} onClose={() => setReview(null)}>
      {review && <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-black">{review.timesheet.project?.name || review.timesheet.record.projectId}</p>
          <p className="mt-1 text-sm text-slate-600">{review.timesheet.task?.title || review.timesheet.record.taskId} / {review.timesheet.record.date} / {review.timesheet.record.hoursWorked}h</p>
          <p className="mt-3 text-sm text-slate-700">{review.timesheet.record.description}</p>
        </div>
        <label className="block text-sm font-bold text-slate-700">Manager remarks
          <textarea rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" />
        </label>
        <div className="flex justify-end gap-2">
          <Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={() => setReview(null)}>Cancel</Button>
          <Button disabled={submitting} className={review.decision === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={decide}>{submitting ? "Saving..." : review.decision}</Button>
        </div>
      </div>}
    </FormDialog>
  </div>;
}

function TimesheetTable({ rows, canApprove, onReview, loading }: { rows: TimesheetWithDetails[]; canApprove: boolean; onReview: (row: TimesheetWithDetails, decision: "Approved" | "Rejected") => void; loading: boolean }) {
  return <div className="table-scroll rounded-2xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Actions</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => <tr key={row.record.id} className="hover:bg-slate-50/70">
          <td className="whitespace-nowrap px-4 py-3 font-semibold">{row.employee?.name || row.record.employeeId}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.project?.name || row.record.projectId}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.task?.title || row.record.taskId}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.record.date}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.record.hoursWorked}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.record.type}</td>
          <td className="min-w-64 px-4 py-3 text-slate-600">{row.record.description}</td>
          <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={row.record.approvalStatus} /></td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.record.managerRemarks || "--"}</td>
          <td className="whitespace-nowrap px-4 py-3">{canApprove && row.record.approvalStatus === "Pending" ? <div className="flex gap-2"><button onClick={() => onReview(row, "Approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Approve</button><button onClick={() => onReview(row, "Rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">Reject</button></div> : <span className="text-xs font-semibold text-slate-400">No action</span>}</td>
        </tr>)}
        {!rows.length && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">{loading ? "Loading timesheets from Supabase..." : "No timesheets found."}</td></tr>}
      </tbody>
    </table>
  </div>;
}

async function safeAudit(...args: Parameters<typeof logAudit>) {
  try {
    await logAudit(...args);
  } catch {
    // Audit logging must not block the timesheet workflow.
  }
}

async function safeNotification(input: Parameters<typeof createAccountNotification>[0]) {
  try {
    await createAccountNotification(input);
  } catch {
    // Notification RLS or delivery issues should not block the timesheet workflow.
  }
}
