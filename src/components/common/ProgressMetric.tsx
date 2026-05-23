import { pct } from "../../lib/utils";
export function ProgressMetric({ label, value, color="bg-emerald-500" }: { label:string; value:number; color?:string }) {
  return <div className="space-y-2"><div className="flex justify-between text-sm"><span className="font-medium text-slate-700">{label}</span><span className="font-bold">{pct(value)}</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className={`${color} h-2.5 rounded-full`} style={{width:`${Math.min(100,value)}%`}} /></div></div>;
}
