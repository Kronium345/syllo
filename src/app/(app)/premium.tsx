import { PaywallScreen } from "@/screens/onboarding/paywall-screen";

/** The paywall for signed-in learners (e.g. at the free quiz limit). */
export default function PremiumRoute() {
  return <PaywallScreen mode="upgrade" />;
}
