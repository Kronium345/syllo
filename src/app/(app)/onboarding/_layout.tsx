import { Stack } from "expo-router";

import { tw } from "@/theme";

// Onboarding after sign-in (prompts/11): goal → interests → insight → testimonials → paywall.
// Finishing creates the profile row, which flips the (app) layout's gate to the app.
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: tw`bg-canvas` }} />;
}
