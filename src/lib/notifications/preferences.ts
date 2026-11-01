import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useSyncExternalStore } from "react";

// The learner's "Study reminders" switch (prompts/12), saved on this device. On by default.
// expo-secure-store is already installed (Clerk's token cache); the value isn't secret, it's
// just the one on-device store the app has. Web has no reminders, so nothing is stored there.

const KEY = "study-reminders";

let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Reads the saved switch once (call early; until it resolves the default "on" applies). */
export async function loadReminderPreference(): Promise<boolean> {
  if (loaded || Platform.OS === "web") return enabled;
  try {
    enabled = (await SecureStore.getItemAsync(KEY)) !== "off";
  } catch {
    enabled = true;
  }
  loaded = true;
  emit();
  return enabled;
}

export function remindersEnabled(): boolean {
  return enabled;
}

export async function setRemindersEnabled(next: boolean) {
  enabled = next;
  loaded = true;
  emit();
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(KEY, next ? "on" : "off").catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The switch's current value, re-rendering when it changes. */
export function useRemindersEnabled(): boolean {
  return useSyncExternalStore(subscribe, remindersEnabled, remindersEnabled);
}

// Whether Syllo already showed the notification prompt on this device (first Home visit).
// Android reports a never-asked permission as "denied" with canAskAgain, so the OS status
// alone can't tell "never asked" from "refused once".
const ASKED_KEY = "notifications-asked";

export async function hasAskedForNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  try {
    return (await SecureStore.getItemAsync(ASKED_KEY)) === "yes";
  } catch {
    return false;
  }
}

export async function markAskedForNotifications() {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(ASKED_KEY, "yes").catch(() => undefined);
}
