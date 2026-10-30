import { useUser } from "@clerk/expo";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { colors } from "@/components/ui/placeholder-colors";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { showBanner } from "@/lib/notifications/banner";

// Placeholder home until the design system and the home design exist: greets the
// learner and keeps the Dynamic Island banner check. Sign out lives in Profile → Settings.
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const name = displayFirstName(user);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.greeting}>
        <Avatar imageUrl={profileImageUrl(user)} name={name} size="sm" />
        <Text style={styles.title}>Hi, {name}</Text>
      </View>

      <View style={styles.center}>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
});
