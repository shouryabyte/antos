import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { DataTable } from "../../components/common/DataTable";
import { EmptyState } from "../../components/common/EmptyState";
import { FormDialog } from "../../components/common/FormDialog";
import { ProgressMetric } from "../../components/common/ProgressMetric";
import { SearchAndFilterBar } from "../../components/common/SearchAndFilterBar";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../auth/useAuth";
import type { Permission } from "../../auth/permissions";
import { useAppStore } from "../../store/useAppStore";
import { inr, uid } from "../../lib/utils";

type Field = { key:string; label:string; type?:"number"|"date"|"textarea" };
export function ModulePage({ title, description, collection, fields, stats, editable=false, progressKey, kanban=false }: { title:string; description:string; collection:keyof ReturnType<typeof useAppStore.getState>; fields:string[]|Field[]; stats:{label:string; value:string|number; helper?:string}[]; editable?:boolean; progressKey?:string; kanban?:boolean }) {
  const auth = useAuth();
  const data = useAppStore((s:any)=>s[collection]) as any[];
  const addItem = useAppStore(s=>s.addItem);
  const [q,setQ] = useState(""); const [open,setOpen] = useState(false); const [form,setForm] = useState<Record<string,string>>({});
  const normalized = fields.map(f => typeof f === "string" ? { key:f, label: labelize(f) } : f);
  const filtered = useMemo(()=>data.filter(row => JSON.stringify(row).toLowerCase().includes(q.toLowerCase())), [data,q]);
  const columns: ColumnDef<any>[] = normalized.slice(0,7).map(f => ({ header:f.label, accessorKey:f.key, cell:({getValue}) => renderValue(getValue(), f.key) }));
  columns.push({ header:"Status", cell:({row}) => <StatusBadge value={String(row.original.status || row.original.paymentStatus || row.original.approvalStatus || row.original.recommendation || row.original.health || "Active")} /> });
  const createPermission = createPermissions[String(collection)];
  const canCreate = editable && (!createPermission || auth.hasPermission(createPermission));
  const save = () => {
    if (!canCreate) return;
    const item:any = { id:uid(String(collection)) };
    normalized.forEach(f=> item[f.key] = f.type === "number" ? Number(form[f.key] || 0) : (form[f.key] || sampleValue(f.key)));
    addItem(collection as never, item);
    setOpen(false);
    setForm({});
  };
  if (kanban) return <KanbanPage title={title} description={description} stats={stats} data={filtered} />;
  return <div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(s=><StatCard key={s.label} {...s}/>)}</div>
    <SearchAndFilterBar value={q} onChange={setQ} right={canCreate && <Button onClick={()=>setOpen(true)}><Plus size={16}/> Add {title.split(" ")[0]}</Button>} />
    {progressKey && <div className="mb-5 grid gap-4 md:grid-cols-3">{filtered.slice(0,3).map((r,i)=><Card key={r.id || i}><h3 className="mb-3 font-black">{r.name || r.internName || r.companyName || r.title}</h3><ProgressMetric label={labelize(progressKey)} value={Number(r[progressKey] || 0)} color={i===0?"bg-emerald-500":i===1?"bg-purple-500":"bg-sky-500"}/></Card>)}</div>}
    {filtered.length ? <DataTable data={filtered} columns={columns}/> : <EmptyState/>}
    <FormDialog open={open} title={`Add ${title}`} onClose={()=>setOpen(false)}>
      <div className="grid gap-3 sm:grid-cols-2">{normalized.slice(0,8).map(f=><label key={f.key} className="text-sm font-semibold text-slate-700">{f.label}<input type={f.type || "text"} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400" value={form[f.key] || ""} onChange={e=>setForm({...form,[f.key]:e.target.value})}/></label>)}</div>
      <div className="mt-5 flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save}>Save record</Button></div>
    </FormDialog>
  </div>;
}

function renderValue(value:any, key:string) {
  if (Array.isArray(value)) return value.join(", ");
  if (key.toLowerCase().includes("salary") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("budget") || key.toLowerCase().includes("revenue") || key.toLowerCase().includes("cost")) return inr(Number(value || 0));
  if (typeof value === "number" && (key.toLowerCase().includes("score") || key.toLowerCase().includes("rate") || key.toLowerCase().includes("progress") || key.toLowerCase().includes("percentage") || key.toLowerCase().includes("probability") || key.toLowerCase().includes("completion"))) return <div className="min-w-28"><ProgressMetric label="" value={value}/></div>;
  return String(value ?? "");
}
function labelize(key:string) { return key.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()); }
function sampleValue(key:string) { if (key.includes("Date")) return "2026-05-23"; if (key.includes("email")) return "new@antbox.in"; if (key.includes("status")) return "Active"; return "New record"; }
const createPermissions: Record<string, Permission> = {
  employees: "employee.create",
  students: "student.create",
  projects: "project.create",
  tasks: "task.create",
  attendance: "attendance.approve",
  leaves: "leave.apply",
  timesheets: "timesheet.submit",
  invoices: "invoice.manage",
  expenses: "expense.manage",
  tickets: "ticket.create",
  assets: "asset.manage",
  documents: "document.manage"
};
function KanbanPage({ title, description, stats, data }: { title:string; description:string; stats:any[]; data:any[] }) {
  const columns = ["Backlog","To Do","In Progress","Review","Done"];
  return <div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(s=><StatCard key={s.label} {...s}/>)}</div>
    <p className="mb-5 text-slate-600">{description}</p>
    <div className="grid gap-4 xl:grid-cols-5">{columns.map(c=><div key={c} className="rounded-2xl border border-black/5 bg-white p-3 shadow-soft"><h3 className="mb-3 font-black">{c}</h3><div className="space-y-3">{data.filter(t=>t.status===c).map(t=><div key={t.id} className="rounded-xl border border-slate-200 p-3"><p className="font-bold">{t.title}</p><p className="mt-1 text-xs text-slate-500">{t.description}</p><div className="mt-3 flex justify-between"><StatusBadge value={t.priority}/><span className="text-xs text-slate-500">{t.dueDate}</span></div></div>)}</div></div>)}</div>
  </div>;
}
