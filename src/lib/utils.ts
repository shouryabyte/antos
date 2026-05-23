import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const inr = (value:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
export const pct = (value:number) => `${Math.round(value)}%`;
export const uid = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
