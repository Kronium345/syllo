import { Linking } from "react-native";

import { toast } from "@/components/ui/toast";

export const SUPPORT_EMAIL = "awolowodaniel@yahoo.ie";

/** Opens a new email to support; without a mail app, shows the address instead. */
export async function emailSupport() {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Syllo help")}`;
  try {
    await Linking.openURL(url);
  } catch {
    toast.info("Email us at", SUPPORT_EMAIL);
  }
}
