import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
export function StatCard({ label, value, icon:Icon, tone="emerald", helper }: { label:string; value:string|number; icon?:LucideIcon; tone?: "emerald"|"purple"|"blue"|"amber"|"red"; helper?:string }) {
  const tones = { emerald:"bg-emerald-50 text-emerald-700", purple:"bg-purple-50 text-purple-700", blue:"bg-sky-50 text-sky-700", amber:"bg-amber-50 text-amber-700", red:"bg-red-50 text-red-700" };
  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-sm font-medium text-slate-500">{label}</p><h3 className="mt-2 text-2xl font-black tracking-tight text-black">{value}</h3>{helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}</div>
      {Icon && <div className={cn("rounded-2xl p-3", tones[tone])}><Icon size={20}/></div>}
    </div>
  </div>;
}
