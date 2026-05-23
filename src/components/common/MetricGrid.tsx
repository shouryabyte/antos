import type { ReactNode } from "react";
export function MetricGrid({ children }: { children:ReactNode }) { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>; }
