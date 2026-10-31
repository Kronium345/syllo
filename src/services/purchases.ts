import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

// Subscriptions through RevenueCat: plain async functions, no React. Hooks in
// src/lib/queries/purchases/ wrap them. The SDK is configured once in the root layout
// (src/lib/purchases/configure.ts); these take no Supabase client.

/** The entitlement every Premium product unlocks. */
export const PREMIUM_ENTITLEMENT = "premium";

/** The current offering (the dashboard's `default`), or null when none is set. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/** Buys a package. Resolves `false` when the learner cancels, which isn't an error. */
export async function purchasePackage(aPackage: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(aPackage);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    throw error;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

/** Whether the customer has an active `premium` entitlement. */
export function hasPremium(info: CustomerInfo): boolean {
  return PREMIUM_ENTITLEMENT in info.entitlements.active;
}
