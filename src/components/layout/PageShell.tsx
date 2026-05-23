import type { ReactNode } from "react";
export function PageShell({ title, description, children }: { title:string; description?:string; children:ReactNode }) {
  return <main className="p-4 lg:p-6"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[.25em] text-purple-600">AntBox Operating System</p><h1 className="mt-2 text-3xl font-black tracking-tight text-black lg:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-slate-600">{description}</p>}</div>{children}</main>;
}
