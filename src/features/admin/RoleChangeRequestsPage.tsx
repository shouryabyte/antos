import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { type RoleName } from "../../auth/permissions";
import { FormDialog } from "../../components/common/FormDialog";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { createAccountNotification, logAudit, privilegedRoles } from "../../lib/onboardingAutomation";

type Role = { id:string; name:RoleName };
type Profile = { id:string; full_name:string; email:string; role_id:string; roles?:{name:RoleName} };
type RequestRow = { id:string; status:string; reason:string; remarks?:string; created_at:string; profiles?:Profile; roles?:{name:RoleName}; new_role?:{name:RoleName} };

export function RoleChangeRequestsPage() {
  const auth = useAuth();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ userId:"", newRoleId:"", reason:"" });
  useEffect(() => { load(); }, []);

  async function load() {
    if (!supabase) return;
    const [requests, roleRows, profileRows] = await Promise.all([
      supabase.from("role_change_requests").select("*, profiles:user_id(id,full_name,email,role_id,roles(name)), roles:old_role_id(name), new_role:new_role_id(name)").order("created_at", { ascending:false }),
      supabase.from("roles").select("id,name").order("name"),
      supabase.from("profiles").select("id,full_name,email,role_id,roles(name)").order("full_name")
    ]);
    if (requests.data) setRows(requests.data as any);
    if (roleRows.data) setRoles(roleRows.data as Role[]);
    if (profileRows.data) setProfiles(profileRows.data as any);
  }

  async function requestChange() {
    if (!supabase) return;
    const target = profiles.find((p)=>p.id===form.userId);
    const nextRole = roles.find((r)=>r.id===form.newRoleId);
    if (!target || !nextRole) return setMessage("Select a user and new role.");
    const { error } = await supabase.from("role_change_requests").insert({
      user_id: target.id,
      old_role_id: target.role_id,
      new_role_id: nextRole.id,
      requested_by: auth.profile?.id,
      reason: form.reason,
      status: "Pending"
    });
    if (error) return setMessage(error.message);
    await logAudit(auth.profile, "role change requested", "Role Change", target.id, { newRole: nextRole.name, reason: form.reason });
    await createAccountNotification({ roleTarget:"Super Admin", title:"Role change requested", message:`${target.full_name} requested for ${nextRole.name}.`, type:"Role Change", module:"Role Change" });
    setOpen(false); setForm({ userId:"", newRoleId:"", reason:"" }); await load();
  }

  async function decide(row: RequestRow, decision: "Approved" | "Rejected") {
    if (!supabase || !auth.hasRole("Super Admin")) return;
    const now = new Date().toISOString();
    const patch = decision === "Approved" ? { status:decision, approved_by:auth.profile?.id, approved_at:now } : { status:decision, approved_by:auth.profile?.id, rejected_at:now };
    const { error } = await supabase.from("role_change_requests").update(patch).eq("id", row.id);
    if (error) return setMessage(error.message);
    if (decision === "Approved") await supabase.from("profiles").update({ role_id:(row as any).new_role_id }).eq("id", (row as any).user_id);
    await logAudit(auth.profile, decision === "Approved" ? "role change approved" : "role change rejected", "Role Change", row.id, { user:(row as any).profiles?.email });
    await createAccountNotification({ userId:(row as any).user_id, title:`Role change ${decision.toLowerCase()}`, message:`Your role change was ${decision.toLowerCase()}.`, type:"Role Change", module:"Role Change" });
    await auth.refreshAuth();
    await load();
  }

  async function setLifecycle(profile: Profile, nextStatus: string) {
    if (!supabase || !auth.hasPermission("account.manage")) return;
    const { error } = await supabase.from("profiles").update({ status: nextStatus }).eq("id", profile.id);
    if (error) return setMessage(error.message);
    await logAudit(auth.profile, nextStatus === "Suspended" ? "user suspended" : nextStatus === "Exited" ? "user marked exited" : "account activated", "Account", profile.id, { email: profile.email, nextStatus });
    await createAccountNotification({ userId: profile.id, title:"Account status updated", message:`Your account status is now ${nextStatus}.`, type:"Account", module:"Account" });
    await load();
  }

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    <Card><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Approval Workflow</p><h2 className="mt-2 text-2xl font-black">Role Change Requests</h2></div>{auth.hasPermission("role_change.request") && <Button onClick={()=>setOpen(true)}><Plus size={16}/> Request change</Button>}</div></Card>
    <Card><div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Old Role</th><th className="px-4 py-3">New Role</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{rows.map((row:any)=><tr key={row.id}><td className="px-4 py-3"><p className="font-black">{row.profiles?.full_name}</p><p className="text-xs text-slate-500">{row.profiles?.email}</p></td><td className="px-4 py-3">{row.roles?.name || "--"}</td><td className="px-4 py-3">{row.new_role?.name}</td><td className="px-4 py-3">{row.reason || "--"}</td><td className="px-4 py-3"><StatusBadge value={row.status}/></td><td className="px-4 py-3">{auth.hasRole("Super Admin") && row.status==="Pending" ? <div className="flex gap-2"><button onClick={()=>decide(row,"Approved")} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} className="inline"/> Approve</button><button onClick={()=>decide(row,"Rejected")} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><XCircle size={13} className="inline"/> Reject</button></div> : "No action"}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">No role change requests.</td></tr>}</tbody></table></div></Card>
    {auth.hasPermission("account.manage") && <Card><h3 className="mb-4 text-lg font-black">Account Lifecycle</h3><div className="table-scroll rounded-2xl border"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y bg-white">{profiles.map((p:any)=><tr key={p.id}><td className="px-4 py-3"><p className="font-black">{p.full_name}</p><p className="text-xs text-slate-500">{p.email}</p></td><td className="px-4 py-3">{p.roles?.name}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={()=>setLifecycle(p,"Active")} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Activate</button><button onClick={()=>setLifecycle(p,"Suspended")} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Suspend</button><button onClick={()=>setLifecycle(p,"Exited")} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Mark exited</button></div></td></tr>)}</tbody></table></div></Card>}
    <FormDialog open={open} title="Request Role Change" onClose={()=>setOpen(false)}>
      <div className="grid gap-3"><select className="h-11 rounded-xl border px-3" value={form.userId} onChange={(e)=>setForm({...form,userId:e.target.value})}><option value="">Select user</option>{profiles.map((p)=><option key={p.id} value={p.id}>{p.full_name} - {p.email}</option>)}</select><select className="h-11 rounded-xl border px-3" value={form.newRoleId} onChange={(e)=>setForm({...form,newRoleId:e.target.value})}><option value="">Select new role</option>{roles.map((r)=><option key={r.id} value={r.id}>{r.name}{privilegedRoles.includes(r.name) ? " (Super Admin approval)" : ""}</option>)}</select><textarea className="rounded-xl border px-3 py-2" rows={3} placeholder="Reason" value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}/></div>
      <div className="mt-5 flex justify-end"><Button onClick={requestChange}>Submit request</Button></div>
    </FormDialog>
  </div>;
}
