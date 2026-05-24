import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";

type AuditLog = { id:string; actor_role?:string; action:string; module:string; target_id?:string; metadata?:Record<string,unknown>; created_at:string; profiles?:{full_name:string;email:string} };

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({ q:"", action:"All", module:"All", from:"", to:"" });
  useEffect(() => { load(); }, []);
  async function load() {
    if (!supabase) return;
    const { data } = await supabase.from("audit_logs").select("*, profiles:actor_user_id(full_name,email)").order("created_at", { ascending:false }).limit(250);
    if (data) setRows(data as AuditLog[]);
  }
  const actions = useMemo(()=>["All", ...Array.from(new Set(rows.map((r)=>r.action)))], [rows]);
  const modules = useMemo(()=>["All", ...Array.from(new Set(rows.map((r)=>r.module)))], [rows]);
  const filtered = rows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    return text.includes(filters.q.toLowerCase())
      && (filters.action === "All" || row.action === filters.action)
      && (filters.module === "All" || row.module === filters.module)
      && (!filters.from || row.created_at.slice(0,10) >= filters.from)
      && (!filters.to || row.created_at.slice(0,10) <= filters.to);
  });
  return <div className="space-y-6">
    <Card><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">System Governance</p><h2 className="mt-2 text-2xl font-black">Audit Logs</h2><p className="mt-1 text-sm text-slate-500">Account, invitation, role, and onboarding events are recorded here.</p></Card>
    <Card><div className="grid gap-2 md:grid-cols-5"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="h-10 w-full rounded-xl border pl-9 pr-3 text-sm font-semibold" placeholder="Search" value={filters.q} onChange={(e)=>setFilters({...filters,q:e.target.value})}/></div><select className="h-10 rounded-xl border px-3 text-sm font-semibold" value={filters.action} onChange={(e)=>setFilters({...filters,action:e.target.value})}>{actions.map((x)=><option key={x}>{x}</option>)}</select><select className="h-10 rounded-xl border px-3 text-sm font-semibold" value={filters.module} onChange={(e)=>setFilters({...filters,module:e.target.value})}>{modules.map((x)=><option key={x}>{x}</option>)}</select><input type="date" className="h-10 rounded-xl border px-3 text-sm font-semibold" value={filters.from} onChange={(e)=>setFilters({...filters,from:e.target.value})}/><input type="date" className="h-10 rounded-xl border px-3 text-sm font-semibold" value={filters.to} onChange={(e)=>setFilters({...filters,to:e.target.value})}/></div></Card>
    <Card><div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Metadata</th></tr></thead><tbody className="divide-y bg-white">{filtered.map((row)=><tr key={row.id}><td className="px-4 py-3"><p className="font-black">{row.profiles?.full_name || "System"}</p><p className="text-xs text-slate-500">{row.profiles?.email || row.actor_role || "--"}</p></td><td className="px-4 py-3"><StatusBadge value={row.action}/></td><td className="px-4 py-3">{row.module}</td><td className="px-4 py-3">{row.target_id || "--"}</td><td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td><td className="max-w-sm truncate px-4 py-3 text-slate-600">{row.metadata ? JSON.stringify(row.metadata) : "--"}</td></tr>)}{!filtered.length && <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">No audit logs found.</td></tr>}</tbody></table></div></Card>
  </div>;
}
