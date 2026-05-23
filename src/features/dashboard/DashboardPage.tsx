import { AlertTriangle, Banknote, BriefcaseBusiness, Building2, CheckCircle2, Clock, GraduationCap, IndianRupee, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "../../components/common/ChartCard";
import { ProgressMetric } from "../../components/common/ProgressMetric";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Card } from "../../components/ui/card";
import { inr } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";

export function DashboardPage() {
  const s = useAppStore();
  const revenue = s.invoices.reduce((a,b)=>a+b.amount,0), expenses = s.expenses.reduce((a,b)=>a+b.amount,0), payroll = s.payroll.reduce((a,b)=>a+b.netSalary,0);
  const avgReady = Math.round(s.readinessScores.reduce((a,b)=>a+b.finalScore,0)/s.readinessScores.length);
  const kpis = [
    ["Total Employees",s.employees.length,Users,"emerald"],["Active Interns",s.employees.filter(e=>e.employmentType==="Intern").length + s.deployments.length,BriefcaseBusiness,"blue"],["Active Students",s.students.length,GraduationCap,"purple"],["Live Career Sprints",s.sprints.filter(x=>x.status==="Live").length,Clock,"emerald"],
    ["Corporate Partners",s.partners.length,Building2,"blue"],["Active Projects",s.projects.filter(x=>x.status!=="Completed").length,BriefcaseBusiness,"purple"],["Average Readiness Score",`${avgReady}%`,CheckCircle2,"emerald"],["PPOs Issued",s.partners.reduce((a,b)=>a+b.pposIssued,0),CheckCircle2,"purple"],
    ["Monthly Revenue",inr(revenue),IndianRupee,"emerald"],["Payroll Cost",inr(payroll),Banknote,"amber"],["Pending Approvals",s.leaves.filter(l=>l.status==="Pending").length + s.timesheets.filter(t=>t.approvalStatus==="Pending").length,Clock,"amber"],["At-Risk Projects",s.projects.filter(p=>p.health==="Red").length,AlertTriangle,"red"]
  ] as const;
  const finance = [{m:"Jan",rev:12,exp:7},{m:"Feb",rev:16,exp:9},{m:"Mar",rev:21,exp:11},{m:"Apr",rev:24,exp:14},{m:"May",rev:29,exp:17}];
  const flow = ["Talent Intake","Career Sprint","Live Work","Readiness Score","Intern Deployment","Client Feedback","PPO Outcome"];
  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-white bg-white/70 p-6 shadow-soft">
      <p className="text-xs font-black uppercase tracking-[.25em] text-purple-600">AI Talent Readiness Platform</p>
      <h2 className="mt-3 max-w-5xl text-4xl font-black tracking-tight lg:text-6xl">The operating system that bridges <span className="font-serif italic text-purple-600">talent</span> with opportunity.</h2>
      <p className="mt-4 max-w-3xl text-slate-600">One centralized system for people, sprints, readiness, deployment, payroll, finance, and corporate talent operations.</p>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label,value,Icon,tone])=><StatCard key={label} label={label} value={value} icon={Icon} tone={tone}/>)}</div>
    <Card><h3 className="mb-5 text-lg font-black">AntBox Operating Flow</h3><div className="grid gap-3 md:grid-cols-7">{flow.map((f,i)=><div key={f} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black text-purple-600">0{i+1}</p><p className="mt-2 font-black">{f}</p></div>)}</div></Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Revenue vs Expenses"><ResponsiveContainer width="100%" height={280}><AreaChart data={finance}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Area dataKey="rev" stroke="#10B981" fill="#10B98133"/><Area dataKey="exp" stroke="#8B5CF6" fill="#8B5CF633"/></AreaChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Readiness Score Distribution"><ResponsiveContainer width="100%" height={280}><BarChart data={s.readinessScores.map((r,i)=>({name:s.students[i]?.name.split(" ")[0], score:r.finalScore}))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="score" fill="#22C55E" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Project Health Summary"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={["Green","Yellow","Red"].map(h=>({name:h,value:s.projects.filter(p=>p.health===h).length}))} dataKey="value" nameKey="name" outerRadius={90}>{["#22C55E","#F59E0B","#EF4444"].map(c=><Cell key={c} fill={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Deployment Status">{s.deployments.map(d=><div key={d.id} className="mb-4"><div className="mb-2 flex justify-between"><span className="font-bold">{d.internName}</span><StatusBadge value={d.status}/></div><ProgressMetric label={d.corporateClient} value={d.ppoProbability} color="bg-purple-500"/></div>)}</ChartCard>
    </div>
    <div className="grid gap-4 xl:grid-cols-2"><Card><h3 className="mb-4 font-black">Pending Approvals</h3>{s.leaves.concat([]).map(l=><div key={l.id} className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{l.leaveType} leave request</span><StatusBadge value={l.status}/></div>)}</Card><Card><h3 className="mb-4 font-black">At-Risk Alerts</h3>{s.projects.filter(p=>p.health!=="Green").map(p=><div key={p.id} className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{p.name}</span><StatusBadge value={p.health}/></div>)}</Card></div>
  </div>;
}
