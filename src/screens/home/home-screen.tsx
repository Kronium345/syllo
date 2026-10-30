import { useUser } from "@clerk/expo";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { colors } from "@/components/ui/placeholder-colors";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { showBanner } from "@/lib/notifications/banner";
import { useCourseCount } from "@/lib/queries/courses";

// Placeholder home until the design system and the home design exist: greets the
// learner, proves the Supabase connection (published courses, read through RLS with the
// Clerk session) and keeps the Dynamic Island banner check. Sign out lives in Profile → Settings.
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const name = displayFirstName(user);
  const courses = useCourseCount();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.greeting}>
        <Avatar imageUrl={profileImageUrl(user)} name={name} size="sm" />
        <Text style={styles.title}>Hi, {name}</Text>
      </View>

      <View style={styles.center}>
        {courses.isPending ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading courses" style={styles.status}>
            <ActivityIndicator color={colors.muted} />
            <Text style={styles.muted}>Loading courses…</Text>
          </View>
        ) : courses.isError ? (
          <Pressable accessibilityRole="button" onPress={() => courses.refetch()} style={styles.status}>
            <Text style={styles.muted}>Couldn&apos;t load courses.</Text>
            <Text style={styles.link}>{courses.isFetching ? "Trying again…" : "Try again"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.count}>
            {courses.data === 0
              ? "No courses yet"
              : `${courses.data} ${courses.data === 1 ? "course" : "courses"} available`}
          </Text>
        )}

        {/* Temporary: checks the Dynamic Island banner until real screens exist. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => showBanner({ title: "Lesson unlocked", message: "Chapter 2 is ready for you." })}
          style={styles.button}
        >
          <Text>Show test banner</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  greeting: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  status: { alignItems: "center", gap: 8 },
  muted: { color: colors.muted },
  link: { fontWeight: "600", color: colors.accent },
  count: { fontSize: 18, fontWeight: "600", color: colors.ink },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
});
