import { Stack } from "expo-router";

import { tw } from "@/theme";

// Signed-out screens. Welcome's "Get Started" opens sign-up and "Log In" opens sign-in;
// onboarding runs after sign-in, in (app)/onboarding (prompts/11).
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: tw`bg-canvas` }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
