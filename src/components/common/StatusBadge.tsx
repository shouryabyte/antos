import { cn } from "../../lib/utils";
const map: Record<string,string> = {
  Active:"bg-emerald-50 text-emerald-700 border-emerald-200", Present:"bg-emerald-50 text-emerald-700 border-emerald-200", Paid:"bg-emerald-50 text-emerald-700 border-emerald-200", Approved:"bg-emerald-50 text-emerald-700 border-emerald-200", Completed:"bg-emerald-50 text-emerald-700 border-emerald-200", Verified:"bg-emerald-50 text-emerald-700 border-emerald-200", Resolved:"bg-emerald-50 text-emerald-700 border-emerald-200", Hired:"bg-emerald-50 text-emerald-700 border-emerald-200", Green:"bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending:"bg-amber-50 text-amber-700 border-amber-200", Late:"bg-amber-50 text-amber-700 border-amber-200", Review:"bg-amber-50 text-amber-700 border-amber-200", Sent:"bg-sky-50 text-sky-700 border-sky-200", Live:"bg-sky-50 text-sky-700 border-sky-200", Processed:"bg-sky-50 text-sky-700 border-sky-200", Yellow:"bg-amber-50 text-amber-700 border-amber-200",
  Draft:"bg-slate-50 text-slate-700 border-slate-200",
  Rejected:"bg-red-50 text-red-700 border-red-200", Overdue:"bg-red-50 text-red-700 border-red-200", Red:"bg-red-50 text-red-700 border-red-200", Absent:"bg-red-50 text-red-700 border-red-200", Critical:"bg-red-50 text-red-700 border-red-200",
  "Not Checked In":"bg-slate-50 text-slate-700 border-slate-200",
  "PPO Ready":"bg-violet-50 text-violet-700 border-violet-200", "High Potential":"bg-purple-50 text-purple-700 border-purple-200", "Internship Ready":"bg-blue-50 text-blue-700 border-blue-200"
};
export function StatusBadge({ value }: { value:string }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", map[value] || "bg-slate-50 text-slate-700 border-slate-200")}>{value}</span>;
}
