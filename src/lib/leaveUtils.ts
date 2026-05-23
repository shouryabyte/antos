import { eachDayOfInterval, format, isSameMonth, parseISO } from "date-fns";
import { uid } from "./utils";
import type { AppData } from "./storage";
import type { Attendance, Leave } from "../types";

export const leaveEntitlements: Record<Leave["leaveType"], number> = {
  Casual: 12,
  Sick: 8,
  Earned: 15,
  Unpaid: 0
};

export function calculateLeaveDays(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || new Date(toDate) < new Date(fromDate)) return 0;
  return eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) }).length;
}

export function hasOverlappingLeave(leaves: Leave[], employeeId: string, fromDate: string, toDate: string) {
  return leaves.some((leave) => {
    if (leave.employeeId !== employeeId || leave.status === "Rejected") return false;
    return fromDate <= leave.toDate && toDate >= leave.fromDate;
  });
}

export function getLeaveBalances(leaves: Leave[], employeeId: string) {
  return (Object.keys(leaveEntitlements) as Leave["leaveType"][]).map((type) => {
    const used = leaves
      .filter((leave) => leave.employeeId === employeeId && leave.leaveType === type && leave.status === "Approved")
      .reduce((sum, leave) => sum + leave.days, 0);
    const total = leaveEntitlements[type];
    return {
      type,
      total,
      used,
      available: type === "Unpaid" ? "Unlimited" : Math.max(0, total - used),
      lopDays: type === "Unpaid" ? used : 0
    };
  });
}

export function getLOPDays(employeeId: string, month: Date, leaves: Leave[], attendance: Attendance[]) {
  const unpaidLeaveDays = leaves
    .filter((leave) => leave.employeeId === employeeId && leave.leaveType === "Unpaid" && leave.status === "Approved")
    .flatMap((leave) => eachDayOfInterval({ start: parseISO(leave.fromDate), end: parseISO(leave.toDate) }))
    .filter((day) => isSameMonth(day, month)).length;
  const unregularizedAbsences = attendance.filter((record) =>
    record.employeeId === employeeId &&
    record.status === "Absent" &&
    record.regularizationStatus !== "Approved" &&
    isSameMonth(parseISO(record.date), month)
  ).length;
  return unpaidLeaveDays + unregularizedAbsences;
}

export function syncApprovedLeaveToAttendance(data: AppData): AppData {
  const attendance = data.attendance.map((record) => ({ ...record }));
  data.leaves
    .filter((leave) => leave.status === "Approved")
    .forEach((leave) => {
      eachDayOfInterval({ start: parseISO(leave.fromDate), end: parseISO(leave.toDate) }).forEach((day) => {
        const date = format(day, "yyyy-MM-dd");
        const existing = attendance.find((record) => record.employeeId === leave.employeeId && record.date === date);
        const patch = {
          checkIn: "",
          checkOut: "",
          workMode: "Leave" as const,
          status: "Leave" as const,
          workingHours: 0,
          leaveRequestId: leave.id,
          regularizationStatus: "None" as const,
          remarks: `${leave.leaveType} leave approved`
        };
        if (existing) Object.assign(existing, patch);
        else attendance.push({ id: uid("leave-att"), employeeId: leave.employeeId, date, ...patch });
      });
    });
  return { ...data, attendance };
}
