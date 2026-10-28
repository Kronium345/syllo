import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import { PALETTE } from "@/components/ui/dynamic-notifications/conf/palette";

import { showBanner } from "./banner";

// Local notifications (expo-notifications, set up as in havenly): no push server and no
// push token. While the app is open, a notification shows as the Dynamic Island banner
// instead of the system one. Scheduling (e.g. lesson reminders) is a later feature and
// should tag its notifications with `data.kind` so it can cancel and rebuild its own.

export const CHANNEL_ID = "reminders";

const supported = Platform.OS !== "web";

if (supported) {
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

/** Shows notifications that arrive while the app is open as the Dynamic Island banner. */
export function listenForNotifications() {
  if (!supported) return () => {};
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
    showBanner({ title: title ?? "Syllo", message: body ?? undefined });
  });
  return () => subscription.remove();
}

export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export async function permissionState(): Promise<PermissionState> {
  if (!supported) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Asks once; returns whether notifications can be shown. */
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Reminders",
      importance: AndroidImportance.DEFAULT,
      lightColor: PALETTE.accent,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
