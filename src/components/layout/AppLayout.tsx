import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
export function AppLayout() {
  const [open,setOpen] = useState(false);
  return <div className="min-h-screen lg:grid lg:grid-cols-[18rem_1fr]">
    {open && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={()=>setOpen(false)} />}
    <Sidebar open={open} onClose={()=>setOpen(false)} />
    <div className="min-w-0"><Header onMenu={()=>setOpen(true)} /><Outlet /></div>
  </div>;
}
