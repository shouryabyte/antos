import { Search } from "lucide-react";
import type { ReactNode } from "react";
export function SearchAndFilterBar({ value, onChange, right }: { value:string; onChange:(value:string)=>void; right?:ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
    <label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-400" placeholder="Search AntOS records..." value={value} onChange={e=>onChange(e.target.value)} /></label>
    {right}
  </div>;
}
