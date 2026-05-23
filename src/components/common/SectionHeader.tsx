import type { ReactNode } from "react";
export function SectionHeader({ eyebrow, title, action }: { eyebrow?:string; title:string; action?:ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="text-xs font-black uppercase tracking-[.22em] text-purple-600">{eyebrow}</p>}<h2 className="mt-1 text-2xl font-black tracking-tight text-black">{title}</h2></div>{action}</div>;
}
