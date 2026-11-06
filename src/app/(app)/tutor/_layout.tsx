import { Stack } from "expo-router";

import { tw } from "@/theme";

/**
 * Tutor area (Part 2 of the tutorial: course creators manage their courses).
 * Structure only for now. Access: `(app)/_layout.tsx` wraps this folder in `Stack.Protected` on
 * `useIsTutor()` (Clerk `publicMetadata.role === "tutor"`), so other users are sent home.
 */
export default function TutorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-canvas` }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="course/new" />
      <Stack.Screen name="course/[id]/index" />
      <Stack.Screen name="course/[id]/lesson/[lessonId]" />
    </Stack>
  );
}
