import { netSalary, readinessScore, recommendation } from "./calculations";
import type { Asset, Attendance, CareerSprint, CorporatePartner, Department, Document, Employee, Expense, InternDeployment, Invoice, Leave, Payroll, Project, ReadinessScore, Role, Student, Task, Ticket, Timesheet } from "../types";

export const employees: Employee[] = [
  { id:"e1", employeeCode:"ABX-001", name:"Aarav Mehta", email:"aarav@antbox.in", phone:"+91 98765 10001", department:"Engineering", designation:"Frontend Lead", manager:"Riya Sharma", joiningDate:"2023-02-12", employmentType:"Full-time", salary:145000, workLocation:"Bengaluru", status:"Active", avatar:"AM", skills:["React","TypeScript","Design Systems"], documents:["Offer Letter","NDA"] },
  { id:"e2", employeeCode:"ABX-014", name:"Riya Sharma", email:"riya@antbox.in", phone:"+91 98765 10002", department:"Product", designation:"Product Manager", manager:"Nikhil Rao", joiningDate:"2022-11-01", employmentType:"Full-time", salary:180000, workLocation:"Remote", status:"Active", avatar:"RS", skills:["Product","SaaS","Analytics"], documents:["Offer Letter"] },
  { id:"e3", employeeCode:"ABX-027", name:"Kabir Sethi", email:"kabir@antbox.in", phone:"+91 98765 10003", department:"Academy", designation:"Sprint Mentor", manager:"Meera Iyer", joiningDate:"2023-08-18", employmentType:"Mentor", salary:90000, workLocation:"Mumbai", status:"Active", avatar:"KS", skills:["GTM","RevOps","Mentoring"], documents:["Contract"] },
  { id:"e4", employeeCode:"ABX-032", name:"Meera Iyer", email:"meera@antbox.in", phone:"+91 98765 10004", department:"IaaS Operations", designation:"Deployment Manager", manager:"Nikhil Rao", joiningDate:"2023-04-03", employmentType:"Full-time", salary:130000, workLocation:"Bengaluru", status:"Active", avatar:"MI", skills:["Operations","Client Success"], documents:["Offer Letter"] },
  { id:"e5", employeeCode:"ABX-046", name:"Devansh Jain", email:"devansh@antbox.in", phone:"+91 98765 10005", department:"Finance", designation:"Finance Manager", manager:"Nikhil Rao", joiningDate:"2022-09-15", employmentType:"Full-time", salary:125000, workLocation:"Delhi", status:"Active", avatar:"DJ", skills:["Payroll","Invoicing"], documents:["Offer Letter"] },
  { id:"e6", employeeCode:"ABX-061", name:"Ananya Menon", email:"ananya@antbox.in", phone:"+91 98765 10006", department:"Corporate Relations", designation:"Partner Lead", manager:"Meera Iyer", joiningDate:"2024-01-08", employmentType:"Full-time", salary:115000, workLocation:"Hyderabad", status:"Notice Period", avatar:"AM", skills:["Partnerships","Hiring"], documents:["Offer Letter"] }
];

