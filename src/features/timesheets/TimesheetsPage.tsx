import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameWeek, parseISO } from "date-fns";
import { CheckCircle2, Clock, FileText, Plus, Timer, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { FormDialog } from "../../components/common/FormDialog";
import { StatusBadge } from "../../components/common/StatusBadge";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createNotification } from "../../lib/notifications";
import { runAntosAutomation } from "../../lib/automation";
import { hasDuplicateTimesheet, utilizationPercentage } from "../../lib/timesheetUtils";
import { uid } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
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
type ReviewState = { timesheet: Timesheet; decision: "Approved" | "Rejected" };

export function TimesheetsPage() {
  useEffect(() => {
    runAntosAutomation();
  }, []);
  const { employeeId, profile, hasPermission } = useAuth();
  const { employees, projects, tasks, timesheets, addItem, updateItem } = useAppStore();
  const currentEmployeeId = employeeId || employees[0]?.id;
  const canReadAll = hasPermission("timesheet.read_all");
  const canSubmit = hasPermission("timesheet.submit");
  const canApprove = hasPermission("timesheet.approve");
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const form = useForm<TimesheetForm>({ resolver: zodResolver(schema), defaultValues: { projectId: projects[0]?.id || "", taskId: "", date: format(new Date(), "yyyy-MM-dd"), hoursWorked: 1, type: "Billable", description: "" } });
  const selectedProject = form.watch("projectId");
  const projectTasks = tasks.filter((task) => task.projectId === selectedProject);
  const visibleTimesheets = useMemo(() => canReadAll ? timesheets : timesheets.filter((item) => item.employeeId === currentEmployeeId), [canReadAll, timesheets, currentEmployeeId]);
  const pending = visibleTimesheets.filter((item) => item.approvalStatus === "Pending");
  const approved = visibleTimesheets.filter((item) => item.approvalStatus === "Approved");
  const rejected = visibleTimesheets.filter((item) => item.approvalStatus === "Rejected");
  const hoursThisWeek = visibleTimesheets.filter((item) => isSameWeek(parseISO(item.date), new Date())).reduce((sum, item) => sum + item.hoursWorked, 0);
  const billable = approved.filter((item) => item.type === "Billable").reduce((sum, item) => sum + item.hoursWorked, 0);
  const nonBillable = approved.filter((item) => item.type === "Non-billable").reduce((sum, item) => sum + item.hoursWorked, 0);
  const util = utilizationPercentage(visibleTimesheets);

  const submitTimesheet = form.handleSubmit((values) => {
    if (!currentEmployeeId) return;
    if (hasDuplicateTimesheet(timesheets, currentEmployeeId, values.taskId, values.date)) {
      form.setError("taskId", { message: "A pending or approved timesheet already exists for this task/date" });
      return;
    }
    addItem("timesheets", {
      id: uid("ts"),
      employeeId: currentEmployeeId,
      projectId: values.projectId,
      taskId: values.taskId,
      date: values.date,
      hoursWorked: values.hoursWorked,
      type: values.type,
      description: values.description,
      approvalStatus: "Pending",
      submittedAt: new Date().toISOString()
    });
    createNotification({ roleTarget:"Project Manager", title:"New timesheet pending approval", message:"New timesheet pending approval.", type:"Warning", relatedModule:"Timesheets" });
    createNotification({ roleTarget:"Super Admin", title:"New timesheet pending approval", message:"New timesheet pending approval.", type:"Warning", relatedModule:"Timesheets" });
    setMessage("Timesheet submitted for approval.");
    setOpen(false);
    form.reset({ projectId: values.projectId, taskId: "", date: values.date, hoursWorked: 1, type: "Billable", description: "" });
  });

  const decide = () => {
    if (!review || !canApprove) return;
    const now = new Date().toISOString();
    updateItem("timesheets", review.timesheet.id, review.decision === "Approved"
      ? { approvalStatus:"Approved", approvedBy: profile?.name || "Project Manager", approvedAt: now, managerRemarks: remarks }
      : { approvalStatus:"Rejected", rejectedBy: profile?.name || "Project Manager", rejectedAt: now, managerRemarks: remarks }
    );
    createNotification({ userId: userIdForEmployee(review.timesheet.employeeId), title:`Timesheet ${review.decision.toLowerCase()}`, message:`Your timesheet has been ${review.decision.toLowerCase()}.`, type: review.decision === "Approved" ? "Success" : "Danger", relatedModule:"Timesheets" });
    setMessage(`Timesheet ${review.decision.toLowerCase()}.`);
    setReview(null);
    setRemarks("");
  };

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Hours This Week" value={hoursThisWeek} icon={Timer} tone="blue" />
      <StatCard label="Billable Hours" value={billable} icon={Clock} tone="emerald" />
      <StatCard label="Non-billable Hours" value={nonBillable} icon={FileText} tone="purple" />
      <StatCard label="Pending" value={pending.length} icon={Clock} tone="amber" />
      <StatCard label="Approved Hours" value={approved.reduce((s,t)=>s+t.hoursWorked,0)} icon={CheckCircle2} tone="emerald" />
      <StatCard label={canReadAll ? "Utilization" : "Rejected"} value={canReadAll ? `${util}%` : rejected.length} icon={XCircle} tone={canReadAll ? "blue" : "red"} />
    </div>

    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{canReadAll ? "Project Manager Review" : "Employee Self Service"}</p><h2 className="mt-2 text-2xl font-black tracking-tight">{canReadAll ? "Timesheet Approval Center" : "My Timesheets"}</h2><p className="mt-1 text-sm text-slate-500">Track work effort against projects and tasks.</p></div>
        {canSubmit && <Button onClick={()=>setOpen(true)}><Plus size={16}/> Submit Timesheet</Button>}
      </div>
    </Card>

    {canReadAll && <Card><h3 className="mb-4 text-lg font-black">Pending Timesheets</h3><TimesheetTable rows={pending} employees={employees} projects={projects} tasks={tasks} canApprove={canApprove} onReview={(timesheet, decision)=>setReview({ timesheet, decision })} /></Card>}
    <Card><h3 className="mb-4 text-lg font-black">{canReadAll ? "All Timesheets" : "My Timesheets"}</h3><TimesheetTable rows={visibleTimesheets} employees={employees} projects={projects} tasks={tasks} canApprove={canReadAll && canApprove} onReview={(timesheet, decision)=>setReview({ timesheet, decision })} /></Card>

    <FormDialog open={open} title="Submit Timesheet" onClose={()=>setOpen(false)}>
      <form onSubmit={submitTimesheet} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Project<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("projectId")}><option value="">Select project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">Task<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("taskId")}><option value="">Select task</option>{projectTasks.map((task)=><option key={task.id} value={task.id}>{task.title}</option>)}</select>{form.formState.errors.taskId && <span className="text-xs text-red-600">{form.formState.errors.taskId.message}</span>}</label>
        <label className="text-sm font-bold text-slate-700">Date<input type="date" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("date")} /></label>
        <label className="text-sm font-bold text-slate-700">Hours<input type="number" step="0.5" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("hoursWorked")} />{form.formState.errors.hoursWorked && <span className="text-xs text-red-600">{form.formState.errors.hoursWorked.message}</span>}</label>
        <label className="text-sm font-bold text-slate-700">Type<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" {...form.register("type")}><option>Billable</option><option>Non-billable</option></select></label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Work description<textarea rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" {...form.register("description")} />{form.formState.errors.description && <span className="text-xs text-red-600">{form.formState.errors.description.message}</span>}</label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit">Submit</Button></div>
      </form>
    </FormDialog>

    <FormDialog open={Boolean(review)} title={`${review?.decision || "Review"} Timesheet`} onClose={()=>setReview(null)}>
      {review && <div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-black">{projectName(review.timesheet.projectId, projects)}</p><p className="mt-1 text-sm text-slate-600">{taskTitle(review.timesheet.taskId, tasks)} · {review.timesheet.date} · {review.timesheet.hoursWorked}h</p><p className="mt-3 text-sm text-slate-700">{review.timesheet.description}</p></div><label className="block text-sm font-bold text-slate-700">Manager remarks<textarea rows={3} value={remarks} onChange={(e)=>setRemarks(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" /></label><div className="flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setReview(null)}>Cancel</Button><Button className={review.decision === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} onClick={decide}>{review.decision}</Button></div></div>}
    </FormDialog>
  </div>;
}

