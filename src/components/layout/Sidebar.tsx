import { NavLink } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, Building2, ChevronDown, FileText, GraduationCap, HelpCircle, LayoutDashboard, LockKeyhole, Users, WalletCards } from "lucide-react";
import { cn } from "../../lib/utils";

const groups = [
  { title:"", items:[["Dashboard","/",LayoutDashboard]] },
  { title:"People", items:[["Employees","/employees",Users],["Interns","/interns",Users],["Students","/students",GraduationCap],["Departments","/departments",Building2]] },
  { title:"HRMS", items:[["Attendance","/attendance",BarChart3],["Leave","/leave",FileText],["Payroll","/payroll",WalletCards],["Onboarding","/onboarding",Users],["Exit Management","/exit-management",Users]] },
  { title:"Work Management", items:[["Projects","/projects",BriefcaseBusiness],["Tasks","/tasks",FileText],["Timesheets","/timesheets",BarChart3],["Deliverables","/deliverables",FileText]] },
  { title:"AntBox Academy", items:[["Career Sprints","/career-sprints",GraduationCap],["Mentors","/mentors",Users],["Readiness Scores","/readiness-scores",BarChart3],["Certificates","/certificates",FileText]] },
  { title:"IaaS Operations", items:[["Corporate Partners","/corporate-partners",Building2],["Intern Deployment","/intern-deployment",BriefcaseBusiness],["Client Feedback","/client-feedback",FileText],["PPO Tracker","/ppo-tracker",BarChart3]] },
  { title:"Finance", items:[["Invoices","/finance/invoices",WalletCards],["Expenses","/finance/expenses",WalletCards],["Payroll Cost","/finance/payroll-cost",WalletCards],["Profitability","/finance/profitability",WalletCards]] },
  { title:"Admin", items:[["Assets","/assets",BriefcaseBusiness],["Documents","/documents",FileText],["Helpdesk Tickets","/helpdesk",HelpCircle],["Roles & Permissions","/roles-permissions",LockKeyhole],["Settings","/settings",ChevronDown]] }
] as const;

export function Sidebar({ open, onClose }: { open:boolean; onClose:()=>void }) {
  return <aside className={cn("fixed inset-y-0 left-0 z-40 w-72 -translate-x-full bg-[#050505] text-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open && "translate-x-0")}>
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl font-black text-black">a</div><div><p className="text-lg font-black">AntOS</p><p className="text-xs text-white/50">AntBox Operating System</p></div></div></div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4">
        {groups.map((g,idx)=><div key={idx}>{g.title && <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-wider text-white/40">{g.title}</p>}<div className="space-y-1">{g.items.map(([label,path,Icon])=><NavLink onClick={onClose} key={path} to={path} className={({isActive})=>cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white", isActive && "bg-white text-black hover:bg-white hover:text-black")}><Icon size={17}/>{label}</NavLink>)}</div></div>)}
      </nav>
    </div>
  </aside>;
}
