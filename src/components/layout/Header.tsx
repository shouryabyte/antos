import { Bell, LogOut, Menu, Search, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
export function Header({ onMenu }: { onMenu:()=>void }) {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f2ea]/90 px-4 py-3 backdrop-blur lg:px-6">
    <div className="flex items-center gap-3">
      <button className="rounded-xl border bg-white p-2 lg:hidden" onClick={onMenu}><Menu size={20}/></button>
      <label className="relative hidden max-w-xl flex-1 md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="h-11 w-full rounded-2xl border border-white bg-white/80 pl-10 pr-4 text-sm outline-none shadow-sm" placeholder="Search employees, students, invoices, projects..." /></label>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 sm:inline-flex">{role}</span>
        <button className="relative rounded-xl border bg-white p-2"><Bell size={19}/><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500"/></button>
        <button className="hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold md:flex"><UserRound size={18}/> {profile?.name || "Admin"}</button>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut size={18}/> Logout</button>
      </div>
    </div>
  </header>;
}
