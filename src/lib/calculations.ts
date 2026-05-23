import { differenceInMinutes, parse } from "date-fns";
import type { ReadinessScore } from "../types";

export function calculateWorkingHours(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const base = new Date();
  const start = parse(checkIn, "HH:mm", base);
  const end = parse(checkOut, "HH:mm", base);
  return Math.max(0, +(differenceInMinutes(end, start) / 60).toFixed(1));
}
export function attendanceStatus(checkIn: string, checkOut: string) {
  if (!checkIn) return "Not Checked In" as const;
  if (!checkOut) return checkIn > "10:15" ? "Late" as const : "Present" as const;
  const hours = calculateWorkingHours(checkIn, checkOut);
  if (hours < 4) return "Half Day" as const;
  if (checkIn > "10:15") return "Late" as const;
  return "Present" as const;
}
export const netSalary = (basicSalary:number, allowances:number, deductions:number, lop:number) => basicSalary + allowances - deductions - lop;
export function projectHealth(deadline:string, progress:number) {
  if (new Date(deadline) < new Date() && progress < 80) return "Red" as const;
  if (progress >= 50 && progress <= 80) return "Yellow" as const;
  return "Green" as const;
}
export const utilization = (billable:number, total:number) => total ? Math.round((billable / total) * 100) : 0;
export function readinessScore(input: Omit<ReadinessScore, "id"|"studentId"|"finalScore"|"recommendation"|"strengths"|"improvementAreas">) {
  return Math.round(input.taskCompletion*.3 + input.mentorFeedback*.25 + input.clientFeedback*.2 + input.attendance*.1 + input.communication*.1 + input.timesheetDiscipline*.05);
}
export function recommendation(score:number, clientFeedback = 0) {
  if (score >= 90) return "High Potential" as const;
  if (score >= 85 && clientFeedback >= 80) return "PPO Ready" as const;
  if (score >= 70) return "Internship Ready" as const;
  return "Needs Training" as const;
}
export const netProfit = (revenue:number, payrollCost:number, projectCost:number, operationalExpenses:number) => revenue - payrollCost - projectCost - operationalExpenses;
