import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
export function FormDialog({ open, title, children, onClose }: { open:boolean; title:string; children:ReactNode; onClose:()=>void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
    <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-black">{title}</h3><Button className="h-9 w-9 bg-slate-100 p-0 text-black hover:bg-slate-200" onClick={onClose}><X size={18}/></Button></div>
      {children}
    </div>
  </div>;
}
