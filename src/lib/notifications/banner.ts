import type { IDynamicNotification } from "@/components/ui/dynamic-notifications";
import { toast } from "@/components/ui/toast";

// Shows the Dynamic Island banner from code that isn't a component (notification
// listeners, flows like finishing a lesson). The host in the root layout registers the
// trigger. Before it mounts, and on web where there's no banner, an info toast shows instead.

export type BannerNotification = IDynamicNotification;

let triggerImpl: ((notification: BannerNotification) => void) | null = null;

export function setBannerTrigger(trigger: ((notification: BannerNotification) => void) | null) {
  triggerImpl = trigger;
}

export function showBanner(notification: BannerNotification) {
  if (triggerImpl) {
    triggerImpl(notification);
    return;
  }
  toast.info(notification.title, notification.message);
}
