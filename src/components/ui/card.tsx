import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border border-black/5 bg-white p-5 shadow-soft", className)} {...props}/>; }
