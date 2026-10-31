import { Stack } from "expo-router";

import { useSaveOnboardingAnswers } from "@/lib/onboarding/use-save-onboarding-answers";
import { useSyncProfile } from "@/lib/use-sync-profile";

export default function AppLayout() {
  // Signed in from here on: keep the learner's Supabase profile in step with Clerk, and
  // save the answers they gave during onboarding (once, after sign-up).
  useSyncProfile();
  useSaveOnboardingAnswers();
  return <Stack screenOptions={{ headerShown: false }} />;
}
