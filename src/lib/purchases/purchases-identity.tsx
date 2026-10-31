import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import Purchases from "react-native-purchases";

import { purchasesSupported } from "./configure";

/**
 * Ties RevenueCat to the Clerk user: logIn on sign-in (a purchase made anonymously before
 * sign-up carries over to the account), logOut on sign-out. Mounted in the root layout.
 */
export function PurchasesIdentity() {
  const { isLoaded, userId } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !purchasesSupported) return;
    const previous = lastUserId.current;
    lastUserId.current = userId ?? null;
    if (userId && userId !== previous) {
      Purchases.logIn(userId).catch((error) => console.warn("RevenueCat logIn failed:", error));
    } else if (!userId && previous) {
      Purchases.isAnonymous()
        .then((anonymous) => (anonymous ? undefined : Purchases.logOut()))
        .catch((error) => console.warn("RevenueCat logOut failed:", error));
    }
  }, [isLoaded, userId]);

  return null;
}
