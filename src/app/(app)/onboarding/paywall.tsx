import { PaywallScreen } from "@/screens/onboarding/paywall-screen";

/** The last onboarding step: closing or buying finishes onboarding (creates the profile row). */
export default function OnboardingPaywallRoute() {
  return <PaywallScreen mode="onboarding" />;
}
