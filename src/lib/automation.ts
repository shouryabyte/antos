import { eachDayOfInterval, format, isWeekend, startOfMonth, subDays } from "date-fns";
import { attendanceStatus, calculateWorkingHours, projectHealth, readinessScore, recommendation } from "./calculations";
import { syncApprovedLeaveToAttendance } from "./leaveUtils";
import { uid } from "./utils";
import { useAppStore } from "../store/useAppStore";
import type { Student } from "../types";

export type PendingApprovalCounts = {
  leaves: number;
  regularizations: number;
  timesheets: number;
  invoices: number;
  atRiskProjects: number;
  total: number;
};

export function runAntosAutomation() {
  const store = useAppStore.getState();
  const data = snapshot(store);
  const today = new Date();
  const yesterday = subDays(today, 1);

  const syncedData = syncApprovedLeaveToAttendance(data);
  Object.assign(data, syncedData);
  autoMarkAbsent(data, yesterday);
  autoCalculateAttendance(data);
  autoCalculateProjectHealth(data);
  autoCalculateReadinessAndPpo(data);

  store.replaceData(data);
}

export function getPendingApprovalCounts(data = useAppStore.getState()): PendingApprovalCounts {
  const leaves = data.leaves.filter((item) => item.status === "Pending").length;
  const regularizations = data.attendance.filter((item) => item.regularizationStatus === "Pending").length;
  const timesheets = data.timesheets.filter((item) => item.approvalStatus === "Pending").length;
  const invoices = data.invoices.filter((item) => item.paymentStatus === "Draft" || item.paymentStatus === "Overdue").length;
  const atRiskProjects = data.projects.filter((item) => item.health === "Red").length;
  return { leaves, regularizations, timesheets, invoices, atRiskProjects, total: leaves + regularizations + timesheets + invoices };
}

function autoMarkAbsent(data: ReturnType<typeof snapshot>, untilDate: Date) {
  const workingDays = eachDayOfInterval({ start: startOfMonth(untilDate), end: untilDate }).filter((day) => !isWeekend(day));
  data.employees
    .filter((employee) => employee.status === "Active")
    .forEach((employee) => {
      workingDays.forEach((day) => {
        const date = format(day, "yyyy-MM-dd");
        const hasAttendance = data.attendance.some((record) => record.employeeId === employee.id && record.date === date);
        const hasApprovedLeave = hasLeaveForDate(data, employee.id, date);
        if (!hasAttendance && !hasApprovedLeave) {
          data.attendance.push({
            id: uid("auto-att"),
            employeeId: employee.id,
            date,
            checkIn: "",
            checkOut: "",
            workMode: "Hybrid",
            status: "Absent",
            workingHours: 0,
            regularizationStatus: "None",
            remarks: "Auto-marked absent"
          });
        }
      });
    });
}

function autoCalculateAttendance(data: ReturnType<typeof snapshot>) {
  data.attendance.forEach((record) => {
    if (record.status === "Leave" || record.status === "Absent") return;
    const workingHours = calculateWorkingHours(record.checkIn, record.checkOut);
    record.workingHours = workingHours;
    record.status = attendanceStatus(record.checkIn, record.checkOut);
  });
}

function autoCalculateProjectHealth(data: ReturnType<typeof snapshot>) {
  data.projects.forEach((project) => {
    project.health = projectHealth(project.deadline, project.progress);
  });
}

function autoCalculateReadinessAndPpo(data: ReturnType<typeof snapshot>) {
  data.readinessScores.forEach((score) => {
    const finalScore = readinessScore({
      taskCompletion: score.taskCompletion,
      mentorFeedback: score.mentorFeedback,
      clientFeedback: score.clientFeedback,
      attendance: score.attendance,
      communication: score.communication,
      timesheetDiscipline: score.timesheetDiscipline
    });
    score.finalScore = finalScore;
    score.recommendation = recommendation(finalScore, score.clientFeedback);
    const student = data.students.find((item) => item.id === score.studentId);
    if (student) syncStudentPpo(student, score.recommendation, finalScore);
  });
}

function syncStudentPpo(student: Student, nextRecommendation: ReturnType<typeof recommendation>, finalScore: number) {
  student.readinessScore = finalScore;
  if (student.ppoStatus === "Offered" || student.ppoStatus === "Hired") return;
  if (nextRecommendation === "PPO Ready" || nextRecommendation === "High Potential") {
    student.ppoStatus = "Recommended";
    student.status = "PPO Recommended";
  } else if (nextRecommendation === "Internship Ready") {
    student.ppoStatus = "Eligible";
  } else {
    student.ppoStatus = "Not Eligible";
  }
}

function hasLeaveForDate(data: ReturnType<typeof snapshot>, employeeId: string, date: string) {
  return data.leaves.some((leave) => {
    if (leave.employeeId !== employeeId || leave.status !== "Approved") return false;
    return date >= leave.fromDate && date <= leave.toDate;
  });
}

function snapshot(state: ReturnType<typeof useAppStore.getState>) {
  return {
    employees: state.employees.map((item) => ({ ...item })),
    departments: state.departments.map((item) => ({ ...item })),
    attendance: state.attendance.map((item) => ({ ...item })),
    leaves: state.leaves.map((item) => ({ ...item })),
    payroll: state.payroll.map((item) => ({ ...item })),
    projects: state.projects.map((item) => ({ ...item, assignedMembers: [...item.assignedMembers] })),
    tasks: state.tasks.map((item) => ({ ...item })),
    timesheets: state.timesheets.map((item) => ({ ...item })),
    students: state.students.map((item) => ({ ...item, skills: [...item.skills], sprintHistory: [...item.sprintHistory] })),
    sprints: state.sprints.map((item) => ({ ...item })),
    partners: state.partners.map((item) => ({ ...item })),
    deployments: state.deployments.map((item) => ({ ...item })),
    readinessScores: state.readinessScores.map((item) => ({ ...item, strengths: [...item.strengths], improvementAreas: [...item.improvementAreas] })),
    invoices: state.invoices.map((item) => ({ ...item })),
    expenses: state.expenses.map((item) => ({ ...item })),
    assets: state.assets.map((item) => ({ ...item })),
    documents: state.documents.map((item) => ({ ...item })),
    tickets: state.tickets.map((item) => ({ ...item })),
    roles: state.roles.map((item) => ({ ...item, permissions: [...item.permissions] }))
  };
}
