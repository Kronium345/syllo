import { toast } from "@/components/ui/toast";

// Placeholders for what isn't built yet, so taps never do nothing.

/** Buttons whose feature isn't designed yet (notifications, filters). */
export function featureComingSoon(feature: string) {
  toast.info("Coming soon", `${feature} arrive in a later update.`);
}
