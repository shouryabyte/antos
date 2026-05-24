import { addDays, format, isBefore, parseISO } from "date-fns";
import { Copy, MailPlus, RefreshCcw, Search, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { type RoleName } from "../../auth/permissions";
import { FormDialog } from "../../components/common/FormDialog";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { allowedInviteRoles, autoExpireInvitations, createAccountNotification, logAudit } from "../../lib/onboardingAutomation";

type RoleRow = { id:string; name:RoleName };
type Invitation = {
  id:string; email:string; full_name:string; role_id:string; department_id?:string | null; employee_id?:string | null; student_id?:string | null; corporate_partner_id?:string | null;
  invite_token:string; expires_at:string; status:string; accepted_at?:string | null; revoked_at?:string | null; created_at:string; roles?:{name:RoleName}; departments?:{name:string};
};

export function InvitationsPage() {
  const auth = useAuth();
  const [rows, setRows] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [departments, setDepartments] = useState<Array<{id:string;name:string}>>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email:"", fullName:"", role:"Employee" as RoleName, departmentId:"", expiresAt:format(addDays(new Date(), 7), "yyyy-MM-dd") });
  const roleOptions = useMemo(() => roles.filter((role) => allowedInviteRoles(auth.role).includes(role.name)), [roles, auth.role]);
  const filtered = rows.filter((item) =>
    (status === "All" || item.status === status) &&
    JSON.stringify(item).toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => { load(); }, []);

  async function load() {
    if (!supabase) return;
    await autoExpireInvitations();
    const [invites, roleRows, deptRows] = await Promise.all([
      supabase.from("user_invitations").select("*, roles(name), departments(name)").order("created_at", { ascending:false }),
      supabase.from("roles").select("id,name").order("name"),
      supabase.from("departments").select("id,name").order("name")
    ]);
    if (invites.data) setRows(invites.data as Invitation[]);
    if (roleRows.data) setRoles(roleRows.data as RoleRow[]);
    if (deptRows.data) setDepartments(deptRows.data);
  }

  async function createInvite() {
    if (!supabase) return;
    const role = roles.find((item) => item.name === form.role);
    if (!role) return setMessage("Select a valid role.");
    if (!allowedInviteRoles(auth.role).includes(form.role)) return setMessage("You cannot invite that role.");
    const activeExisting = rows.find((item) => item.email.toLowerCase() === form.email.toLowerCase() && item.status === "Pending");
    if (activeExisting) return setMessage("A pending invite already exists. Use resend instead of creating a duplicate.");

    let employeeId: string | null = null;
    if (["Employee", "Intern"].includes(form.role)) {
      const { data: employee } = await supabase.from("employees").insert({
        employee_code: `INV-${Date.now()}`,
        name: form.fullName,
        email: form.email.toLowerCase(),
        department_id: form.departmentId || null,
        department: departments.find((d)=>d.id===form.departmentId)?.name,
        designation: form.role,
        employment_type: form.role === "Intern" ? "Intern" : "Full-time",
        status: "Active"
      }).select("id").single();
      employeeId = employee?.id || null;
    }

    const token = crypto.randomUUID();
    const { error } = await supabase.from("user_invitations").insert({
      email: form.email.toLowerCase(),
      full_name: form.fullName,
      role_id: role.id,
      department_id: form.departmentId || null,
      employee_id: employeeId,
      invited_by: auth.profile?.id,
      invite_token: token,
      expires_at: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
      status: "Pending"
    });
    if (error) return setMessage(error.message);
    await logAudit(auth.profile, "user invited", "Invitations", form.email, { role: form.role });
    await createAccountNotification({ roleTarget:"Super Admin", title:"Invite created", message:`${form.fullName} was invited as ${form.role}.`, type:"Invitation", module:"Invitations" });
    setOpen(false); setForm({ email:"", fullName:"", role:"Employee", departmentId:"", expiresAt:format(addDays(new Date(), 7), "yyyy-MM-dd") });
    setMessage("Invitation created. Copy the token link for testing if email delivery is not configured.");
    await load();
  }

  async function updateInvite(row: Invitation, nextStatus: "Pending" | "Revoked") {
    if (!supabase) return;
    const patch = nextStatus === "Revoked"
      ? { status:"Revoked", revoked_at:new Date().toISOString() }
      : { status:"Pending", invite_token:crypto.randomUUID(), expires_at:addDays(new Date(), 7).toISOString(), revoked_at:null };
    const { error } = await supabase.from("user_invitations").update(patch).eq("id", row.id);
    if (error) return setMessage(error.message);
    await logAudit(auth.profile, nextStatus === "Revoked" ? "invite revoked" : "invite resent", "Invitations", row.id, { email:row.email });
    setMessage(nextStatus === "Revoked" ? "Invitation revoked." : "Invitation resent with a new token.");
    await load();
  }

  function inviteLink(row: Invitation) {
    return `${window.location.origin}/login?invite=${row.invite_token}`;
  }

  return <div className="space-y-6">
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pending Invites" value={rows.filter((r)=>r.status==="Pending").length} icon={MailPlus} tone="amber"/>
      <StatCard label="Accepted Invites" value={rows.filter((r)=>r.status==="Accepted").length} icon={MailPlus} tone="emerald"/>
      <StatCard label="Expired Invites" value={rows.filter((r)=>r.status==="Expired").length} icon={MailPlus} tone="red"/>
      <StatCard label="Revoked Invites" value={rows.filter((r)=>r.status==="Revoked").length} icon={UserX} tone="purple"/>
    </div>
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">User Provisioning</p><h2 className="mt-2 text-2xl font-black">Invitations</h2></div>
        <div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={q} onChange={(e)=>setQ(e.target.value)} className="h-10 rounded-xl border pl-9 pr-3 text-sm font-semibold" placeholder="Search invites"/></div><select value={status} onChange={(e)=>setStatus(e.target.value)} className="h-10 rounded-xl border px-3 text-sm font-semibold">{["All","Pending","Accepted","Expired","Revoked"].map((s)=><option key={s}>{s}</option>)}</select><Button onClick={()=>setOpen(true)}><MailPlus size={16}/> Invite user</Button></div>
      </div>
    </Card>
    <Card>
      <div className="table-scroll rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Token Link</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y bg-white">{filtered.map((row)=><tr key={row.id} className={row.status==="Pending" && isBefore(parseISO(row.expires_at), new Date()) ? "bg-red-50" : ""}><td className="px-4 py-3"><p className="font-black">{row.full_name}</p><p className="text-xs text-slate-500">{row.email}</p></td><td className="px-4 py-3">{row.roles?.name}</td><td className="px-4 py-3">{row.departments?.name || "--"}</td><td className="px-4 py-3">{row.expires_at.slice(0,10)}</td><td className="px-4 py-3"><StatusBadge value={row.status}/></td><td className="px-4 py-3"><button onClick={()=>navigator.clipboard?.writeText(inviteLink(row))} className="rounded-lg border px-2 py-1 text-xs font-bold"><Copy size={13} className="inline"/> Copy</button></td><td className="px-4 py-3"><div className="flex gap-2">{row.status==="Pending" && <button onClick={()=>updateInvite(row,"Pending")} className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700"><RefreshCcw size={13} className="inline"/> Resend</button>}{row.status==="Pending" && <button onClick={()=>updateInvite(row,"Revoked")} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Revoke</button>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="px-4 py-10 text-center font-semibold text-slate-500">No invitations found.</td></tr>}</tbody></table>
      </div>
    </Card>
    <FormDialog open={open} title="Invite User" onClose={()=>setOpen(false)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="h-11 rounded-xl border px-3" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/>
        <input className="h-11 rounded-xl border px-3" placeholder="Full name" value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})}/>
        <select className="h-11 rounded-xl border px-3" value={form.role} onChange={(e)=>setForm({...form,role:e.target.value as RoleName})}>{roleOptions.map((r)=><option key={r.id}>{r.name}</option>)}</select>
        <select className="h-11 rounded-xl border px-3" value={form.departmentId} onChange={(e)=>setForm({...form,departmentId:e.target.value})}><option value="">No department</option>{departments.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input type="date" className="h-11 rounded-xl border px-3" value={form.expiresAt} onChange={(e)=>setForm({...form,expiresAt:e.target.value})}/>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button className="bg-slate-100 text-black hover:bg-slate-200" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={createInvite}>Create invite</Button></div>
    </FormDialog>
  </div>;
}
