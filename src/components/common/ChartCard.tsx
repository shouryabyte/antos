import type { ReactNode } from "react";
export function ChartCard({ title, children }: { title:string; children:ReactNode }) {
  return <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft"><h3 className="mb-4 text-base font-black text-black">{title}</h3>{children}</section>;
}