function TimesheetTable({ rows, employees, projects, tasks, canApprove, onReview }: { rows:Timesheet[]; employees:{id:string;name:string}[]; projects:{id:string;name:string}[]; tasks:{id:string;title:string}[]; canApprove:boolean; onReview:(row:Timesheet, decision:"Approved"|"Rejected")=>void }) {
  return <div className="table-scroll rounded-2xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map((row)=><tr key={row.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 font-semibold">{employees.find((e)=>e.id===row.employeeId)?.name || row.employeeId}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{projectName(row.projectId, projects)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{taskTitle(row.taskId, tasks)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.date}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.hoursWorked}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.type}</td><td className="min-w-64 px-4 py-3 text-slate-600">{row.description}</td><td className="whitespace-nowrap px-4 py-3"><StatusBadge value={row.approvalStatus}/></td><td className="whitespace-nowrap px-4 py-3">{canApprove && row.approvalStatus === "Pending" ? <div className="flex gap-2"><button onClick={()=>onReview(row,"Approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Approve</button><button onClick={()=>onReview(row,"Rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">Reject</button></div> : <span className="text-xs font-semibold text-slate-400">No action</span>}</td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No timesheets found.</td></tr>}</tbody></table></div>;
}

function projectName(id:string, projects:{id:string;name:string}[]) { return projects.find((p)=>p.id===id)?.name || id; }
function taskTitle(id:string, tasks:{id:string;title:string}[]) { return tasks.find((t)=>t.id===id)?.title || id; }
function userIdForEmployee(employeeId:string) {
  const map: Record<string,string> = { e1:"u-employee", e2:"u-pm", e3:"u-mentor", e5:"u-finance" };
  return map[employeeId] || "u-employee";
}
