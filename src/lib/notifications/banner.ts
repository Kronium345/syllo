import type { IDynamicNotification } from "@/components/ui/dynamic-notifications";

// Shows the Dynamic Island banner from code that isn't a component (notification
// listeners, flows like finishing a lesson). The host in the root layout registers the
// trigger. Before it mounts, and on web where there's no banner, nothing shows yet;
// a toast fallback comes with the design system.

export type BannerNotification = IDynamicNotification;

let triggerImpl: ((notification: BannerNotification) => void) | null = null;

export function setBannerTrigger(trigger: ((notification: BannerNotification) => void) | null) {
  triggerImpl = trigger;
}

export function showBanner(notification: BannerNotification) {
  triggerImpl?.(notification);
}
