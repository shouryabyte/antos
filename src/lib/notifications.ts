import { uid } from "./utils";
import { useAppStore } from "../store/useAppStore";
import type { Notification } from "../types";

type NotificationInput = Omit<Notification, "id" | "isRead" | "createdAt"> & { isRead?: boolean };

export function createNotification(input: NotificationInput) {
  const store = useAppStore.getState();
  store.addItem("notifications", {
    id: uid("notif"),
    ...input,
    isRead: input.isRead ?? false,
    createdAt: new Date().toISOString()
  });
}

export function visibleNotifications(notifications: Notification[], userId?: string, role?: string | null) {
  if (role === "Super Admin") return notifications;
  return notifications.filter((item) => item.userId === userId || item.roleTarget === role);
}
