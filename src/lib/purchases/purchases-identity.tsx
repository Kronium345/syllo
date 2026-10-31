import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import Purchases from "react-native-purchases";

import { useSyncPremium } from "../queries/purchases/use-sync-premium";
import { purchasesSupported } from "./configure";

/**
 * Ties RevenueCat to the Clerk user: logIn on sign-in (a purchase made anonymously before
 * sign-up carries over to the account), logOut on sign-out. After logIn it asks the
 * server (premium-sync) to re-read Pro status, which the quiz limit trusts. Mounted in
 * the root layout.
 */
export function PurchasesIdentity() {
  const { isLoaded, userId } = useAuth();
  const lastUserId = useRef<string | null>(null);
  const { mutate: syncPremium } = useSyncPremium();

  useEffect(() => {
    if (!isLoaded || !purchasesSupported) return;
    const previous = lastUserId.current;
    lastUserId.current = userId ?? null;
    if (userId && userId !== previous) {
      Purchases.logIn(userId)
        .then(() => syncPremium(undefined, { onError: (error) => console.warn("premium-sync failed:", error.message) }))
        .catch((error) => console.warn("RevenueCat logIn failed:", error));
    } else if (!userId && previous) {
      Purchases.isAnonymous()
        .then((anonymous) => (anonymous ? undefined : Purchases.logOut()))
        .catch((error) => console.warn("RevenueCat logOut failed:", error));
    }
  }, [isLoaded, userId, syncPremium]);

  return null;
}
