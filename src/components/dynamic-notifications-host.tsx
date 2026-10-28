import { ReactNode, useEffect } from "react";

import { DynamicNotifications, useDynamicNotifications } from "@/components/ui/dynamic-notifications";
import { setBannerTrigger } from "@/lib/notifications/banner";
import { listenForNotifications } from "@/lib/notifications/local";

/** Hands the mounted banner's trigger to `showBanner`, and banners notifications that arrive in the foreground. */
function BannerBridge() {
  const { trigger } = useDynamicNotifications();
  useEffect(() => {
    setBannerTrigger(trigger);
    return () => setBannerTrigger(null);
  }, [trigger]);
  useEffect(() => listenForNotifications(), []);
  return null;
}

/** The Dynamic Island banner (ported from havenly, originally oq-agile-athletes) over the whole app. */
export function DynamicNotificationsHost({ children }: { children: ReactNode }) {
  return (
    <DynamicNotifications>
      <BannerBridge />
      {children}
    </DynamicNotifications>
  );
}
