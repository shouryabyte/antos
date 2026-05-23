import type { Timesheet } from "../types";

export function utilizationPercentage(timesheets: Timesheet[]) {
  const approved = timesheets.filter((item) => item.approvalStatus === "Approved");
  const total = approved.reduce((sum, item) => sum + item.hoursWorked, 0);
  const billable = approved.filter((item) => item.type === "Billable").reduce((sum, item) => sum + item.hoursWorked, 0);
  return total ? Math.round((billable / total) * 100) : 0;
}

export function hasDuplicateTimesheet(timesheets: Timesheet[], employeeId: string, taskId: string, date: string) {
  return timesheets.some((item) =>
    item.employeeId === employeeId &&
    item.taskId === taskId &&
    item.date === date &&
    item.approvalStatus !== "Rejected"
  );
}
