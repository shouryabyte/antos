import { AlertTriangle, Banknote, BriefcaseBusiness, Building2, CheckCircle2, Clock, GraduationCap, IndianRupee, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "../../components/common/ChartCard";
import { ProgressMetric } from "../../components/common/ProgressMetric";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Card } from "../../components/ui/card";
import { inr } from "../../lib/utils";
import { getExecutiveDashboard, type ExecutiveDashboard } from "../../services/dashboardService";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const next = await getExecutiveDashboard();
        if (active) setDashboard(next);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load dashboard data from Supabase.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const flow = ["Talent Intake", "Career Sprint", "Live Work", "Readiness Score", "Intern Deployment", "Client Feedback", "PPO Outcome"];

  if (loading) {
    return <div className="rounded-[1.5rem] border border-white bg-white/70 p-8 text-center text-sm font-bold text-slate-500 shadow-soft">Loading dashboard from Supabase...</div>;
  }

  if (error || !dashboard) {
    return <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 text-center text-sm font-bold text-red-700">{error || "Dashboard data is unavailable."}</div>;
  }

  const kpis = [
    ["Total Employees", dashboard.kpis.totalEmployees, Users, "emerald"],
    ["Active Interns", dashboard.kpis.activeInterns, BriefcaseBusiness, "blue"],
    ["Active Students", dashboard.kpis.activeStudents, GraduationCap, "purple"],
    ["Live Career Sprints", dashboard.kpis.liveCareerSprints, Clock, "emerald"],
    ["Corporate Partners", dashboard.kpis.corporatePartners, Building2, "blue"],
    ["Active Projects", dashboard.kpis.activeProjects, BriefcaseBusiness, "purple"],
    ["Average Readiness Score", `${dashboard.kpis.averageReadinessScore}%`, CheckCircle2, "emerald"],
    ["PPOs Issued", dashboard.kpis.pposIssued, CheckCircle2, "purple"],
    ["Monthly Revenue", inr(dashboard.kpis.monthlyRevenue), IndianRupee, "emerald"],
    ["Payroll Cost", inr(dashboard.kpis.payrollCost), Banknote, "amber"],
    ["Pending Approvals", dashboard.kpis.pendingApprovals, Clock, "amber"],
    ["At-Risk Projects", dashboard.kpis.atRiskProjects, AlertTriangle, dashboard.kpis.atRiskProjects ? "red" : "emerald"]
  ] as const;

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-white bg-white/70 p-6 shadow-soft">
      <p className="text-xs font-black uppercase tracking-[.25em] text-purple-600">AI Talent Readiness Platform</p>
      <h2 className="mt-3 max-w-5xl text-4xl font-black tracking-tight lg:text-6xl">The operating system that bridges <span className="font-serif italic text-purple-600">talent</span> with opportunity.</h2>
      <p className="mt-4 max-w-3xl text-slate-600">One centralized system for people, sprints, readiness, deployment, payroll, finance, and corporate talent operations.</p>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label, value, Icon, tone]) => <StatCard key={label} label={label} value={value} icon={Icon} tone={tone} />)}</div>

    <Card><h3 className="mb-5 text-lg font-black">AntBox Operating Flow</h3><div className="grid gap-3 md:grid-cols-7">{flow.map((item, index) => <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black text-purple-600">0{index + 1}</p><p className="mt-2 font-black">{item}</p></div>)}</div></Card>

    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Revenue vs Expenses"><ResponsiveContainer width="100%" height={280}><AreaChart data={dashboard.finance.revenueExpenseTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis /><Tooltip /><Area dataKey="rev" stroke="#10B981" fill="#10B98133" /><Area dataKey="exp" stroke="#8B5CF6" fill="#8B5CF633" /></AreaChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Readiness Score Distribution"><ResponsiveContainer width="100%" height={280}><BarChart data={dashboard.readiness.distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="score" fill="#22C55E" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="PPO Conversion Trend"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.ppo.conversionTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="conversion" fill="#8B5CF6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Sprint Completion Rate"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.sprintCompletion}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="completion" fill="#38BDF8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Project Health Summary"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={dashboard.projects.health} dataKey="value" nameKey="name" outerRadius={90}>{["#22C55E", "#F59E0B", "#EF4444"].map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Attendance Summary"><ResponsiveContainer width="100%" height={260}><BarChart data={[
        { name: "Present", value: dashboard.attendance.present },
        { name: "Absent", value: dashboard.attendance.absent },
        { name: "Late", value: dashboard.attendance.late },
        { name: "Half Day", value: dashboard.attendance.halfDay },
        { name: "Leave", value: dashboard.attendance.leave }
      ]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Student Pipeline Funnel"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.studentPipeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#F59E0B" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Intern Deployment Status">{dashboard.deploymentStatus.length ? dashboard.deploymentStatus.map((deployment) => <div key={deployment.id} className="mb-4"><div className="mb-2 flex justify-between"><span className="font-bold">{deployment.internName}</span><StatusBadge value={deployment.status} /></div><ProgressMetric label={deployment.corporateClient} value={deployment.ppoProbability} color="bg-purple-500" /></div>) : <p className="text-sm font-semibold text-slate-500">No deployment records found in Supabase.</p>}</ChartCard>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card><h3 className="mb-4 font-black">Pending Approvals</h3>{[
        ["Leave approvals", dashboard.pending.leaves],
        ["Attendance regularizations", dashboard.pending.regularizations],
        ["Timesheet approvals", dashboard.pending.timesheets],
        ["Expense approvals", dashboard.pending.expenses],
        ["Invoice actions", dashboard.pending.invoices],
        ["Role changes", dashboard.pending.roleChanges],
        ["Invitations", dashboard.pending.invitations]
      ].map(([label, value]) => <div key={label} className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{label}</span><span className="font-black">{value}</span></div>)}</Card>
      <Card><h3 className="mb-4 font-black">At-Risk Alerts</h3>{dashboard.projects.atRisk.length ? dashboard.projects.atRisk.map((project) => <div key={project.id} className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{project.name}</span><StatusBadge value={project.health} /></div>) : <p className="text-sm font-semibold text-slate-500">No at-risk projects found in Supabase.</p>}</Card>
    </div>
  </div>;
}
