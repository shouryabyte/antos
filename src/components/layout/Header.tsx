import { Bell, LogOut, Menu, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { supabase } from "../../lib/supabase";
export function Header({ onMenu }: { onMenu:()=>void }) {
  const { profile, role, logout } = useAuth();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [accountNotifications, setAccountNotifications] = useState<any[]>([]);
  const allNotifications = accountNotifications.map((item)=>({ ...item, source:"supabase", isRead:item.is_read, relatedModule:item.related_module, createdAt:item.created_at }));
  const unreadCount = allNotifications.filter((item) => !item.isRead).length;
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase || !profile) return;
    const client = supabase;
    const load = async () => {
      const [userRows, roleRows] = await Promise.all([
        client.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending:false }).limit(20),
        role ? client.from("notifications").select("*").eq("role_target", role).order("created_at", { ascending:false }).limit(20) : Promise.resolve({ data: [] })
      ]);
      const merged = [...(userRows.data || []), ...((roleRows as any).data || [])].filter((item, index, arr) => arr.findIndex((x)=>x.id===item.id) === index);
      setAccountNotifications(merged);
    };
    load();
  }, [profile?.id, role]);
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
        <div className="relative">
          <button className="relative rounded-xl border bg-white p-2" onClick={()=>setOpenNotifications(!openNotifications)}><Bell size={19}/>{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">{unreadCount}</span>}</button>
          {openNotifications && <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
            <div className="mb-2 flex items-center justify-between"><p className="font-black">Notifications</p><span className="text-xs font-bold text-slate-500">{unreadCount} unread</span></div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {allNotifications.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8).map((item)=><button key={`${item.source}-${item.id}`} onClick={async ()=>{ if (supabase) await supabase.from("notifications").update({ is_read:true }).eq("id", item.id); setAccountNotifications((rows)=>rows.map((row)=>row.id===item.id ? { ...row, is_read:true } : row)); }} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:bg-emerald-50">
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-black text-slate-900">{item.title}</p>{!item.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"/>}</div>
                <p className="mt-1 text-xs text-slate-600">{item.message}</p>
              </button>)}
              {!allNotifications.length && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500">No notifications yet.</div>}
            </div>
          </div>}
        </div>
        <button className="hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm font-bold md:flex">
          <UserRound size={18}/>
          <span className="leading-tight">
            <span className="block">{profile?.fullName || profile?.name || "AntOS User"}</span>
            <span className="block text-xs font-semibold text-slate-500">{profile?.email || "No email"}</span>
          </span>
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut size={18}/> Logout</button>
      </div>
    </div>
  </header>;
}
