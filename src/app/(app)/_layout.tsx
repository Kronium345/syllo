import { Stack } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/text";
import { StudyReminders } from "@/lib/notifications/use-study-reminders";
import { useMyProfile } from "@/lib/queries/profiles";
import { useSyncProfile } from "@/lib/use-sync-profile";
import { color, tw } from "@/theme";

/**
 * Signed in from here on. A learner is onboarded when their `profiles` row exists
 * (prompts/11): only finishing onboarding creates it. Until then only the onboarding
 * screens are reachable; afterwards only the app's. Flipping the guard needs no router
 * call: creating the row refetches the profile and Expo Router moves the learner on.
 */
export default function AppLayout() {
  // Keeps an existing row's name and photo in step with Clerk (never creates it).
  useSyncProfile();
  const profile = useMyProfile();

  if (profile.isPending) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
        style={tw`flex-1 bg-canvas items-center justify-center`}
      >
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (profile.isError) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => profile.refetch()}
        style={tw`flex-1 bg-canvas items-center justify-center gap-2 px-screen`}
      >
        <AppText variant="callout">Couldn&apos;t load your profile.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>
          {profile.isFetching ? "Trying again…" : "Try again"}
        </AppText>
      </Pressable>
    );
  }

  const onboarded = profile.data !== null;

  return (
    <>
      {/* Study reminders (prompts/12) only once there's learning to remind about. */}
      {onboarded ? <StudyReminders /> : null}
      <Stack
        screenOptions={{ headerShown: false, contentStyle: tw`bg-canvas` }}
      >
        <Stack.Protected guard={!onboarded} redirectTo="/home">
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded} redirectTo="/onboarding/goal">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" />
          <Stack.Screen name="search" />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="quiz/[id]" />
          <Stack.Screen name="attempt/[id]/index" />
          <Stack.Screen name="attempt/[id]/results" />
          <Stack.Screen name="attempt/[id]/review" />
          <Stack.Screen name="premium" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
