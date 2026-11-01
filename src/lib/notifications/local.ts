import { type Href, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import { PALETTE } from "@/components/ui/dynamic-notifications/conf/palette";

import { showBanner } from "./banner";

// Local notifications (expo-notifications, set up as in havenly): no push server and no
// push token. While the app is open, a notification shows as the Dynamic Island banner
// instead of the system one. Scheduled notifications tag `data.kind` so a feature can cancel
// and rebuild its own (study reminders: study-reminders.ts), and may carry `data.url`, the
// route a tap opens.

/** Study reminders' channel (prompts/12): HIGH importance, as in the older pharmacy app. */
export const CHANNEL_ID = "study-reminders";
// The pre-prompts/12 channel. Android can't raise an existing channel's importance, so the
// reminders moved to a new id and the old one is removed.
const OLD_CHANNEL_ID = "reminders";

export const notificationsSupported = Platform.OS !== "web";

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    // In the foreground the banner takes over; the notification still lands in the list.
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** The route a notification opens when tapped (`data.url`), if it carries one. */
export function notificationUrl(data: Record<string, unknown> | undefined | null): Href | null {
  const url = data?.url;
  return typeof url === "string" && url.startsWith("/") ? (url as Href) : null;
}

/** Shows notifications that arrive while the app is open as the Dynamic Island banner. */
export function listenForNotifications() {
  if (!notificationsSupported) return () => {};
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body, data } = notification.request.content;
    const url = notificationUrl(data);
    showBanner({
      title: title ?? "Syllo",
      message: body ?? undefined,
      onPress: url ? () => router.push(url) : undefined,
    });
  });
  return () => subscription.remove();
}

export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export async function permissionState(): Promise<PermissionState> {
  if (!notificationsSupported) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Whether the OS would still show its permission dialog (false once refused for good). */
export async function canAskPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  return current.status === "granted" || current.canAskAgain;
}

/** Creates the study reminders channel (Android 13+ shows the permission dialog only once one exists). */
async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Study reminders",
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: PALETTE.accent,
  });
  await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL_ID).catch(() => undefined);
}

/** Asks once; returns whether notifications can be shown. */
export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
