import { supabase } from "./supabase";
import type { Notification } from "../types";

type NotificationInput = Omit<Notification, "id" | "isRead" | "createdAt"> & { isRead?: boolean };

export async function createNotification(input: NotificationInput) {
  if (!supabase) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    role_target: input.roleTarget,
    title: input.title,
    message: input.message,
    type: input.type,
    related_module: input.relatedModule,
    is_read: input.isRead ?? false
  });
}

export function visibleNotifications(notifications: Notification[], userId?: string, role?: string | null) {
  if (role === "Super Admin") return notifications;
  return notifications.filter((item) => item.userId === userId || item.roleTarget === role);
}
