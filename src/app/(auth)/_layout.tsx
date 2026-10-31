import { Stack } from "expo-router";

import { tw } from "@/theme";

// Signed-out screens. Onboarding runs Welcome → goal → interests → insight → testimonials
// → paywall → sign-up; "Log In" on Welcome goes straight to sign-in.
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: tw`bg-canvas` }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding/goal" />
      <Stack.Screen name="onboarding/interests" />
      <Stack.Screen name="onboarding/insight" />
      <Stack.Screen name="onboarding/testimonials" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
