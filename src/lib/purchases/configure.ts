import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

// RevenueCat public SDK keys (safe in the bundle; never the secret key). In development
// both hold the Test Store key of the RevenueCat project "Syllo".
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});

/** True where in-app purchases can run (iOS and Android; Expo Go uses RevenueCat's Preview API Mode). */
export const purchasesSupported = Platform.OS !== "web" && !!apiKey;

let configured = false;

/** Configures the SDK once per launch, with an anonymous user until Clerk signs someone in. */
export function configurePurchases() {
  if (configured || !purchasesSupported || !apiKey) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  configured = true;
}
