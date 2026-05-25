import { addDays, format } from "date-fns";
import { supabase } from "./supabase";
import type { AuthProfile } from "../auth/AuthProvider";
import type { RoleName } from "../auth/permissions";

export const lifecycleBlockedStatuses = ["Suspended", "Exited"];
export const profileCompletionStatuses = ["Invited", "Pending Profile Completion"];
export const limitedStudentStatuses = ["Pending Verification"];
export const limitedPartnerStatuses = ["Pending Partner Approval", "Pending Partner"];
export const privilegedRoles: RoleName[] = ["Super Admin", "HR Manager", "Finance Manager", "Project Manager", "Mentor"];

export type RoleRow = { id: string; name: RoleName };

export function allowedInviteRoles(role: RoleName | null): RoleName[] {
  if (role === "Super Admin") return ["Super Admin", "HR Manager", "Project Manager", "Mentor", "Finance Manager", "Employee", "Intern", "Student", "Corporate Partner"];
  if (role === "HR Manager") return ["Employee", "Intern"];
  return [];
}

export function onboardingTasksForRole(role: RoleName) {
  if (role === "Student") return [
    ["Complete academic profile", "academic_profile"],
    ["Add skills", "skills"],
    ["Add portfolio link", "portfolio"],
    ["Select career interest", "career_interest"]
  ];
  if (role === "Corporate Partner") return [
    ["Complete company profile", "company_profile"],
    ["Add hiring requirement", "hiring_requirement"],
    ["Verify contact details", "contact_verification"]
  ];
  return [
    ["Complete personal details", "personal_details"],
    ["Upload documents", "documents"],
    ["Add emergency contact", "emergency_contact"],
    ["Review company policies", "policies"],
    ["Set up attendance profile", "attendance_profile"]
  ];
}

export async function autoExpireInvitations() {
  if (!supabase) return;
  await supabase
    .from("user_invitations")
    .update({ status: "Expired" })
    .eq("status", "Pending")
    .lt("expires_at", new Date().toISOString());
}

export async function generateOnboardingTasks(profileId: string, role: RoleName) {
  if (!supabase) return;
  const dueDate = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const rows = onboardingTasksForRole(role).map(([task_title, task_type]) => ({
    profile_id: profileId,
    task_title,
    task_type,
    status: "Pending",
    due_date: dueDate
  }));
  await supabase.from("onboarding_tasks").upsert(rows, { onConflict: "profile_id,task_type" });
}

export async function logAudit(actor: AuthProfile | null, action: string, module: string, targetId?: string, metadata?: Record<string, unknown>, oldValue?: unknown, newValue?: unknown) {
  if (!supabase) return;
  await supabase.from("audit_logs").insert({
    actor_user_id: actor?.id,
    actor_role: actor?.role,
    action,
    module,
    target_id: targetId,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    metadata: metadata ?? null
  });
}

export async function createAccountNotification(input: { userId?: string; roleTarget?: string; title: string; message: string; type?: string; module?: string }) {
  if (!supabase) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    role_target: input.roleTarget,
    title: input.title,
    message: input.message,
    type: input.type || "Info",
    related_module: input.module || "Account",
    is_read: false
  });
}

export async function acceptPendingInvitationForUser(userId: string, email: string) {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data: invitation } = await supabase
    .from("user_invitations")
    .select("*, roles(name)")
    .eq("email", email.toLowerCase())
    .eq("status", "Pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return null;

  const roleName = invitation.roles?.name as RoleName | undefined;
  const nextProfile = {
    id: userId,
    email: invitation.email,
    full_name: invitation.full_name,
    role_id: invitation.role_id,
    employee_id: invitation.employee_id,
    student_id: invitation.student_id,
    corporate_partner_id: invitation.corporate_partner_id,
    status: "Pending Profile Completion"
  };

  const { error } = await supabase.from("profiles").upsert(nextProfile, { onConflict: "id" });
  if (error) throw error;

  await supabase.from("user_invitations").update({ status: "Accepted", accepted_at: now }).eq("id", invitation.id);
  if (roleName) await generateOnboardingTasks(userId, roleName);
  await logAudit(null, "invite accepted", "Account", invitation.id, { email });
  return invitation;
}

export async function acceptInvitationForSignedInUser(userId: string, email: string, token: string) {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data: invitation, error: invitationError } = await supabase
    .from("user_invitations")
    .select("*, roles(name)")
    .eq("invite_token", token)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (invitationError) throw invitationError;
  if (!invitation) return null;
  if (invitation.status === "Accepted") return invitation;
  if (invitation.status !== "Pending" || invitation.expires_at <= now) return null;

  const roleName = invitation.roles?.name as RoleName | undefined;
  const nextProfile = {
    id: userId,
    email: invitation.email,
    full_name: invitation.full_name,
    role_id: invitation.role_id,
    employee_id: invitation.employee_id,
    student_id: invitation.student_id,
    corporate_partner_id: invitation.corporate_partner_id,
    status: "Pending Profile Completion"
  };

  const { error: profileError } = await supabase.from("profiles").upsert(nextProfile, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: inviteError } = await supabase.from("user_invitations").update({ status: "Accepted", accepted_at: now }).eq("id", invitation.id);
  if (inviteError) throw inviteError;

  if (roleName) await generateOnboardingTasks(userId, roleName);
  await logAudit(null, "invite accepted", "Account", invitation.id, { email, tokenAccepted: true });
  await createAccountNotification({ userId, title: "Invitation accepted", message: "Your AntOS account was created. Complete your profile to continue.", type: "Success", module: "Account" });
  return invitation;
}

export function isProfileComplete(role: RoleName, values: Record<string, string>) {
  if (role === "Student") {
    return Boolean(values.college && values.degree && values.graduationYear && values.skills && values.careerInterest && values.portfolioLink);
  }
  if (role === "Corporate Partner") {
    return Boolean(values.companyName && values.contactPerson && values.designation && values.industry && values.hiringRequirement);
  }
  return Boolean(values.phone && values.emergencyContact && values.address && values.profilePhoto && values.documents && values.bankDetails);
}

export function nextStatusAfterProfileCompletion(role: RoleName, currentStatus?: string) {
  if (role === "Student" || currentStatus === "Pending Verification") return "Pending Verification";
  if (role === "Corporate Partner" || currentStatus === "Pending Partner Approval" || currentStatus === "Pending Partner") return "Pending Partner Approval";
  return "Active";
}
