import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50", className)} {...props}/>; }
