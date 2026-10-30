import { Stack } from "expo-router";

import { useSyncProfile } from "@/lib/use-sync-profile";

export default function AppLayout() {
  // Signed in from here on: keep the learner's Supabase profile in step with Clerk.
  useSyncProfile();
  return <Stack screenOptions={{ headerShown: false }} />;
}