export const departments: Department[] = ["HR","Operations","Academy","IaaS Operations","Sales","Finance","Product","Engineering","Mentorship","Corporate Relations"].map((name,i)=>({id:`d${i+1}`, name, head: employees[i % employees.length].name, employeeCount: 8+i*3, budget: 600000+i*95000, status:"Active"}));
export const attendance: Attendance[] = [
  { id:"a1", employeeId:"e1", date:"2026-05-22", checkIn:"09:51", checkOut:"18:36", workMode:"Hybrid", status:"Present", workingHours:8.8, regularizationStatus:"None" },
  { id:"a2", employeeId:"e2", date:"2026-05-22", checkIn:"10:28", checkOut:"18:12", workMode:"Remote", status:"Late", workingHours:7.7, regularizationStatus:"Pending" },
  { id:"a3", employeeId:"e3", date:"2026-05-22", checkIn:"", checkOut:"", workMode:"Remote", status:"Absent", workingHours:0, regularizationStatus:"None" },
  { id:"a4", employeeId:"e4", date:"2026-05-22", checkIn:"09:45", checkOut:"13:10", workMode:"Office", status:"Half Day", workingHours:3.4, regularizationStatus:"Approved" }
];
export const leaves: Leave[] = [
  { id:"l1", employeeId:"e2", leaveType:"Casual", fromDate:"2026-05-27", toDate:"2026-05-28", days:2, reason:"Family travel", status:"Pending", managerRemarks:"Awaiting coverage plan" },
  { id:"l2", employeeId:"e5", leaveType:"Sick", fromDate:"2026-05-17", toDate:"2026-05-17", days:1, reason:"Fever", status:"Approved", managerRemarks:"Approved" },
  { id:"l3", employeeId:"e6", leaveType:"Unpaid", fromDate:"2026-05-12", toDate:"2026-05-14", days:3, reason:"Personal", status:"Rejected", managerRemarks:"Critical partner reviews" }
];
export const payroll: Payroll[] = employees.slice(0,5).map((e,i)=>({id:`p${i+1}`, employeeId:e.id, month:"May 2026", basicSalary:e.salary, allowances:15000+i*2500, deductions:7000+i*900, lop:i===2?4500:0, netSalary:netSalary(e.salary,15000+i*2500,7000+i*900,i===2?4500:0), status:i<3?"Processed":i===3?"Paid":"Draft", paymentDate:i===4?"":"2026-05-30"}));
export const projects: Project[] = [
  { id:"pr1", projectCode:"ANT-PM-101", name:"RevOps Sprint Delivery", client:"ScaleGrid SaaS", manager:"Riya Sharma", startDate:"2026-04-01", deadline:"2026-06-10", assignedMembers:["e1","e3"], budget:900000, revenue:1450000, progress:72, status:"In Progress", health:"Yellow", priority:"High" },
  { id:"pr2", projectCode:"ANT-DA-209", name:"Analytics Intern Pod", client:"InsightLoop Analytics", manager:"Meera Iyer", startDate:"2026-03-10", deadline:"2026-05-20", assignedMembers:["e4","e6"], budget:620000, revenue:980000, progress:64, status:"Review", health:"Red", priority:"Critical" },
  { id:"pr3", projectCode:"ANT-AI-310", name:"AI Tools Career Sprint", client:"NimbleWorks AI", manager:"Kabir Sethi", startDate:"2026-05-15", deadline:"2026-07-15", assignedMembers:["e2","e3"], budget:700000, revenue:1200000, progress:24, status:"In Progress", health:"Green", priority:"Medium" }
];
export const tasks: Task[] = [
  { id:"t1", projectId:"pr1", title:"Build partner research brief", description:"Map ICP, hiring need, and GTM workflow", assignedTo:"e3", priority:"High", dueDate:"2026-05-25", estimatedHours:8, actualHours:5, status:"In Progress" },
  { id:"t2", projectId:"pr1", title:"Review student submissions", description:"Score sprint artifacts and mentor notes", assignedTo:"e2", priority:"Medium", dueDate:"2026-05-27", estimatedHours:6, actualHours:2, status:"To Do" },
  { id:"t3", projectId:"pr2", title:"Client dashboard QA", description:"Validate intern output against acceptance checklist", assignedTo:"e1", priority:"Critical", dueDate:"2026-05-23", estimatedHours:10, actualHours:9, status:"Review" },
  { id:"t4", projectId:"pr3", title:"AI tools rubric", description:"Finalize readiness evaluation rubric", assignedTo:"e3", priority:"Low", dueDate:"2026-05-30", estimatedHours:5, actualHours:5, status:"Done" }
];
export const timesheets: Timesheet[] = [
  { id:"ts1", employeeId:"e1", projectId:"pr2", taskId:"t3", date:"2026-05-22", hoursWorked:7, type:"Billable", description:"Dashboard QA and review", approvalStatus:"Approved" },
  { id:"ts2", employeeId:"e3", projectId:"pr1", taskId:"t1", date:"2026-05-22", hoursWorked:5, type:"Billable", description:"Partner research", approvalStatus:"Pending" },
  { id:"ts3", employeeId:"e2", projectId:"pr1", taskId:"t2", date:"2026-05-22", hoursWorked:2, type:"Non-billable", description:"Internal rubric planning", approvalStatus:"Rejected" }
];
export const students: Student[] = [
  { id:"s1", studentCode:"STU-1001", name:"Ishita Verma", email:"ishita@college.edu", phone:"+91 99880 11001", college:"Christ University", degree:"BBA", graduationYear:2026, skills:["GTM","Excel","Research"], careerInterest:"RevOps", sprintHistory:["RevOps Sprint"], readinessScore:88, portfolioLink:"https://portfolio.antbox.in/ishita", mentorFeedback:"Strong client communication", ppoStatus:"Recommended", status:"PPO Recommended" },
  { id:"s2", studentCode:"STU-1002", name:"Rahul Nair", email:"rahul@college.edu", phone:"+91 99880 11002", college:"SRM University", degree:"B.Tech CSE", graduationYear:2027, skills:["React","SQL","AI Tools"], careerInterest:"Software Development", sprintHistory:["AI Tools Sprint"], readinessScore:76, portfolioLink:"https://portfolio.antbox.in/rahul", mentorFeedback:"Good execution pace", ppoStatus:"Eligible", status:"Internship Deployed" },
  { id:"s3", studentCode:"STU-1003", name:"Aditi Kulkarni", email:"aditi@college.edu", phone:"+91 99880 11003", college:"NMIMS", degree:"MBA", graduationYear:2026, skills:["Product","Analytics"], careerInterest:"Product Management", sprintHistory:["Product Sprint"], readinessScore:91, portfolioLink:"https://portfolio.antbox.in/aditi", mentorFeedback:"High ownership", ppoStatus:"Offered", status:"Hired" }
];
export const sprints: CareerSprint[] = [
  { id:"sp1", sprintCode:"SPR-REV-26", name:"Revenue Operations Sprint", domain:"RevOps", corporatePartner:"ScaleGrid SaaS", mentor:"Kabir Sethi", startDate:"2026-05-01", endDate:"2026-06-15", studentsEnrolled:64, completionRate:78, averageReadinessScore:82, pposIssued:9, status:"Live", description:"Students solve real RevOps briefs for SaaS clients." },
  { id:"sp2", sprintCode:"SPR-AI-26", name:"AI Tools Sprint", domain:"AI Tools", corporatePartner:"NimbleWorks AI", mentor:"Riya Sharma", startDate:"2026-06-05", endDate:"2026-07-20", studentsEnrolled:48, completionRate:22, averageReadinessScore:74, pposIssued:2, status:"Upcoming", description:"Practical automation and AI workflow assignments." },
  { id:"sp3", sprintCode:"SPR-DA-25", name:"Data Analytics Sprint", domain:"Data Analytics", corporatePartner:"InsightLoop Analytics", mentor:"Meera Iyer", startDate:"2026-03-01", endDate:"2026-04-20", studentsEnrolled:82, completionRate:94, averageReadinessScore:86, pposIssued:14, status:"Completed", description:"Analytics pod delivery with mentor reviews." }
];
export const partners: CorporatePartner[] = [
  { id:"cp1", companyName:"ScaleGrid SaaS", contactPerson:"Neha Bansal", email:"neha@scalegrid.io", phone:"+91 90000 11111", industry:"SaaS", hiringNeed:"RevOps interns", activeSprints:2, internsDeployed:18, pposIssued:7, revenueGenerated:2250000, accountOwner:"Ananya Menon", status:"Active Partner" },
  { id:"cp2", companyName:"InsightLoop Analytics", contactPerson:"Vikram Shah", email:"vikram@insightloop.ai", phone:"+91 90000 22222", industry:"Analytics", hiringNeed:"Data analysts", activeSprints:1, internsDeployed:12, pposIssued:4, revenueGenerated:1480000, accountOwner:"Meera Iyer", status:"Active Partner" },
  { id:"cp3", companyName:"TeachMint Labs", contactPerson:"Pranav Joshi", email:"pranav@teachmintlabs.in", phone:"+91 90000 33333", industry:"EdTech", hiringNeed:"Product interns", activeSprints:0, internsDeployed:6, pposIssued:1, revenueGenerated:620000, accountOwner:"Ananya Menon", status:"Lead" }
];
export const deployments: InternDeployment[] = [
  { id:"dep1", studentId:"s1", internName:"Ishita Verma", corporateClient:"ScaleGrid SaaS", projectAssigned:"RevOps Sprint Delivery", mentor:"Kabir Sethi", startDate:"2026-05-12", endDate:"2026-07-12", attendancePercentage:96, timesheetCompliance:92, taskCompletion:89, clientFeedback:86, performanceScore:88, ppoProbability:84, status:"Active" },
  { id:"dep2", studentId:"s2", internName:"Rahul Nair", corporateClient:"NimbleWorks AI", projectAssigned:"AI Tools Career Sprint", mentor:"Riya Sharma", startDate:"2026-05-18", endDate:"2026-07-18", attendancePercentage:88, timesheetCompliance:76, taskCompletion:78, clientFeedback:74, performanceScore:76, ppoProbability:61, status:"Deployed" },
  { id:"dep3", studentId:"s3", internName:"Aditi Kulkarni", corporateClient:"InsightLoop Analytics", projectAssigned:"Analytics Intern Pod", mentor:"Meera Iyer", startDate:"2026-03-15", endDate:"2026-05-15", attendancePercentage:98, timesheetCompliance:96, taskCompletion:94, clientFeedback:91, performanceScore:92, ppoProbability:93, status:"PPO Offered" }
];
const scoreInputs = [
  { studentId:"s1", taskCompletion:89, mentorFeedback:91, clientFeedback:86, attendance:96, communication:88, timesheetDiscipline:92 },
  { studentId:"s2", taskCompletion:78, mentorFeedback:82, clientFeedback:74, attendance:88, communication:80, timesheetDiscipline:76 },
  { studentId:"s3", taskCompletion:94, mentorFeedback:95, clientFeedback:91, attendance:98, communication:93, timesheetDiscipline:96 }
];
export const readinessScores: ReadinessScore[] = scoreInputs.map((x,i)=>{ const finalScore = readinessScore(x); return { id:`rs${i+1}`, ...x, finalScore, recommendation: recommendation(finalScore, x.clientFeedback), strengths:["Ownership","Client communication"], improvementAreas: finalScore > 85 ? ["Scale documentation"] : ["Timesheet discipline","Structured updates"] }; });
export const invoices: Invoice[] = [
  { id:"inv1", invoiceNumber:"INV-2026-041", client:"ScaleGrid SaaS", projectOrSprint:"Revenue Operations Sprint", amount:825000, dueDate:"2026-05-30", paymentStatus:"Sent", revenueCategory:"Career Sprint", createdAt:"2026-05-05" },
  { id:"inv2", invoiceNumber:"INV-2026-038", client:"InsightLoop Analytics", projectOrSprint:"Analytics Intern Pod", amount:640000, dueDate:"2026-05-12", paymentStatus:"Overdue", revenueCategory:"Intern Deployment", createdAt:"2026-04-18" },
  { id:"inv3", invoiceNumber:"INV-2026-036", client:"TeachMint Labs", projectOrSprint:"Product Sprint", amount:420000, dueDate:"2026-05-02", paymentStatus:"Paid", revenueCategory:"Corporate Training", createdAt:"2026-04-10" }
];
export const expenses: Expense[] = [
  { id:"ex1", category:"Mentor Payout", description:"Sprint mentor honorarium", amount:180000, date:"2026-05-08", status:"Approved" },
  { id:"ex2", category:"Software", description:"Analytics and assessment tools", amount:76000, date:"2026-05-10", status:"Paid" },
  { id:"ex3", category:"Operations", description:"Campus activation travel", amount:94000, date:"2026-05-16", status:"Pending" }
];
export const assets: Asset[] = [
  { id:"as1", assetCode:"LAP-044", assetType:"Laptop", assignedTo:"Aarav Mehta", issueDate:"2024-02-12", condition:"Good", returnStatus:"Not Due", status:"Assigned" },
  { id:"as2", assetCode:"ACC-118", assetType:"Software Access", assignedTo:"Rahul Nair", issueDate:"2026-05-18", condition:"Active", returnStatus:"Due on internship end", status:"Assigned" },
  { id:"as3", assetCode:"ID-221", assetType:"ID Card", assignedTo:"Ishita Verma", issueDate:"2026-05-12", condition:"New", returnStatus:"Not Due", status:"Assigned" }
];
export const documents: Document[] = [
  { id:"doc1", title:"Ishita Internship Letter", documentType:"Internship Letter", owner:"Ishita Verma", uploadedDate:"2026-05-12", status:"Verified" },
  { id:"doc2", title:"ScaleGrid Master Service Agreement", documentType:"Client Contract", owner:"Ananya Menon", uploadedDate:"2026-04-21", status:"Uploaded" },
  { id:"doc3", title:"Aarav May Payslip", documentType:"Payslip", owner:"Aarav Mehta", uploadedDate:"2026-05-30", status:"Uploaded" }
];
export const tickets: Ticket[] = [
  { id:"tk1", ticketNumber:"TKT-1001", title:"Timesheet approval stuck", category:"Project Blocker", raisedBy:"Ishita Verma", assignedTo:"Meera Iyer", priority:"High", status:"In Progress", createdAt:"2026-05-22" },
  { id:"tk2", ticketNumber:"TKT-1002", title:"Payroll deduction clarification", category:"Payroll Issue", raisedBy:"Kabir Sethi", assignedTo:"Devansh Jain", priority:"Medium", status:"Assigned", createdAt:"2026-05-21" },
  { id:"tk3", ticketNumber:"TKT-1003", title:"Need CRM access", category:"IT Access", raisedBy:"Ananya Menon", assignedTo:"Aarav Mehta", priority:"Low", status:"Resolved", createdAt:"2026-05-20" }
];
export const roles: Role[] = [
  { id:"r1", name:"Super Admin", permissions:["Everything"] },
  { id:"r2", name:"HR Manager", permissions:["Employees","Attendance","Leave","Payroll"] },
  { id:"r3", name:"Project Manager", permissions:["Projects","Tasks","Timesheets"] },
  { id:"r4", name:"Mentor", permissions:["Sprints","Students","Feedback","Readiness Scores"] },
  { id:"r5", name:"Finance Manager", permissions:["Invoices","Payroll","Expenses","Profitability"] },
  { id:"r6", name:"Employee", permissions:["Attendance","Leave","Tasks","Payslip"] },
  { id:"r7", name:"Intern", permissions:["Tasks","Attendance","Timesheets"] },
  { id:"r8", name:"Student", permissions:["Sprints","Submissions","Readiness Score"] },
  { id:"r9", name:"Corporate Partner", permissions:["Assigned Interns","Feedback","Invoices"] }
];

export const mockData = { employees, departments, attendance, leaves, payroll, projects, tasks, timesheets, students, sprints, partners, deployments, readinessScores, invoices, expenses, assets, documents, tickets, roles };
