import { CheckCircle2, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { createAccountNotification, generateOnboardingTasks, isProfileComplete, logAudit, nextStatusAfterProfileCompletion } from "../../lib/onboardingAutomation";

type Task = { id:string; task_title:string; task_type:string; status:string; due_date?:string };

export function CompleteProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Record<string,string>>({
    phone:"", emergencyContact:"", address:"", profilePhoto:"placeholder", documents:"placeholder", bankDetails:"placeholder",
    college:"", degree:"", graduationYear:"", skills:"", careerInterest:"", portfolioLink:"",
    companyName:"", contactPerson:"", designation:"", industry:"", hiringRequirement:""
  });

  useEffect(() => { load(); }, [auth.profile?.id]);

  async function load() {
    if (!supabase || !auth.profile) return;
    await generateOnboardingTasks(auth.profile.id, auth.profile.role);
    const { data } = await supabase.from("onboarding_tasks").select("*").eq("profile_id", auth.profile.id).order("created_at");
    if (data) setTasks(data);
  }

  async function completeProfile() {
    if (!supabase || !auth.profile) return;
    if (!isProfileComplete(auth.profile.role, form)) return setMessage("Complete all required profile fields before continuing.");
    const nextStatus = nextStatusAfterProfileCompletion(auth.profile.role, auth.profile.status);

    if (auth.profile.role === "Student" && auth.profile.studentId) {
      await supabase.from("students").update({
        phone: form.phone || undefined,
        college: form.college,
        degree: form.degree,
        graduation_year: Number(form.graduationYear),
        skills: form.skills.split(",").map((s)=>s.trim()).filter(Boolean),
        career_interest: form.careerInterest,
        portfolio_link: form.portfolioLink,
        status: nextStatus
      }).eq("id", auth.profile.studentId);
    } else if (auth.profile.role === "Corporate Partner" && auth.profile.partnerId) {
      await supabase.from("corporate_partners").update({
        company_name: form.companyName,
        contact_person: form.contactPerson,
        industry: form.industry,
        hiring_need: form.hiringRequirement,
        status: nextStatus
      }).eq("id", auth.profile.partnerId);
    } else if (auth.profile.employeeId) {
      await supabase.from("employees").update({
        phone: form.phone,
        avatar_url: form.profilePhoto,
        documents: [form.documents, `Emergency: ${form.emergencyContact}`, `Address: ${form.address}`, `Bank: ${form.bankDetails}`],
        status: nextStatus === "Active" ? "Active" : "Notice Period"
      }).eq("id", auth.profile.employeeId);
    }

    await supabase.from("profiles").update({ status: nextStatus }).eq("id", auth.profile.id);
    await supabase.from("onboarding_tasks").update({ status:"Completed", completed_at:new Date().toISOString() }).eq("profile_id", auth.profile.id);
    await logAudit(auth.profile, "profile completed", "Onboarding", auth.profile.id, { nextStatus });
    await createAccountNotification({ roleTarget:"HR Manager", title:"Profile completed", message:`${auth.profile.fullName} completed profile setup.`, type:"Profile", module:"Onboarding" });
    if (nextStatus === "Pending Verification") await createAccountNotification({ roleTarget:"Mentor", title:"Student pending verification", message:`${auth.profile.fullName} is awaiting verification.`, type:"Approval", module:"Onboarding" });
    if (nextStatus === "Pending Partner Approval") await createAccountNotification({ roleTarget:"Super Admin", title:"Partner pending approval", message:`${auth.profile.fullName} is awaiting partner approval.`, type:"Approval", module:"Onboarding" });
    await auth.refreshAuth();
    navigate(nextStatus === "Active" ? "/dashboard" : "/pending-verification", { replace:true });
  }

  const role = auth.profile?.role;
  return <main className="min-h-screen bg-[#f5f2ea] p-4">
    <div className="mx-auto max-w-5xl space-y-5">
      <Card>
        <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">Profile Completion</p>
        <h1 className="mt-2 text-3xl font-black">Complete your AntOS profile</h1>
        <p className="mt-2 text-sm text-slate-600">Your account access is limited until required onboarding information is complete.</p>
        <div className="mt-3 flex gap-2"><StatusBadge value={auth.profile?.status || "Pending Profile Completion"}/><StatusBadge value={role || "Role"}/></div>
      </Card>
      {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card>
          <h2 className="mb-4 text-xl font-black">Required Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(role === "Student") && <StudentFields form={form} setForm={setForm}/>}
            {(role === "Corporate Partner") && <PartnerFields form={form} setForm={setForm}/>}
            {role && !["Student","Corporate Partner"].includes(role) && <EmployeeFields form={form} setForm={setForm}/>}
          </div>
          <div className="mt-5 flex justify-end"><Button onClick={completeProfile}><CheckCircle2 size={16}/> Save and complete</Button></div>
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2"><ClipboardList size={18}/><h2 className="text-xl font-black">Onboarding Tasks</h2></div>
          <div className="space-y-2">{tasks.map((task)=><div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="font-bold">{task.task_title}</span><StatusBadge value={task.status}/></div>)}</div>
        </Card>
      </div>
    </div>
  </main>;
}

function EmployeeFields({ form, setForm }:{ form:Record<string,string>; setForm:(v:Record<string,string>)=>void }) {
  return <><Input label="Phone" k="phone" form={form} setForm={setForm}/><Input label="Emergency contact" k="emergencyContact" form={form} setForm={setForm}/><Input label="Address" k="address" form={form} setForm={setForm}/><Input label="Profile photo placeholder" k="profilePhoto" form={form} setForm={setForm}/><Input label="Documents placeholder" k="documents" form={form} setForm={setForm}/><Input label="Bank details placeholder" k="bankDetails" form={form} setForm={setForm}/></>;
}
function StudentFields({ form, setForm }:{ form:Record<string,string>; setForm:(v:Record<string,string>)=>void }) {
  return <><Input label="College" k="college" form={form} setForm={setForm}/><Input label="Degree" k="degree" form={form} setForm={setForm}/><Input label="Graduation year" k="graduationYear" form={form} setForm={setForm}/><Input label="Skills comma-separated" k="skills" form={form} setForm={setForm}/><Input label="Career interest" k="careerInterest" form={form} setForm={setForm}/><Input label="Portfolio link" k="portfolioLink" form={form} setForm={setForm}/></>;
}
function PartnerFields({ form, setForm }:{ form:Record<string,string>; setForm:(v:Record<string,string>)=>void }) {
  return <><Input label="Company name" k="companyName" form={form} setForm={setForm}/><Input label="Contact person" k="contactPerson" form={form} setForm={setForm}/><Input label="Designation" k="designation" form={form} setForm={setForm}/><Input label="Industry" k="industry" form={form} setForm={setForm}/><Input label="Hiring requirement" k="hiringRequirement" form={form} setForm={setForm}/></>;
}
function Input({ label, k, form, setForm }:{ label:string; k:string; form:Record<string,string>; setForm:(v:Record<string,string>)=>void }) {
  return <label className="text-sm font-bold text-slate-700">{label}<input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" value={form[k] || ""} onChange={(e)=>setForm({...form,[k]:e.target.value})}/></label>;
}
